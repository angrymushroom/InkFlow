/**
 * Tests for novelIngestion.js
 *
 * Chapter detection and template normalization use real production code with
 * real fixture files — no AI mocks required for the regex path.
 * Tests that exercise AI calls mock only the AI layer.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── AI mock (only used by AI-dependent tests) ─────────────────────────────────
const mockCompleteWithAi = vi.fn()
vi.mock('@/services/ai.js', () => ({
  completeWithAi: (...args) => mockCompleteWithAi(...args),
  TIERS: { LIGHT: 'light', ADVANCED: 'advanced' },
}))

// novelIngestion imports templates; mock db to avoid IndexedDB in Node
vi.mock('@/db', () => ({
  addStory: vi.fn(),
  addChapter: vi.fn(async (ch) => ({ id: 'ch-1', ...ch })),
  addScene: vi.fn(async (sc) => ({ id: 'sc-1', ...sc })),
  addCharacter: vi.fn(async (c) => ({ id: 'char-1', ...c })),
  addCharacterRelationship: vi.fn(),
  updateStory: vi.fn(),
  getChapters: vi.fn(async () => []),
  getCharacters: vi.fn(async () => []),
  deleteChapter: vi.fn(),
  deleteCharacter: vi.fn(),
}))

vi.mock('@/services/summarization.js', () => ({ runSummaryPipeline: vi.fn(async () => {}) }))
vi.mock('@/services/consistency.js', () => ({ updateSceneFacts: vi.fn(async () => {}) }))

const {
  detectChapters,
  analyzeChapters,
  mergeCharacters,
  detectTemplate,
} = await import('@/services/novelIngestion.js')

// ── Real fixture paths ────────────────────────────────────────────────────────
const NOVEL_TXT = readFileSync(resolve(__dirname, '../../../tests/fixtures/test-novel.txt'), 'utf-8')
const TIME_MACHINE_TXT = readFileSync(resolve(__dirname, '../../../e2e/fixtures/novel-public-domain.txt'), 'utf-8')

// ─────────────────────────────────────────────────────────────────────────────
// Chapter detection — pure regex path, no AI mock needed
// ─────────────────────────────────────────────────────────────────────────────
describe('detectChapters — regex path (real fixtures, no AI)', () => {
  it('detects at least 3 chapters in test-novel.txt by regex alone', async () => {
    const chapters = await detectChapters(NOVEL_TXT)
    expect(chapters.length).toBeGreaterThanOrEqual(3)
  })

  it('chapter titles include all three expected chapter headings', async () => {
    const chapters = await detectChapters(NOVEL_TXT)
    const titles = chapters.map((c) => c.title)
    expect(titles).toContain('Chapter 1: The Arrival')
    expect(titles).toContain('Chapter 2: The Estate')
    expect(titles).toContain('Chapter 3: The Truth in the Ashes')
  })

  it('each chapter has non-empty content', async () => {
    const chapters = await detectChapters(NOVEL_TXT)
    for (const ch of chapters) {
      expect(ch.content.length).toBeGreaterThan(100)
    }
  })

  it('detects 3 chapters in Time Machine via roman numeral regex (no AI)', async () => {
    const chapters = await detectChapters(TIME_MACHINE_TXT)
    expect(chapters.length).toBeGreaterThanOrEqual(3)
  })

  it('Time Machine chapter 1 title combines roman numeral + subtitle', async () => {
    const chapters = await detectChapters(TIME_MACHINE_TXT)
    // " I.\n Introduction" → "I. Introduction"
    expect(chapters[0].title).toBe('I. Introduction')
  })

  it('AI is never called when regex finds ≥2 chapters', async () => {
    mockCompleteWithAi.mockClear()
    await detectChapters(NOVEL_TXT)
    expect(mockCompleteWithAi).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// analyzeChapter — AI-dependent; tests realistic failure responses
// ─────────────────────────────────────────────────────────────────────────────
describe('analyzeChapters — AI response edge cases', () => {
  beforeEach(() => mockCompleteWithAi.mockReset())

  it('returns characters when AI returns valid JSON', async () => {
    mockCompleteWithAi.mockResolvedValue(
      JSON.stringify({
        characters: [{ name: 'Alice', role: 'protagonist' }],
        chapterSummary: 'Alice arrives.',
      })
    )
    const result = await analyzeChapters([{ title: 'Ch1', content: 'Alice walked in.' }])
    expect(result[0].characters).toHaveLength(1)
    expect(result[0].characters[0].name).toBe('Alice')
    expect(result[0].chapterSummary).toBe('Alice arrives.')
  })

  it('returns empty characters (not crash) when AI returns truncated JSON', async () => {
    // Simulates maxTokens cutoff mid-response
    mockCompleteWithAi.mockResolvedValue('{"characters":[{"name":"Alice","role":"protagonist","goal":"Find the')
    const result = await analyzeChapters([{ title: 'Ch1', content: 'Alice searched.' }])
    expect(result[0].characters).toEqual([])
    expect(result[0].scenes.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty characters (not crash) when AI returns plain text', async () => {
    mockCompleteWithAi.mockResolvedValue('Sorry, I cannot analyze this text.')
    const result = await analyzeChapters([{ title: 'Ch1', content: 'Some text here for analysis.' }])
    expect(result[0].characters).toEqual([])
  })

  it('returns empty characters (not crash) when AI returns empty string', async () => {
    mockCompleteWithAi.mockResolvedValue('')
    const result = await analyzeChapters([{ title: 'Ch1', content: 'Content here.' }])
    expect(result[0].characters).toEqual([])
  })

  it('returns empty characters when AI returns null/empty (network-down simulation)', async () => {
    mockCompleteWithAi.mockResolvedValue('')
    const result = await analyzeChapters([{ title: 'Ch1', content: 'Content here.' }])
    expect(result[0].characters).toEqual([])
  })

  it('always returns scenes from regex even when AI returns garbage', async () => {
    mockCompleteWithAi.mockResolvedValue('500 Internal Server Error')
    const result = await analyzeChapters([{ title: 'Ch1', content: NOVEL_TXT.slice(0, 500) }])
    expect(result[0].scenes.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// mergeCharacters — AI-dependent; tests fallback when AI fails
// ─────────────────────────────────────────────────────────────────────────────
describe('mergeCharacters — AI response edge cases', () => {
  beforeEach(() => mockCompleteWithAi.mockReset())

  it('returns merged list when AI responds with valid JSON array', async () => {
    mockCompleteWithAi.mockResolvedValue(
      JSON.stringify([{ canonicalName: 'Alice Mercer', aliases: ['Alice'], role: 'protagonist' }])
    )
    const result = await mergeCharacters([[{ name: 'Alice', role: 'protagonist' }, { name: 'Alice Mercer', role: 'protagonist' }]])
    expect(result[0].canonicalName).toBe('Alice Mercer')
  })

  it('falls back to raw dedup (not crash) when AI returns truncated JSON', async () => {
    mockCompleteWithAi.mockResolvedValue('[{"canonicalName":"Alice","aliases":[],"role":"protagonist"')
    const chars = [{ name: 'Alice', role: 'protagonist' }, { name: 'Bob', role: 'supporting' }]
    const result = await mergeCharacters([chars])
    // Fallback: returns unique chars with canonicalName = original name
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0]).toHaveProperty('canonicalName')
  })

  it('falls back to raw dedup when AI returns malformed JSON', async () => {
    mockCompleteWithAi.mockResolvedValue('Rate limit exceeded. Please retry later.')
    const chars = [{ name: 'Alice', role: 'protagonist' }, { name: 'Bob', role: 'supporting' }]
    const result = await mergeCharacters([chars])
    expect(result.length).toBe(2)
  })

  it('returns empty array for empty input without calling AI', async () => {
    const result = await mergeCharacters([[], []])
    expect(result).toEqual([])
    expect(mockCompleteWithAi).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// detectTemplate — normalization logic (critical bug fix test)
// ─────────────────────────────────────────────────────────────────────────────
describe('detectTemplate — template ID normalization', () => {
  beforeEach(() => mockCompleteWithAi.mockReset())

  const summaries = ['A hero sets out on a quest.', 'They face great trials.', 'They return changed.']

  it('recognizes save_the_cat when AI returns exact id', async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: 'save_the_cat', confidence: 0.8, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('save_the_cat')
  })

  it('recognizes hero_journey when AI returns exact id', async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: 'hero_journey', confidence: 0.75, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('hero_journey')
  })

  it('normalizes "hero journey" (space instead of underscore)', async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: 'hero journey', confidence: 0.7, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('hero_journey')
  })

  it("normalizes \"hero's journey\" (apostrophe variant)", async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: "hero's journey", confidence: 0.7, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('hero_journey')
  })

  it('normalizes "Save the Cat" (capitalized with spaces)', async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: 'Save the Cat', confidence: 0.8, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('save_the_cat')
  })

  it('normalizes "story circle"', async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: 'story circle', confidence: 0.6, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('story_circle')
  })

  it('falls back to snowflake for unrecognized template', async () => {
    mockCompleteWithAi.mockResolvedValue(JSON.stringify({ templateId: 'three act structure', confidence: 0.5, spine: {} }))
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('snowflake')
  })

  it('falls back to snowflake when AI returns non-JSON', async () => {
    mockCompleteWithAi.mockResolvedValue('I think this matches the Hero Journey template.')
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('snowflake')
    expect(result.confidence).toBe(0.3)
  })

  it('falls back to snowflake when AI returns empty (timeout simulation)', async () => {
    mockCompleteWithAi.mockResolvedValue('')
    const result = await detectTemplate(summaries)
    expect(result.templateId).toBe('snowflake')
  })
})
