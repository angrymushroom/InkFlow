/**
 * EPUB parser for InkFlow novel import.
 * Extracts plain text from an EPUB file (File or ArrayBuffer).
 * Handles DRM-free EPUBs only; DRM-protected files will throw.
 */
import JSZip from 'jszip'

export async function parseEpub(source) {
  const arrayBuffer = source instanceof ArrayBuffer ? source : await source.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  const containerXml = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerXml) throw new Error('epub_invalid')

  const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/)
  if (!opfMatch) throw new Error('epub_invalid')
  const opfPath = opfMatch[1]
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

  const opfXml = await zip.file(opfPath)?.async('text')
  if (!opfXml) throw new Error('epub_invalid')

  const manifestMap = new Map()
  for (const m of opfXml.matchAll(/<item\s[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*/g)) {
    manifestMap.set(m[1], m[2])
  }

  const spineIdrefs = [...opfXml.matchAll(/<itemref\s[^>]*idref="([^"]+)"/g)].map((m) => m[1])

  const textParts = []
  for (const idref of spineIdrefs) {
    const href = manifestMap.get(idref)
    if (!href) continue
    const fullPath = opfDir + href
    const xhtml = await zip.file(fullPath)?.async('text')
    if (!xhtml) continue
    const text = stripHtml(xhtml)
    if (text.length > 30) textParts.push(text)
  }

  if (textParts.length === 0) throw new Error('epub_empty')

  return textParts.join('\n\n')
}

export function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}
