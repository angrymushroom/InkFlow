/**
 * Eval: Chapter Detection
 *
 * Measures how accurately detectChapters() identifies chapter boundaries.
 * Run with: VITE_RUN_EVALS=true node tests/eval/run-all.js
 *
 * Never runs in regular CI (gated by VITE_RUN_EVALS).
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { detectChapters } from '../../src/services/novelIngestion.js'
import { evaluateChapterDetection } from './metrics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CORPUS_DIR = resolve(__dirname, '../fixtures/eval-corpus')

const NOVELS = ['pride-and-prejudice', 'time-machine']

export async function runChapterDetectionEval() {
  const allResults = []

  for (const novel of NOVELS) {
    const sourcePath = resolve(CORPUS_DIR, novel, 'source.txt')
    const gtPath = resolve(CORPUS_DIR, novel, 'ground-truth.json')

    let source, gt
    try {
      gt = JSON.parse(readFileSync(gtPath, 'utf-8'))
      const resolvedSource = gt._sourceFile
        ? resolve(dirname(gtPath), gt._sourceFile)
        : sourcePath
      source = readFileSync(resolvedSource, 'utf-8')
    } catch {
      console.warn(`[chapter-detection] Skipping ${novel} — fixture files not found`)
      continue
    }

    const chapters = await detectChapters(source)
    const predictedTitles = chapters.map((c) => c.title)
    const groundTruthTitles = gt.chapters.map((c) => c.title)

    const { precision, recall, f1 } = evaluateChapterDetection(predictedTitles, groundTruthTitles)

    console.log(`[chapter-detection] ${novel}: P=${precision.toFixed(3)} R=${recall.toFixed(3)} F1=${f1.toFixed(3)}`)
    allResults.push({ novel, precision, recall, f1 })
  }

  if (allResults.length === 0) return { f1: null, results: [] }

  const macroF1 = allResults.reduce((s, r) => s + r.f1, 0) / allResults.length
  console.log(`[chapter-detection] Macro-avg F1: ${macroF1.toFixed(3)}`)
  return { f1: macroF1, results: allResults }
}
