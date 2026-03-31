/**
 * Evaluation metrics for InkFlow AI quality assessment.
 *
 * All functions are pure — they take predicted and ground-truth values
 * and return a score between 0 and 1 (or an object with multiple scores).
 *
 * Used by per-feature eval scripts (*.eval.js) and run-all.js.
 * Gated by VITE_RUN_EVALS=true — never runs in regular CI.
 */

// ── Named Entity F1 ───────────────────────────────────────────────────────────

/**
 * Compute precision, recall, and F1 for a set prediction vs. a set of ground truth.
 * Comparison is case-insensitive and trims whitespace.
 *
 * @param {string[]} predicted
 * @param {string[]} groundTruth
 * @returns {{ precision: number, recall: number, f1: number }}
 */
export function computeEntityF1(predicted, groundTruth) {
  const norm = (s) => (s || '').toLowerCase().trim()
  const predSet = new Set(predicted.map(norm))
  const gtSet = new Set(groundTruth.map(norm))

  const tp = [...predSet].filter((p) => gtSet.has(p)).length
  const precision = predSet.size > 0 ? tp / predSet.size : 0
  const recall = gtSet.size > 0 ? tp / gtSet.size : 0
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0

  return { precision, recall, f1 }
}

// ── ROUGE-L ───────────────────────────────────────────────────────────────────

/**
 * Compute ROUGE-L (Longest Common Subsequence) between hypothesis and reference.
 * Both strings are tokenised by whitespace (no stemming).
 *
 * @param {string} hypothesis
 * @param {string} reference
 * @returns {number} ROUGE-L F1 score (0–1)
 */
export function computeRougeL(hypothesis, reference) {
  const hypTokens = (hypothesis || '').toLowerCase().split(/\s+/).filter(Boolean)
  const refTokens = (reference || '').toLowerCase().split(/\s+/).filter(Boolean)

  if (hypTokens.length === 0 || refTokens.length === 0) return 0

  const lcs = lcsLength(hypTokens, refTokens)
  const precision = lcs / hypTokens.length
  const recall = lcs / refTokens.length
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
}

function lcsLength(a, b) {
  const m = a.length
  const n = b.length
  // Use two-row DP to save memory for long sequences
  let prev = new Array(n + 1).fill(0)
  let curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1])
    }
    ;[prev, curr] = [curr, prev]
    curr.fill(0)
  }
  return prev[n]
}

// ── Fuzzy String Match ────────────────────────────────────────────────────────

/**
 * Normalised edit-distance similarity between two strings (0 = totally different, 1 = identical).
 * Uses Levenshtein distance.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function fuzzyMatch(a, b) {
  const s = (a || '').toLowerCase().trim()
  const t = (b || '').toLowerCase().trim()
  if (s === t) return 1
  if (s.length === 0 || t.length === 0) return 0
  const dist = levenshtein(s, t)
  return 1 - dist / Math.max(s.length, t.length)
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => new Array(n + 1).fill(0).map((_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ── Chapter Detection F1 ──────────────────────────────────────────────────────

/**
 * Evaluate chapter detection by comparing predicted chapter titles
 * against ground-truth chapter titles using entity F1 (case-insensitive exact match).
 *
 * @param {string[]} predictedTitles
 * @param {string[]} groundTruthTitles
 * @returns {{ precision: number, recall: number, f1: number }}
 */
export function evaluateChapterDetection(predictedTitles, groundTruthTitles) {
  return computeEntityF1(predictedTitles, groundTruthTitles)
}

// ── Template Detection Accuracy ───────────────────────────────────────────────

/**
 * Exact-match accuracy for template detection over a list of (predicted, expected) pairs.
 *
 * @param {Array<{ predicted: string, expected: string }>} pairs
 * @returns {number} accuracy (0–1)
 */
export function evaluateTemplateAccuracy(pairs) {
  if (pairs.length === 0) return 0
  const correct = pairs.filter((p) => p.predicted === p.expected).length
  return correct / pairs.length
}

// ── Minimum threshold check ───────────────────────────────────────────────────

export const EVAL_THRESHOLDS = {
  chapterDetectionF1: 0.9,
  characterExtractionRecall: 0.75,
  templateDetectionAccuracy: 0.65,
}

/**
 * Check whether all results meet the minimum thresholds.
 * Returns an array of failing checks (empty = all pass).
 *
 * @param {{ chapterF1?: number, charRecall?: number, templateAcc?: number }} results
 * @returns {string[]} failing check descriptions
 */
export function checkThresholds(results) {
  const failures = []
  if (results.chapterF1 != null && results.chapterF1 < EVAL_THRESHOLDS.chapterDetectionF1) {
    failures.push(`Chapter detection F1 ${results.chapterF1.toFixed(3)} < ${EVAL_THRESHOLDS.chapterDetectionF1}`)
  }
  if (results.charRecall != null && results.charRecall < EVAL_THRESHOLDS.characterExtractionRecall) {
    failures.push(`Character extraction recall ${results.charRecall.toFixed(3)} < ${EVAL_THRESHOLDS.characterExtractionRecall}`)
  }
  if (results.templateAcc != null && results.templateAcc < EVAL_THRESHOLDS.templateDetectionAccuracy) {
    failures.push(`Template detection accuracy ${results.templateAcc.toFixed(3)} < ${EVAL_THRESHOLDS.templateDetectionAccuracy}`)
  }
  return failures
}
