/**
 * Run all eval scripts and output a timestamped JSON results file.
 *
 * Usage:
 *   VITE_RUN_EVALS=true node tests/eval/run-all.js
 *   VITE_RUN_EVALS=true node tests/eval/run-all.js --output tests/eval/results/2026-03-31-baseline.json
 *
 * This script is NOT run by regular CI (no VITE_RUN_EVALS=true there).
 * It is intended for manual runs and the weekly scheduled eval CI job.
 */

if (process.env.VITE_RUN_EVALS !== 'true') {
  console.error('Set VITE_RUN_EVALS=true to run evaluations.')
  process.exit(1)
}

import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { runChapterDetectionEval } from './chapter-detection.eval.js'
import { runCharacterExtractionEval } from './character-extraction.eval.js'
import { runTemplateDetectionEval } from './template-detection.eval.js'
import { checkThresholds } from './metrics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read app version from package.json
const pkgPath = resolve(__dirname, '../../package.json')
const appVersion = JSON.parse(readFileSync(pkgPath, 'utf-8')).version

const outputArg = process.argv.indexOf('--output')
const outputPath =
  outputArg !== -1
    ? resolve(process.argv[outputArg + 1])
    : resolve(__dirname, `results/${new Date().toISOString().slice(0, 10)}-eval.json`)

console.log('\n=== InkFlow Eval Framework ===\n')

const chapterResult = await runChapterDetectionEval()
const charResult = await runCharacterExtractionEval()
const templateResult = await runTemplateDetectionEval()

const summary = {
  version: appVersion,
  runAt: new Date().toISOString(),
  chapterDetection: { f1: chapterResult.f1, details: chapterResult.results },
  characterExtraction: {
    recall: charResult.recall,
    precision: charResult.precision,
    f1: charResult.f1,
    details: charResult.results,
  },
  templateDetection: { accuracy: templateResult.accuracy, details: templateResult.results },
}

const failures = checkThresholds({
  chapterF1: chapterResult.f1,
  charRecall: charResult.recall,
  templateAcc: templateResult.accuracy,
})

console.log('\n=== Summary ===')
console.log(`Chapter detection F1:     ${chapterResult.f1?.toFixed(3) ?? 'N/A'}`)
console.log(`Character extraction R:   ${charResult.recall?.toFixed(3) ?? 'N/A'}`)
console.log(`Template detection acc:   ${templateResult.accuracy?.toFixed(3) ?? 'N/A'}`)

if (failures.length > 0) {
  console.log('\n⚠ THRESHOLD FAILURES:')
  for (const f of failures) console.log(`  - ${f}`)
} else {
  console.log('\n✓ All thresholds met.')
}

// Write results file
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8')
console.log(`\nResults written to: ${outputPath}`)

if (failures.length > 0) process.exit(1)
