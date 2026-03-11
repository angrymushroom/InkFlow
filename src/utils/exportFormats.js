/**
 * Export format builders for InkFlow.
 *
 * All "story" formats (Markdown, TXT, PDF, EPUB, DOCX) export the written
 * prose only — chapters and scene content.  The JSON backup is handled
 * separately by src/db/index.js exportProject().
 */

import { getStory, getChapters, getScenes } from '@/db';

// ─── Shared data loading ───────────────────────────────────────────────────

async function loadStoryData(storyId) {
  const [story, chapters, rawScenes] = await Promise.all([
    getStory(storyId),
    getChapters(storyId),
    getScenes(storyId),
  ]);
  // Attach sorted scenes to each chapter
  const chaptersWithScenes = chapters.map((ch) => ({
    ...ch,
    scenes: rawScenes
      .filter((s) => s.chapterId === ch.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  }));
  return { story, chapters: chaptersWithScenes };
}

export function safeFilename(story, ext) {
  const base = (story?.oneSentence || 'story')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    || 'story';
  const date = new Date().toISOString().slice(0, 10);
  return `${base}-${date}.${ext}`;
}

// ─── Plain text helpers ────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert plain prose (with \n line-breaks) to <p> elements for HTML/XHTML. */
function proseToHtmlParagraphs(text) {
  if (!text?.trim()) return '';
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${escapeXml(para.replace(/\n/g, ' ').trim())}</p>`)
    .join('\n');
}

/** Convert plain prose to DOCX w:p elements. */
function proseToDocxParagraphs(text, styleId = null) {
  if (!text?.trim()) return '';
  return text
    .split(/\n\n+/)
    .map((para) => {
      const pPr = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : '';
      const runs = para
        .replace(/\n/g, ' ')
        .trim()
        .split(/  +/)
        .map((seg) => `<w:r><w:t xml:space="preserve">${escapeXml(seg)}</w:t></w:r>`)
        .join('');
      return `<w:p>${pPr}${runs}</w:p>`;
    })
    .join('\n');
}

// ─── Markdown ─────────────────────────────────────────────────────────────

export async function buildMarkdown(storyId) {
  const { story, chapters } = await loadStoryData(storyId);
  const lines = [];
  const title = story?.oneSentence?.trim() || 'Untitled Story';
  lines.push(`# ${title}`, '');
  for (const ch of chapters) {
    lines.push(`## ${ch.title || 'Untitled Chapter'}`, '');
    for (const sc of ch.scenes) {
      lines.push(`### ${sc.title || 'Untitled Scene'}`, '');
      if (sc.content?.trim()) {
        lines.push(sc.content.trim(), '');
      }
    }
  }
  return lines.join('\n');
}

// ─── Plain text ────────────────────────────────────────────────────────────

export async function buildPlainText(storyId) {
  const { story, chapters } = await loadStoryData(storyId);
  const lines = [];
  const title = story?.oneSentence?.trim() || 'Untitled Story';
  lines.push(title.toUpperCase(), '='.repeat(Math.min(title.length, 60)), '');
  for (const ch of chapters) {
    lines.push(ch.title || 'Untitled Chapter', '-'.repeat(40), '');
    for (const sc of ch.scenes) {
      if (sc.title) lines.push(sc.title, '');
      if (sc.content?.trim()) lines.push(sc.content.trim(), '');
    }
  }
  return lines.join('\n');
}

// ─── PDF (browser print-to-PDF) ────────────────────────────────────────────

export async function openPrintWindow(storyId) {
  const { story, chapters } = await loadStoryData(storyId);
  const title = escapeXml(story?.oneSentence?.trim() || 'Untitled Story');

  let body = `<h1>${title}</h1>\n`;
  for (const ch of chapters) {
    body += `<h2>${escapeXml(ch.title || 'Untitled Chapter')}</h2>\n`;
    for (const sc of ch.scenes) {
      if (sc.title) body += `<h3>${escapeXml(sc.title)}</h3>\n`;
      if (sc.content?.trim()) body += proseToHtmlParagraphs(sc.content) + '\n';
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;font-size:12pt;line-height:1.8;color:#111;max-width:680px;margin:48px auto;padding:0 24px}
  h1{font-size:22pt;margin:0 0 32px;line-height:1.2}
  h2{font-size:15pt;margin:48px 0 8px;border-bottom:1px solid #ccc;padding-bottom:6px}
  h3{font-size:12pt;font-style:italic;font-weight:normal;margin:28px 0 6px;color:#444}
  p{margin:0 0 .9em}
  @media print{
    body{max-width:none;margin:0;padding:0 1cm}
    h2{page-break-before:always}
    h2:first-of-type{page-break-before:avoid}
    h3,p{orphans:3;widows:3}
  }
</style>
</head>
<body>${body}</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return; // popup blocked
  win.document.write(html);
  win.document.close();
  win.focus();
  // Slight delay so fonts/layout settle before the print dialog
  setTimeout(() => win.print(), 400);
}

// ─── EPUB 3 ────────────────────────────────────────────────────────────────

export async function buildEpubBlob(storyId) {
  const JSZip = (await import('jszip')).default;
  const { story, chapters } = await loadStoryData(storyId);
  const title = story?.oneSentence?.trim() || 'Untitled Story';
  const uid = `inkflow-${storyId}-${Date.now()}`;
  const zip = new JSZip();

  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const css = `body{font-family:Georgia,"Times New Roman",serif;font-size:1em;line-height:1.7;margin:2em}
h1{font-size:1.8em;margin-bottom:1.5em}
h2{font-size:1.3em;margin-top:3em;border-bottom:1px solid #ccc;padding-bottom:.3em}
h3{font-size:1em;font-style:italic;font-weight:normal;margin-top:1.8em;color:#555}
p{margin:.6em 0}`;
  zip.file('OEBPS/style.css', css);

  // Build chapter XHTML files
  const manifestItems = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="css" href="style.css" media-type="text/css"/>',
  ];
  const spineItems = [];
  const navEntries = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const chId = `ch${i + 1}`;
    const chFile = `${chId}.xhtml`;
    const chTitle = escapeXml(ch.title || `Chapter ${i + 1}`);

    let chBody = `<h2>${chTitle}</h2>\n`;
    for (const sc of ch.scenes) {
      if (sc.title) chBody += `<h3>${escapeXml(sc.title)}</h3>\n`;
      if (sc.content?.trim()) chBody += proseToHtmlParagraphs(sc.content) + '\n';
    }

    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head><meta charset="utf-8"/><title>${chTitle}</title><link rel="stylesheet" href="style.css"/></head>
<body>${chBody}</body>
</html>`;
    zip.file(`OEBPS/${chFile}`, xhtml);
    manifestItems.push(`<item id="${chId}" href="${chFile}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${chId}"/>`);
    navEntries.push(`<li><a href="${chFile}">${chTitle}</a></li>`);
  }

  // nav.xhtml
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head><meta charset="utf-8"/><title>Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeXml(title)}</h1>
    <ol>
      ${navEntries.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`);

  // content.opf
  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">${uid}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`);

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

// ─── DOCX (Office Open XML) ────────────────────────────────────────────────

export async function buildDocxBlob(storyId) {
  const JSZip = (await import('jszip')).default;
  const { story, chapters } = await loadStoryData(storyId);
  const title = story?.oneSentence?.trim() || 'Untitled Story';
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);

  // Minimal styles: Title, Heading1 (chapter), Heading2 (scene), Normal
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="480" w:after="480"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>
    <w:pPr><w:pageBreakBefore/><w:spacing w:before="480" w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="360" w:after="120"/></w:pPr>
    <w:rPr><w:i/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>
  </w:style>
</w:styles>`);

  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const para = (text, styleId) => {
    const pPr = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : '';
    const t = escapeXml(text);
    return `<w:p>${pPr}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  };

  let bodyXml = para(title, 'Title') + '\n';
  for (const ch of chapters) {
    bodyXml += para(ch.title || 'Untitled Chapter', 'Heading1') + '\n';
    for (const sc of ch.scenes) {
      if (sc.title) bodyXml += para(sc.title, 'Heading2') + '\n';
      if (sc.content?.trim()) bodyXml += proseToDocxParagraphs(sc.content) + '\n';
    }
  }

  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}">
  <w:body>
${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
