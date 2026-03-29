const K1 = 1.5
const B = 0.75

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .split(/[^\w\u4e00-\u9fff]+/)
    .filter((t) => t.length > 1)
}

function buildBM25Index(docs) {
  const df = new Map()
  const tf = new Map()
  const docLens = new Map()
  let totalLen = 0

  for (const doc of docs) {
    const tokens = tokenize(doc.text)
    docLens.set(doc.id, tokens.length)
    totalLen += tokens.length
    const termFreq = new Map()
    for (const t of tokens) termFreq.set(t, (termFreq.get(t) || 0) + 1)
    tf.set(doc.id, termFreq)
    for (const t of termFreq.keys()) df.set(t, (df.get(t) || 0) + 1)
  }

  const N = docs.length
  const avgLen = N > 0 ? totalLen / N : 1
  const idf = new Map()
  for (const [term, freq] of df.entries()) {
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1))
  }

  return { idf, tf, docLens, avgLen }
}

function bm25Score(queryTerms, docId, index) {
  const { idf, tf, docLens, avgLen } = index
  const docTf = tf.get(docId) || new Map()
  const docLen = docLens.get(docId) || 1
  let score = 0
  for (const term of queryTerms) {
    const termIdf = idf.get(term)
    if (!termIdf) continue
    const termTf = docTf.get(term) || 0
    score += (termIdf * (termTf * (K1 + 1))) / (termTf + K1 * (1 - B + B * (docLen / avgLen)))
  }
  return score
}

/**
 * Select the most relevant scenes for the current scene context using BM25.
 * Falls back to last-N if the query is empty (no metadata on current scene).
 *
 * @param {object[]} candidateScenes - scenes with id, title, aiSummary, oneSentenceSummary, notes
 * @param {object} currentScene - the scene being generated (title, oneSentenceSummary, notes)
 * @param {number} topK
 * @returns {object[]} subset of candidateScenes in original narrative order
 */
export function selectRelevantScenes(candidateScenes, currentScene, topK = 5) {
  if (!candidateScenes.length) return []

  const query = [currentScene.title, currentScene.oneSentenceSummary, currentScene.notes]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (!query) return candidateScenes.slice(-topK)

  const docs = candidateScenes.map((s) => ({
    id: s.id,
    text: [s.aiSummary, s.oneSentenceSummary, s.title].filter(Boolean).join(' '),
  }))

  const index = buildBM25Index(docs)
  const queryTerms = tokenize(query)

  const scored = docs
    .map((doc) => ({ id: doc.id, score: bm25Score(queryTerms, doc.id, index) }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  if (!scored.length) return candidateScenes.slice(-topK)

  const topIds = new Set(scored.map((d) => d.id))
  // Return in narrative order so the context reads chronologically
  return candidateScenes.filter((s) => topIds.has(s.id))
}
