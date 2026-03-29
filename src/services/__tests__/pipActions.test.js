import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// ---------------------------------------------------------------------------
// Store mocks (Pinia must be active; stores are mocked to no-ops)
// Shared spy references so tests can assert calls.
// ---------------------------------------------------------------------------
const mockStoryLoadActiveStory = vi.fn()
const mockOutlineLoad = vi.fn()
const mockCharactersLoad = vi.fn()
const mockIdeasLoad = vi.fn()

vi.mock('@/stores/story.js', () => ({
  useStoryStore: () => ({ loadActiveStory: mockStoryLoadActiveStory, loadStories: vi.fn() }),
}))
vi.mock('@/stores/outline.js', () => ({
  useOutlineStore: () => ({ load: mockOutlineLoad }),
}))
vi.mock('@/stores/characters.js', () => ({
  useCharactersStore: () => ({ load: mockCharactersLoad }),
}))
vi.mock('@/stores/ideas.js', () => ({
  useIdeasStore: () => ({ load: mockIdeasLoad }),
}))

// ---------------------------------------------------------------------------
// DB mocks
// ---------------------------------------------------------------------------
const mockGetStoryById = vi.fn()
const mockSaveStory = vi.fn(() => Promise.resolve())
const mockGetCharacters = vi.fn(() => Promise.resolve([]))
const mockAddCharacter = vi.fn(() => Promise.resolve())
const mockUpdateCharacter = vi.fn(() => Promise.resolve())
const mockGetChapters = vi.fn(() => Promise.resolve([]))
const mockAddChapter = vi.fn()
const mockUpdateChapter = vi.fn(() => Promise.resolve())
const mockReorderChapters = vi.fn(() => Promise.resolve())
const mockGetScenes = vi.fn(() => Promise.resolve([]))
const mockAddScene = vi.fn(() => Promise.resolve())
const mockUpdateScene = vi.fn(() => Promise.resolve())
const mockGetCurrentStoryId = vi.fn(() => 'story1')

vi.mock('@/db', () => ({
  getStoryById: (...args) => mockGetStoryById(...args),
  saveStory: (...args) => mockSaveStory(...args),
  getCharacters: (...args) => mockGetCharacters(...args),
  addCharacter: (...args) => mockAddCharacter(...args),
  updateCharacter: (...args) => mockUpdateCharacter(...args),
  getChapters: (...args) => mockGetChapters(...args),
  addChapter: (...args) => mockAddChapter(...args),
  updateChapter: (...args) => mockUpdateChapter(...args),
  reorderChapters: (...args) => mockReorderChapters(...args),
  getScenes: (...args) => mockGetScenes(...args),
  addScene: (...args) => mockAddScene(...args),
  updateScene: (...args) => mockUpdateScene(...args),
  getCurrentStoryId: (...args) => mockGetCurrentStoryId(...args),
}))

// ---------------------------------------------------------------------------
// Templates mock
// ---------------------------------------------------------------------------
vi.mock('@/data/templates', () => ({
  TEMPLATES: {
    snowflake: { name: 'snowflake' },
    hero_journey: { name: 'hero_journey' },
  },
  getTemplate: vi.fn(() => ({
    spineFields: [
      { key: 'oneSentence', prop: 'oneSentence' },
      { key: 'setup', prop: 'setup' },
      { key: 'ending', prop: 'ending' },
    ],
  })),
  setSpineFieldPatch: vi.fn((story, prop, val) => ({ [prop]: val })),
}))

const { parseActions, applySingleAction } = await import('@/services/pipActions.js')

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('parseActions', () => {
  it('returns cleanText with pip-action tags stripped', () => {
    const text = 'Hello\n<pip-action>{"type":"add_chapter","title":"Ch1"}</pip-action>\nworld'
    const { cleanText } = parseActions(text)
    expect(cleanText).not.toContain('<pip-action>')
    expect(cleanText).toContain('Hello')
    expect(cleanText).toContain('world')
  })

  it('extracts single action from AI response', () => {
    const text = '<pip-action>{"type":"add_chapter","title":"Act One"}</pip-action>'
    const { actions } = parseActions(text)
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('add_chapter')
    expect(actions[0].title).toBe('Act One')
  })

  it('extracts multiple actions from one response', () => {
    const text = [
      '<pip-action>{"type":"add_chapter","title":"Ch1"}</pip-action>',
      '<pip-action>{"type":"add_chapter","title":"Ch2"}</pip-action>',
    ].join(' ')
    const { actions } = parseActions(text)
    expect(actions).toHaveLength(2)
  })

  it('silently ignores malformed JSON in tags', () => {
    const text = '<pip-action>{not valid json}</pip-action>'
    const { actions } = parseActions(text)
    expect(actions).toHaveLength(0)
  })

  it('returns empty actions array when no tags present', () => {
    const { actions, cleanText } = parseActions('Just some text')
    expect(actions).toHaveLength(0)
    expect(cleanText).toBe('Just some text')
  })
})

describe('applySingleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentStoryId.mockReturnValue('story1')
  })

  // ── add_chapter ────────────────────────────────────────────────────────────
  describe('add_chapter', () => {
    it('calls addChapter with correct title and storyId', async () => {
      mockAddChapter.mockResolvedValue({ id: 'ch-new', title: 'Act One' })
      mockGetChapters.mockResolvedValue([{ id: 'ch-new', title: 'Act One' }])
      await applySingleAction({ raw: { type: 'add_chapter', title: 'Act One' }, storyId: 'story1' })
      expect(mockAddChapter).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Act One', storyId: 'story1' })
      )
    })

    it('appends to end when after_chapter_title not given', async () => {
      mockAddChapter.mockResolvedValue({ id: 'ch-new', title: 'New Chapter' })
      mockGetChapters.mockResolvedValue([{ id: 'ch-new', title: 'New Chapter' }])
      await applySingleAction({
        raw: { type: 'add_chapter', title: 'New Chapter' },
        storyId: 'story1',
      })
      expect(mockReorderChapters).not.toHaveBeenCalled()
    })

    it('positions chapter after specified chapter (after_chapter_title)', async () => {
      mockAddChapter.mockResolvedValue({ id: 'ch-new', title: 'Act Two' })
      mockGetChapters.mockResolvedValue([
        { id: 'ch1', title: 'Act One' },
        { id: 'ch-new', title: 'Act Two' },
      ])
      await applySingleAction({
        raw: { type: 'add_chapter', title: 'Act Two', after_chapter_title: 'Act One' },
        storyId: 'story1',
      })
      expect(mockReorderChapters).toHaveBeenCalledWith('story1', expect.any(Array))
    })
  })

  // ── update_chapter ─────────────────────────────────────────────────────────
  describe('update_chapter', () => {
    it('calls updateChapter when title_match finds a chapter', async () => {
      mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One' }])
      await applySingleAction({
        raw: { type: 'update_chapter', title_match: 'Act One', fields: { title: 'Act 1' } },
        storyId: 'story1',
      })
      expect(mockUpdateChapter).toHaveBeenCalledWith(
        'ch1',
        expect.objectContaining({ title: 'Act 1' })
      )
    })

    it('throws when no chapter matches title_match', async () => {
      mockGetChapters.mockResolvedValue([])
      await expect(
        applySingleAction({
          raw: { type: 'update_chapter', title_match: 'Missing', fields: { title: 'X' } },
          storyId: 'story1',
        })
      ).rejects.toThrow()
    })
  })

  // ── add_scene ──────────────────────────────────────────────────────────────
  describe('add_scene', () => {
    it('calls addScene with correct title and chapterId', async () => {
      mockGetChapters.mockResolvedValue([{ id: 'ch1', title: 'Act One' }])
      await applySingleAction({
        raw: { type: 'add_scene', title: 'The Opening', chapter_title_match: 'Act One' },
        storyId: 'story1',
      })
      expect(mockAddScene).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'The Opening', chapterId: 'ch1' })
      )
    })

    it('throws when chapter_title_match finds no chapter', async () => {
      mockGetChapters.mockResolvedValue([])
      await expect(
        applySingleAction({
          raw: { type: 'add_scene', title: 'X', chapter_title_match: 'Missing' },
          storyId: 'story1',
        })
      ).rejects.toThrow()
    })
  })

  // ── update_scene ───────────────────────────────────────────────────────────
  describe('update_scene', () => {
    it('calls updateScene when title_match finds a scene', async () => {
      mockGetScenes.mockResolvedValue([{ id: 's1', title: 'The Opening', chapterId: 'ch1' }])
      await applySingleAction({
        raw: {
          type: 'update_scene',
          title_match: 'The Opening',
          fields: { title: 'The New Opening' },
        },
        storyId: 'story1',
      })
      expect(mockUpdateScene).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ title: 'The New Opening' })
      )
    })

    it('throws when no scene matches title_match', async () => {
      mockGetScenes.mockResolvedValue([])
      await expect(
        applySingleAction({
          raw: { type: 'update_scene', title_match: 'Missing', fields: { title: 'X' } },
          storyId: 'story1',
        })
      ).rejects.toThrow()
    })
  })

  // ── upsert_character ───────────────────────────────────────────────────────
  describe('upsert_character', () => {
    it('calls addCharacter when name does not exist (case-insensitive)', async () => {
      mockGetCharacters.mockResolvedValue([])
      await applySingleAction({
        raw: { type: 'upsert_character', name: 'Alice', fields: { oneSentence: 'The hero.' } },
        storyId: 'story1',
      })
      expect(mockAddCharacter).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alice', storyId: 'story1' })
      )
      expect(mockUpdateCharacter).not.toHaveBeenCalled()
    })

    it('calls updateCharacter when character already exists', async () => {
      mockGetCharacters.mockResolvedValue([{ id: 'c1', name: 'Alice' }])
      await applySingleAction({
        raw: { type: 'upsert_character', name: 'ALICE', fields: { oneSentence: 'Updated.' } },
        storyId: 'story1',
      })
      expect(mockUpdateCharacter).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ name: 'ALICE' })
      )
      expect(mockAddCharacter).not.toHaveBeenCalled()
    })
  })

  // ── update_spine ───────────────────────────────────────────────────────────
  describe('update_spine', () => {
    it('calls saveStory with updated spine fields', async () => {
      const mockStory = {
        id: 'story1',
        oneSentence: 'Old sentence',
        template: 'snowflake',
        templateFields: {},
      }
      mockGetStoryById.mockResolvedValue(mockStory)
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      await applySingleAction({
        raw: { type: 'update_spine', fields: { oneSentence: 'New sentence' } },
        storyId: 'story1',
      })

      expect(mockSaveStory).toHaveBeenCalled()
      dispatchSpy.mockRestore()
    })

    it('calls storyStore.loadActiveStory after template change', async () => {
      mockGetStoryById.mockResolvedValue({
        id: 'story1',
        template: 'snowflake',
        templateFields: {},
      })
      mockStoryLoadActiveStory.mockClear()

      await applySingleAction({
        raw: { type: 'recommend_template', template: 'hero_journey' },
        storyId: 'story1',
      })

      expect(mockStoryLoadActiveStory).toHaveBeenCalled()
    })

    it('preserves existing fields not mentioned in action', async () => {
      const mockStory = {
        id: 'story1',
        oneSentence: 'Old',
        setup: 'Existing setup',
        template: 'snowflake',
        templateFields: {},
      }
      mockGetStoryById.mockResolvedValue(mockStory)
      let savedStory = null
      mockSaveStory.mockImplementation((s) => {
        savedStory = s
        return Promise.resolve()
      })

      await applySingleAction({
        raw: { type: 'update_spine', fields: { oneSentence: 'New' } },
        storyId: 'story1',
      })

      expect(savedStory).not.toBeNull()
      expect(savedStory.setup).toBe('Existing setup')
    })
  })
})
