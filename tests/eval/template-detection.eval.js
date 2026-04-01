/**
 * Eval: Template Detection
 *
 * Measures accuracy of detectTemplate() in identifying the correct writing
 * structure template from chapter summaries.
 *
 * Run with: VITE_RUN_EVALS=true node tests/eval/run-all.js
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { detectChapters, analyzeChapters, detectTemplate } from '../../src/services/novelIngestion.js'
import { evaluateTemplateAccuracy } from './metrics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CORPUS_DIR = resolve(__dirname, '../fixtures/eval-corpus')

const NOVELS = ['pride-and-prejudice', 'time-machine']

export async function runTemplateDetectionEval() {
  const pairs = []

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
      console.warn(`[template-detection] Skipping ${novel} — fixture files not found`)
      continue
    }

    const chapters = await detectChapters(source)
    const analyzed = await analyzeChapters(chapters)
    const summaries = analyzed.map((c) => c.chapterSummary)
    const { templateId } = await detectTemplate(summaries, gt.title || novel)

    console.log(`[template-detection] ${novel}: predicted=${templateId} expected=${gt.templateId}`)
    pairs.push({ novel, predicted: templateId, expected: gt.templateId })
  }

  if (pairs.length === 0) return { accuracy: null, results: [] }

  const accuracy = evaluateTemplateAccuracy(pairs)
  console.log(`[template-detection] Accuracy: ${accuracy.toFixed(3)} (${pairs.filter((p) => p.predicted === p.expected).length}/${pairs.length})`)
  return { accuracy, results: pairs }
}
