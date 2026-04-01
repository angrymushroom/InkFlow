/**
 * Inject all eval result JSON files into report.html as inline data.
 *
 * Reads every *.json in tests/eval/results/, sorts by runAt, and replaces
 * the <script id="eval-data"> block in report.html so the report works
 * directly from the filesystem without any server or manual file loading.
 *
 * Run by the eval CI workflow after run-all.js completes.
 * Safe to run locally too: node tests/eval/build-report.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const resultsDir = resolve(__dirname, 'results')
const reportPath = resolve(__dirname, 'report.html')

// Read all result JSON files
const files = readdirSync(resultsDir).filter(f => f.endsWith('.json') && f !== 'manifest.json')

if (files.length === 0) {
  console.log('[build-report] No result files found — report.html left unchanged.')
  process.exit(0)
}

const history = files
  .map(f => {
    try {
      return JSON.parse(readFileSync(resolve(resultsDir, f), 'utf-8'))
    } catch {
      console.warn(`[build-report] Skipping unreadable file: ${f}`)
      return null
    }
  })
  .filter(Boolean)
  .sort((a, b) => new Date(a.runAt) - new Date(b.runAt))

// Inject into report.html — replace the <script id="eval-data"> block
let html = readFileSync(reportPath, 'utf-8')

const injected = `window.EVAL_HISTORY=${JSON.stringify(history, null, 0)};`
html = html.replace(
  /<script id="eval-data">[\s\S]*?<\/script>/,
  `<script id="eval-data">${injected}</script>`
)

writeFileSync(reportPath, html, 'utf-8')
console.log(`[build-report] Injected ${history.length} run(s) into report.html`)
history.forEach(r => console.log(`  · v${r.version}  ${r.runAt.slice(0, 19)}`))
