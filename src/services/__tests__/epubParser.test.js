import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { parseEpub, stripHtml } from '../epubParser.js'

async function buildEpub(items = []) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:schemas-container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )
  const manifestItems = items
    .map((item) => `<item id="${item.id}" href="${item.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('\n    ')
  const spineItems = items.map((item) => `<itemref idref="${item.id}"/>`).join('\n    ')
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata/>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine>
    ${spineItems}
  </spine>
</package>`
  )
  for (const item of items) {
    zip.file(
      `OEBPS/${item.id}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<html><body>${item.content}</body></html>`
    )
  }
  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('stripHtml', () => {
  it('strips basic tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello  world')
  })
  it('removes script and style blocks entirely', () => {
    const result = stripHtml('<style>body{}</style><p>Text</p><script>alert(1)</script>')
    expect(result).not.toContain('body{}')
    expect(result).not.toContain('alert')
    expect(result).toContain('Text')
  })
  it('decodes common HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39;')).toBe("& < > \" '")
    expect(stripHtml('hello&nbsp;world')).toContain('hello')
    expect(stripHtml('hello&nbsp;world')).toContain('world')
  })
  it('collapses triple+ whitespace to double newline', () => {
    expect(stripHtml('a\n\n\n\nb')).toMatch(/a\n\nb/)
  })
  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })
})

describe('parseEpub', () => {
  it('extracts text from a single-chapter EPUB', async () => {
    const buf = await buildEpub([{ id: 'ch1', content: '<p>Hello from chapter one. This paragraph has enough text to pass the minimum length check.</p>' }])
    expect(await parseEpub(buf)).toContain('Hello from chapter one')
  })
  it('joins multiple spine items', async () => {
    const buf = await buildEpub([
      { id: 'ch1', content: '<p>Chapter one text with enough words to exceed thirty characters easily.</p>' },
      { id: 'ch2', content: '<p>Chapter two text with enough words to exceed thirty characters easily.</p>' },
      { id: 'ch3', content: '<p>Chapter three text with enough words to exceed thirty characters easily.</p>' },
    ])
    const result = await parseEpub(buf)
    expect(result).toContain('Chapter one')
    expect(result).toContain('Chapter two')
    expect(result).toContain('Chapter three')
    expect(result.indexOf('Chapter one')).toBeLessThan(result.indexOf('Chapter two'))
  })
  it('accepts a File-like object with arrayBuffer()', async () => {
    const buf = await buildEpub([{ id: 'ch1', content: '<p>From file object — this content is definitely longer than thirty characters.</p>' }])
    const result = await parseEpub({ arrayBuffer: () => Promise.resolve(buf) })
    expect(result).toContain('From file object')
  })
  it('strips HTML tags from content', async () => {
    const buf = await buildEpub([{ id: 'ch1', content: '<h1>Title of the chapter here</h1><p>Para <em>text with more words</em></p>' }])
    const result = await parseEpub(buf)
    expect(result).not.toContain('<h1>')
    expect(result).toContain('Title')
  })
  it('throws epub_invalid when container.xml is missing', async () => {
    const zip = new JSZip()
    zip.file('mimetype', 'application/epub+zip')
    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseEpub(buf)).rejects.toThrow('epub_invalid')
  })
  it('throws epub_invalid when container.xml has no .opf path', async () => {
    const zip = new JSZip()
    zip.file('META-INF/container.xml', '<container></container>')
    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseEpub(buf)).rejects.toThrow('epub_invalid')
  })
  it('throws epub_invalid when .opf file is missing', async () => {
    const zip = new JSZip()
    zip.file('META-INF/container.xml', `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`)
    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseEpub(buf)).rejects.toThrow('epub_invalid')
  })
  it('throws epub_empty when all spine items are too short', async () => {
    const zip = new JSZip()
    zip.file('META-INF/container.xml', `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`)
    zip.file('OEBPS/content.opf', `<package><manifest><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="ch1"/></spine></package>`)
    zip.file('OEBPS/ch1.xhtml', '<html><body><p>Hi</p></body></html>')
    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseEpub(buf)).rejects.toThrow('epub_empty')
  })
  it('throws when given invalid binary (not a zip)', async () => {
    const buf = new TextEncoder().encode('not a zip file').buffer
    await expect(parseEpub(buf)).rejects.toThrow()
  })
})
