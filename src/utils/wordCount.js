// CJK character ranges: each character counts as one word
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g

/**
 * Count words in text, handling CJK languages where characters have no spaces.
 * CJK characters are counted individually; remaining text is split on whitespace.
 */
export function countWords(text) {
  if (!text || !text.trim()) return 0
  const cjkCount = (text.match(CJK_RE) || []).length
  const withoutCjk = text.replace(CJK_RE, ' ')
  const latinCount = withoutCjk
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length
  return cjkCount + latinCount
}
