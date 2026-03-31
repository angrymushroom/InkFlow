/**
 * Compare two eval result JSON files and print a regression table.
 *
 * Usage:
 *   node tests/eval/compare.js <old.json> <new.json>
 *
 * Exits with code 1 if any metric regressed by more than 5% from the old baseline.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const [, , oldPath, newPath] = process.argv
if (!oldPath || !newPath) {
  console.error('Usage: node tests/eval/compare.js <old.json> <new.json>')
  process.exit(1)
}

const old_ = JSON.parse(readFileSync(resolve(oldPath), 'utf-8'))
const new_ = JSON.parse(readFileSync(resolve(newPath), 'utf-8'))

const REGRESSION_THRESHOLD = 0.05

const metrics = [
  { label: 'Chapter detection F1', oldVal: old_.chapterDetection?.f1, newVal: new_.chapterDetection?.f1 },
  { label: 'Character extraction recall', oldVal: old_.characterExtraction?.recall, newVal: new_.characterExtraction?.recall },
  { label: 'Character extraction precision', oldVal: old_.characterExtraction?.precision, newVal: new_.characterExtraction?.precision },
  { label: 'Template detection accuracy', oldVal: old_.templateDetection?.accuracy, newVal: new_.templateDetection?.accuracy },
]

let anyRegression = false

console.log('\n=== Eval Regression Report ===')
console.log(`Old: ${old_.runAt}`)
console.log(`New: ${new_.runAt}\n`)
console.log('Metric'.padEnd(36) + 'Old'.padStart(8) + 'New'.padStart(8) + 'Delta'.padStart(10) + '  Status')
console.log('─'.repeat(74))

for (const m of metrics) {
  if (m.oldVal == null || m.newVal == null) {
    console.log(m.label.padEnd(36) + 'N/A'.padStart(8) + 'N/A'.padStart(8) + '  (skipped)')
    continue
  }
  const delta = m.newVal - m.oldVal
  const regressed = delta < -REGRESSION_THRESHOLD
  if (regressed) anyRegression = true
  const status = regressed ? '⚠ REGRESSION' : delta >= 0 ? '✓ improved' : '~ within tolerance'
  console.log(
    m.label.padEnd(36) +
    m.oldVal.toFixed(3).padStart(8) +
    m.newVal.toFixed(3).padStart(8) +
    (delta >= 0 ? '+' : '') + delta.toFixed(3).padStart(9) +
    '  ' + status
  )
}

if (anyRegression) {
  console.log('\n⚠ One or more metrics regressed by more than 5%. Review and fix before merging.')
  process.exit(1)
} else {
  console.log('\n✓ No regressions detected.')
}
