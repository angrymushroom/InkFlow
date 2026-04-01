/**
 * Eval: Character Extraction
 *
 * Measures precision and recall of character names extracted by the
 * full ingestion pipeline (detectChapters → analyzeChapters → mergeCharacters).
 *
 * Run with: VITE_RUN_EVALS=true node tests/eval/run-all.js
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { detectChapters, analyzeChapters, mergeCharacters } from '../../src/services/novelIngestion.js'
import { computeEntityF1 } from './metrics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CORPUS_DIR = resolve(__dirname, '../fixtures/eval-corpus')

const NOVELS = ['pride-and-prejudice', 'time-machine']

export async function runCharacterExtractionEval() {
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
      console.warn(`[character-extraction] Skipping ${novel} — fixture files not found`)
      continue
    }

    const chapters = await detectChapters(source)
    const analyzed = await analyzeChapters(chapters)
    const characters = await mergeCharacters(analyzed.map((c) => c.characters))

    const predictedNames = characters.map((c) => c.canonicalName)
    const groundTruthNames = gt.characters.map((c) => c.name)

    const { precision, recall, f1 } = computeEntityF1(predictedNames, groundTruthNames)

    console.log(`[character-extraction] ${novel}: P=${precision.toFixed(3)} R=${recall.toFixed(3)} F1=${f1.toFixed(3)}`)
    allResults.push({ novel, precision, recall, f1 })
  }

  if (allResults.length === 0) return { recall: null, precision: null, f1: null, results: [] }

  const macroRecall = allResults.reduce((s, r) => s + r.recall, 0) / allResults.length
  const macroPrecision = allResults.reduce((s, r) => s + r.precision, 0) / allResults.length
  const macroF1 = allResults.reduce((s, r) => s + r.f1, 0) / allResults.length

  console.log(`[character-extraction] Macro-avg: P=${macroPrecision.toFixed(3)} R=${macroRecall.toFixed(3)} F1=${macroF1.toFixed(3)}`)
  return { recall: macroRecall, precision: macroPrecision, f1: macroF1, results: allResults }
}
