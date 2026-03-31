import { describe, it, expect } from 'vitest'
import {
  computeEntityF1,
  computeRougeL,
  fuzzyMatch,
  evaluateChapterDetection,
  evaluateTemplateAccuracy,
  checkThresholds,
  EVAL_THRESHOLDS,
} from '../metrics.js'

describe('computeEntityF1', () => {
  it('returns 1 when predicted == ground truth', () => {
    const { precision, recall, f1 } = computeEntityF1(['Alice', 'Bob'], ['Alice', 'Bob'])
    expect(f1).toBeCloseTo(1)
    expect(precision).toBeCloseTo(1)
    expect(recall).toBeCloseTo(1)
  })

  it('is case-insensitive', () => {
    const { f1 } = computeEntityF1(['alice', 'BOB'], ['Alice', 'Bob'])
    expect(f1).toBeCloseTo(1)
  })

  it('returns 0 recall when no predicted match ground truth', () => {
    const { recall, f1 } = computeEntityF1(['Charlie'], ['Alice', 'Bob'])
    expect(recall).toBe(0)
    expect(f1).toBe(0)
  })

  it('handles partial overlap', () => {
    const { precision, recall } = computeEntityF1(['Alice', 'Charlie'], ['Alice', 'Bob'])
    expect(precision).toBeCloseTo(0.5)
    expect(recall).toBeCloseTo(0.5)
  })

  it('handles empty predicted', () => {
    const { precision, recall, f1 } = computeEntityF1([], ['Alice'])
    expect(precision).toBe(0)
    expect(recall).toBe(0)
    expect(f1).toBe(0)
  })

  it('handles empty ground truth', () => {
    const { precision, recall, f1 } = computeEntityF1(['Alice'], [])
    expect(precision).toBe(0)
    expect(recall).toBe(0)
    expect(f1).toBe(0)
  })
})

describe('computeRougeL', () => {
  it('returns 1 for identical strings', () => {
    expect(computeRougeL('the cat sat on the mat', 'the cat sat on the mat')).toBeCloseTo(1)
  })

  it('returns 0 for completely different strings', () => {
    expect(computeRougeL('foo bar', 'baz qux')).toBe(0)
  })

  it('returns partial score for overlapping strings', () => {
    const score = computeRougeL('the cat sat', 'the cat ran away')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  it('handles empty hypothesis', () => {
    expect(computeRougeL('', 'reference text')).toBe(0)
  })

  it('handles empty reference', () => {
    expect(computeRougeL('hypothesis text', '')).toBe(0)
  })
})

describe('fuzzyMatch', () => {
  it('returns 1 for identical strings', () => {
    expect(fuzzyMatch('hello world', 'hello world')).toBe(1)
  })

  it('returns 1 for case-insensitive match', () => {
    expect(fuzzyMatch('Hello', 'hello')).toBe(1)
  })

  it('returns 0 for completely different strings of same length', () => {
    expect(fuzzyMatch('aaa', 'bbb')).toBe(0)
  })

  it('returns high score for one character difference', () => {
    expect(fuzzyMatch('chapter one', 'chapter one!')).toBeGreaterThan(0.9)
  })

  it('handles empty strings', () => {
    expect(fuzzyMatch('', '')).toBe(1)
    expect(fuzzyMatch('text', '')).toBe(0)
    expect(fuzzyMatch('', 'text')).toBe(0)
  })
})

describe('evaluateChapterDetection', () => {
  it('delegates to computeEntityF1', () => {
    const { f1 } = evaluateChapterDetection(['Chapter 1', 'Chapter 2'], ['Chapter 1', 'Chapter 2'])
    expect(f1).toBeCloseTo(1)
  })
})

describe('evaluateTemplateAccuracy', () => {
  it('returns 1 when all predictions correct', () => {
    const pairs = [
      { predicted: 'snowflake', expected: 'snowflake' },
      { predicted: 'hero_journey', expected: 'hero_journey' },
    ]
    expect(evaluateTemplateAccuracy(pairs)).toBe(1)
  })

  it('returns 0.5 for half correct', () => {
    const pairs = [
      { predicted: 'snowflake', expected: 'snowflake' },
      { predicted: 'save_the_cat', expected: 'hero_journey' },
    ]
    expect(evaluateTemplateAccuracy(pairs)).toBe(0.5)
  })

  it('returns 0 for empty pairs', () => {
    expect(evaluateTemplateAccuracy([])).toBe(0)
  })
})

describe('checkThresholds', () => {
  it('returns empty array when all metrics pass', () => {
    const failures = checkThresholds({
      chapterF1: EVAL_THRESHOLDS.chapterDetectionF1,
      charRecall: EVAL_THRESHOLDS.characterExtractionRecall,
      templateAcc: EVAL_THRESHOLDS.templateDetectionAccuracy,
    })
    expect(failures).toHaveLength(0)
  })

  it('reports failure when chapter F1 is below threshold', () => {
    const failures = checkThresholds({ chapterF1: 0.5 })
    expect(failures.length).toBeGreaterThan(0)
    expect(failures[0]).toMatch(/Chapter detection/)
  })

  it('reports failure when character recall is below threshold', () => {
    const failures = checkThresholds({ charRecall: 0.3 })
    expect(failures.length).toBeGreaterThan(0)
    expect(failures[0]).toMatch(/Character extraction/)
  })

  it('skips metrics that are null', () => {
    const failures = checkThresholds({ chapterF1: null, charRecall: null, templateAcc: null })
    expect(failures).toHaveLength(0)
  })
})
