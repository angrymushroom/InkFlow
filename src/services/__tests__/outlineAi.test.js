import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/db', () => ({
  getStoryById: vi.fn(async () => ({
    id: 'story-1',
    oneSentence: 'A hero must stop a looming catastrophe.',
    setup: 'Peaceful village and ordinary life.',
    disaster1: 'The village is attacked.',
    disaster2: 'The hero fails to protect someone important.',
    disaster3: 'Final battle at the heart of the enemy stronghold.',
    ending: 'The world is saved but changed forever.',
  })),
  getIdeas: vi.fn(async () => [
    {
      id: 'i1',
      type: 'plot',
      title: 'Ancient prophecy',
      body: 'There is a prophecy about the hero.',
    },
  ]),
  getCharacters: vi.fn(async () => [
    { id: 'c1', name: 'Hero', oneSentence: 'Reluctant farmer chosen by fate.' },
  ]),
  getChapters: vi.fn(async () => []),
  getScenes: vi.fn(async () => []),
}))

vi.mock('@/services/ai', () => ({
  completeWithAi: vi.fn(async () => {
    return JSON.stringify({
      sections: {
        setup: [
          {
            chapterTitle: 'Life in the village',
            chapterSummary: 'Show the hero in their ordinary world.',
            scenes: [
              {
                title: 'Morning chores',
                oneSentence: 'The hero goes through a normal day in the village.',
                notes: 'Establish tone and relationships.',
              },
            ],
          },
        ],
        disaster1: [],
        disaster2: [],
        disaster3: [],
        ending: [],
      },
    })
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
  tierForContext: vi.fn(() => 'advanced'),
  getLanguageRule: vi.fn(() => 'Write in English.'),
}))

import {
  parseOutlineDraftJson,
  validateOutlineDraft,
  draftOutlineFromSpine,
  OUTLINE_BEATS,
} from '@/services/outlineAi'

describe('outlineAi service', () => {
  describe('parseOutlineDraftJson', () => {
    it('strips code fences and extracts JSON object', () => {
      const raw = '```json\n{"sections":{"setup":[]}}\n```'
      const parsed = parseOutlineDraftJson(raw)
      expect(parsed).toEqual({ sections: { setup: [] } })
    })
  })

  describe('validateOutlineDraft', () => {
    it('accepts a minimal valid draft', () => {
      const draft = {
        sections: { setup: [], disaster1: [], disaster2: [], disaster3: [], ending: [] },
      }
      expect(() => validateOutlineDraft(draft, 'all')).not.toThrow()
    })

    it('throws for invalid sections type', () => {
      const draft = { sections: { setup: {} } }
      expect(() => validateOutlineDraft(draft, 'all')).toThrow()
    })
  })

  describe('draftOutlineFromSpine', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('returns normalized sections for all beats', async () => {
      const result = await draftOutlineFromSpine({ storyId: 'story-1', scope: 'all' })
      expect(result).toHaveProperty('sections')
      for (const b of OUTLINE_BEATS) {
        expect(Array.isArray(result.sections[b])).toBe(true)
      }
      expect(result.sections.setup[0].chapterTitle).toBe('Life in the village')
    })
  })
})
