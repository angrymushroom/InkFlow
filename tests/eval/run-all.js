/**
 * Run all eval scripts and output a timestamped JSON results file.
 *
 * Usage (--import flag resolves Vite's @/ alias in Node):
 *   VITE_RUN_EVALS=true INKFLOW_API_KEY=<key> node --import ./tests/eval/node-register.js tests/eval/run-all.js
 *   VITE_RUN_EVALS=true INKFLOW_API_KEY=<key> INKFLOW_PROVIDER=openai node --import ./tests/eval/node-register.js tests/eval/run-all.js
 *   ... node --import ./tests/eval/node-register.js tests/eval/run-all.js --output tests/eval/results/v0.11.0.json
 *
 * This script is NOT run by regular CI (no VITE_RUN_EVALS=true there).
 * It is intended for manual runs and the weekly scheduled eval CI job.
 */

if (process.env.VITE_RUN_EVALS !== 'true') {
  console.error('Set VITE_RUN_EVALS=true to run evaluations.')
  process.exit(1)
}

// Shim localStorage for Node — ai.js reads provider + API key from it.
// Pass your key via env:  INKFLOW_PROVIDER=gemini INKFLOW_API_KEY=sk-... node run-all.js
const _store = {}
if (process.env.INKFLOW_API_KEY) {
  const provider = process.env.INKFLOW_PROVIDER || 'gemini'
  const keyMap = { gemini: 'inkflow_ai_gemini_key', openai: 'inkflow_ai_openai_key' }
  _store['inkflow_ai_provider'] = provider
  _store[keyMap[provider] || `inkflow_ai_${provider}_key`] = process.env.INKFLOW_API_KEY
} else {
  console.error('Set INKFLOW_API_KEY (and optionally INKFLOW_PROVIDER=gemini|openai) to run evals.')
  process.exit(1)
}
global.localStorage = {
  getItem: k => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = v },
  removeItem: k => { delete _store[k] },
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

// Pre-flight: verify AI is reachable before running evals.
// If this fails, character/template evals will be all-zero — surface the error early.
console.log('Pre-flight AI check...')
try {
  const { completeWithAi, TIERS } = await import('../../src/services/ai.js')
  const reply = await completeWithAi({
    systemPrompt: 'You are a test assistant.',
    userPrompt: 'List two character names in JSON: [{"name":"Alice"},{"name":"Bob"}]. Return ONLY the JSON array.',
    tier: TIERS.LIGHT,
    maxTokens: 100,
  })
  console.log(`AI check passed — raw response: ${reply.slice(0, 120)}`)
} catch (err) {
  console.error(`AI check FAILED: ${err.message}`)
  console.error('Character extraction and template detection will score 0.')
  console.error('Fix: verify INKFLOW_API_KEY and INKFLOW_PROVIDER are correct.')
}
console.log()

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
