import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockGetStoryFacts = vi.fn(() => Promise.resolve([]))
const mockGetCharacters = vi.fn(() => Promise.resolve([]))
const mockGetScene = vi.fn()
const mockGetScenes = vi.fn(() => Promise.resolve([]))
const mockReplaceStoryFactsForScenes = vi.fn(() => Promise.resolve())

vi.mock('@/db', () => ({
  getStoryFacts: (...args) => mockGetStoryFacts(...args),
  getCharacters: (...args) => mockGetCharacters(...args),
  getScene: (...args) => mockGetScene(...args),
  getScenes: (...args) => mockGetScenes(...args),
  replaceStoryFactsForScenes: (...args) => mockReplaceStoryFactsForScenes(...args),
}))

vi.mock('@/services/ai', () => ({
  completeWithAi: vi.fn((opts) => {
    if (
      opts.systemPrompt?.includes('Extract structured facts') ||
      opts.userPrompt?.includes('From this scene text')
    ) {
      return Promise.resolve(
        JSON.stringify({
          characters: [{ name: 'Alice', trait: 'hero' }],
          locations: ['Village'],
          events: ['The quest began.'],
          open_threads: [],
          character_states: [],
        })
      )
    }
    if (opts.systemPrompt?.includes('consistency checker') && opts.userPrompt?.includes('JSON')) {
      return Promise.resolve('[]')
    }
    return Promise.resolve('No contradictions.')
  }),
  TIERS: { LIGHT: 'light', ADVANCED: 'advanced' },
  CONTEXTS: {
    CONSISTENCY: 'consistency',
    CHAT: 'chat',
    SCENE_PROSE: 'scene_prose',
    EXPAND_SHORT: 'expand_short',
    OUTLINE_DRAFT_FULL: 'outline_draft_full',
    OUTLINE_DRAFT_SECTION: 'outline_draft_section',
    CHAT_WITH_TOOLS: 'chat_with_tools',
  },
  tierForContext: vi.fn(() => 'light'),
}))

const {
  extractFactsFromProse,
  updateStoryFactsFromScenes,
  checkConsistency,
  quickConsistencyCheck,
  updateSceneFacts,
} = await import('@/services/consistency.js')

describe('consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStoryFacts.mockResolvedValue([])
    mockGetCharacters.mockResolvedValue([])
    mockGetScene.mockResolvedValue({ content: 'Scene text.', oneSentenceSummary: 'Summary.' })
    mockGetScenes.mockResolvedValue([])
  })

  describe('extractFactsFromProse', () => {
    it('returns character, location, and event facts from AI response', async () => {
      const result = await extractFactsFromProse({
        sceneText: 'Alice left the village.',
        sceneId: 's1',
        chapterId: 'ch1',
        storyId: 'story1',
      })
      expect(Array.isArray(result)).toBe(true)
      expect(result.some((f) => f.factType === 'character' && f.content.includes('Alice'))).toBe(
        true
      )
      expect(result.some((f) => f.factType === 'location')).toBe(true)
      expect(result.some((f) => f.factType === 'event')).toBe(true)
      result.forEach((f) => {
        expect(f.sourceSceneId).toBe('s1')
        expect(f.sourceChapterId).toBe('ch1')
      })
    })

    it('returns empty array for empty scene text', async () => {
      const result = await extractFactsFromProse({
        sceneText: '',
        sceneId: 's1',
        storyId: 'story1',
      })
      expect(result).toEqual([])
    })
  })

  describe('checkConsistency', () => {
    it('returns model reply with storyFacts and scene text in prompt', async () => {
      mockGetStoryFacts.mockResolvedValue([
        { factType: 'character', content: 'Alice is the hero.' },
      ])
      mockGetCharacters.mockResolvedValue([{ name: 'Alice', oneSentence: 'Hero.' }])
      mockGetScene.mockResolvedValue({
        content: 'Alice fought the dragon.',
        oneSentenceSummary: 'Battle.',
      })
      const result = await checkConsistency({ storyId: 'story1', sceneId: 's1' })
      expect(result).toBe('No contradictions.')
    })
  })

  // ── quickConsistencyCheck ───────────────────────────────────────────────────
  describe('quickConsistencyCheck', () => {
    it('returns null when scene text is shorter than 100 chars', async () => {
      mockGetScene.mockResolvedValue({ id: 's1', content: 'Too short.' })
      mockGetStoryFacts.mockResolvedValue([
        {
          factType: 'character_state',
          content: 'Alice: at home',
          priority: 'high',
          resolved: null,
        },
      ])
      const result = await quickConsistencyCheck({ sceneId: 's1', storyId: 'story1' })
      expect(result).toBeNull()
    })

    it('returns empty array when no high-priority facts exist', async () => {
      mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(150) })
      mockGetStoryFacts.mockResolvedValue([
        { factType: 'event', content: 'Something happened', priority: 'medium', resolved: null },
      ])
      const result = await quickConsistencyCheck({ sceneId: 's1', storyId: 'story1' })
      expect(result).toEqual([])
    })

    it('returns contradiction strings parsed from AI JSON response', async () => {
      const { completeWithAi } = await import('@/services/ai')
      completeWithAi.mockResolvedValueOnce('["Alice cannot be in two places at once."]')
      mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(150) })
      mockGetStoryFacts.mockResolvedValue([
        {
          factType: 'character_state',
          content: 'Alice: at the castle',
          priority: 'high',
          resolved: null,
        },
      ])
      const result = await quickConsistencyCheck({ sceneId: 's1', storyId: 'story1' })
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toContain('Alice')
    })

    it('returns null on AI parse error (non-JSON response)', async () => {
      const { completeWithAi } = await import('@/services/ai')
      completeWithAi.mockResolvedValueOnce('This is not valid JSON')
      mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(150) })
      mockGetStoryFacts.mockResolvedValue([
        {
          factType: 'open_thread',
          content: 'Where is the sword?',
          priority: 'high',
          resolved: null,
        },
      ])
      const result = await quickConsistencyCheck({ sceneId: 's1', storyId: 'story1' })
      expect(result).toBeNull()
    })

    it('ignores resolved open_threads', async () => {
      mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(150) })
      mockGetStoryFacts.mockResolvedValue([
        {
          factType: 'open_thread',
          content: 'Where is the sword?',
          priority: 'high',
          resolved: true,
        },
      ])
      const result = await quickConsistencyCheck({ sceneId: 's1', storyId: 'story1' })
      // No high-priority unresolved facts → empty array (not null)
      expect(result).toEqual([])
    })
  })

  // ── updateSceneFacts ────────────────────────────────────────────────────────
  describe('updateSceneFacts', () => {
    it('skips when sceneText is shorter than 100 chars', async () => {
      await updateSceneFacts({
        sceneId: 's1',
        chapterId: 'ch1',
        storyId: 'story1',
        sceneText: 'Too short.',
      })
      expect(mockReplaceStoryFactsForScenes).not.toHaveBeenCalled()
    })

    it('calls replaceStoryFactsForScenes with extracted facts', async () => {
      const longText = 'Alice the hero walked through the village. ' + 'A'.repeat(80)
      await updateSceneFacts({
        sceneId: 's1',
        chapterId: 'ch1',
        storyId: 'story1',
        sceneText: longText,
      })
      expect(mockReplaceStoryFactsForScenes).toHaveBeenCalledWith(
        'story1',
        ['s1'],
        expect.any(Array)
      )
    })

    it('does not call replaceStoryFactsForScenes when extractFactsFromProse returns null', async () => {
      const { completeWithAi } = await import('@/services/ai')
      completeWithAi.mockResolvedValueOnce('not valid json')
      const longText = 'A'.repeat(150)
      await updateSceneFacts({
        sceneId: 's1',
        chapterId: 'ch1',
        storyId: 'story1',
        sceneText: longText,
      })
      expect(mockReplaceStoryFactsForScenes).not.toHaveBeenCalled()
    })
  })
})
