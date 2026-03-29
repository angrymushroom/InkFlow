import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// DB mocks
// ---------------------------------------------------------------------------
const mockGetStory = vi.fn()
const mockGetChapters = vi.fn(() => Promise.resolve([]))
const mockGetScenes = vi.fn(() => Promise.resolve([]))

vi.mock('@/db', () => ({
  getStory: (...args) => mockGetStory(...args),
  getChapters: (...args) => mockGetChapters(...args),
  getScenes: (...args) => mockGetScenes(...args),
}))

const { buildMarkdown, buildPlainText } = await import('@/utils/exportFormats.js')

describe('buildMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('outputs story title as H1', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: 'My Novel Title' })
    mockGetChapters.mockResolvedValue([])
    mockGetScenes.mockResolvedValue([])
    const result = await buildMarkdown('story1')
    expect(result).toContain('# My Novel Title')
  })

  it('outputs chapter headings as H2', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: 'My Novel' })
    mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One', order: 0 }])
    mockGetScenes.mockResolvedValue([])
    const result = await buildMarkdown('story1')
    expect(result).toContain('## Act One')
  })

  it('outputs scene titles as H3', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: 'My Novel' })
    mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One', order: 0 }])
    mockGetScenes.mockResolvedValue([
      { id: 's1', chapterId: 'ch1', title: 'The Opening', order: 0, content: 'Once upon a time.' },
    ])
    const result = await buildMarkdown('story1')
    expect(result).toContain('### The Opening')
  })

  it('includes scene prose content', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: 'My Novel' })
    mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One', order: 0 }])
    mockGetScenes.mockResolvedValue([
      { id: 's1', chapterId: 'ch1', title: 'Opening', order: 0, content: 'The hero arrived.' },
    ])
    const result = await buildMarkdown('story1')
    expect(result).toContain('The hero arrived.')
  })

  it('handles story with no scenes without throwing', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: 'Empty Story' })
    mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One', order: 0 }])
    mockGetScenes.mockResolvedValue([])
    await expect(buildMarkdown('story1')).resolves.toBeDefined()
  })

  it('uses fallback title when oneSentence is empty', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: '' })
    mockGetChapters.mockResolvedValue([])
    mockGetScenes.mockResolvedValue([])
    const result = await buildMarkdown('story1')
    expect(result).toContain('# Untitled Story')
  })
})

describe('buildPlainText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('outputs plain text with scene separators', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: 'My Novel' })
    mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One', order: 0 }])
    mockGetScenes.mockResolvedValue([
      { id: 's1', chapterId: 'ch1', title: 'Scene 1', order: 0, content: 'It was a dark night.' },
    ])
    const result = await buildPlainText('story1')
    expect(result).toContain('Act One')
    expect(result).toContain('It was a dark night.')
    // Title should be uppercase (per implementation)
    expect(result).toContain('MY NOVEL')
  })

  it('handles empty story without throwing', async () => {
    mockGetStory.mockResolvedValue({ oneSentence: '' })
    mockGetChapters.mockResolvedValue([])
    mockGetScenes.mockResolvedValue([])
    await expect(buildPlainText('story1')).resolves.toBeDefined()
  })
})
