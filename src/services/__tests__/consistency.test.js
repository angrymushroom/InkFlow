import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockGetStoryFacts = vi.fn(() => Promise.resolve([]));
const mockGetCharacters = vi.fn(() => Promise.resolve([]));
const mockGetScene = vi.fn();
const mockGetScenes = vi.fn(() => Promise.resolve([]));
const mockReplaceStoryFactsForScenes = vi.fn(() => Promise.resolve());

vi.mock('@/db', () => ({
  getStoryFacts: (...args) => mockGetStoryFacts(...args),
  getCharacters: (...args) => mockGetCharacters(...args),
  getScene: (...args) => mockGetScene(...args),
  getScenes: (...args) => mockGetScenes(...args),
  replaceStoryFactsForScenes: (...args) => mockReplaceStoryFactsForScenes(...args),
}));

vi.mock('@/services/ai', () => ({
  completeWithAi: vi.fn((opts) => {
    if (opts.systemPrompt?.includes('Extract structured facts') || opts.userPrompt?.includes('From this scene text')) {
      return Promise.resolve(JSON.stringify({
        characters: [{ name: 'Alice', trait: 'hero' }],
        locations: ['Village'],
        events: ['The quest began.'],
      }));
    }
    return Promise.resolve('No contradictions.');
  }),
  TIERS: { LIGHT: 'light' },
}));

const { extractFactsFromProse, updateStoryFactsFromScenes, checkConsistency } = await import('@/services/consistency.js');

describe('consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoryFacts.mockResolvedValue([]);
    mockGetCharacters.mockResolvedValue([]);
    mockGetScene.mockResolvedValue({ content: 'Scene text.', oneSentenceSummary: 'Summary.' });
    mockGetScenes.mockResolvedValue([]);
  });

  describe('extractFactsFromProse', () => {
    it('returns character, location, and event facts from AI response', async () => {
      const result = await extractFactsFromProse({
        sceneText: 'Alice left the village.',
        sceneId: 's1',
        chapterId: 'ch1',
        storyId: 'story1',
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.some((f) => f.factType === 'character' && f.content.includes('Alice'))).toBe(true);
      expect(result.some((f) => f.factType === 'location')).toBe(true);
      expect(result.some((f) => f.factType === 'event')).toBe(true);
      result.forEach((f) => {
        expect(f.sourceSceneId).toBe('s1');
        expect(f.sourceChapterId).toBe('ch1');
      });
    });

    it('returns empty array for empty scene text', async () => {
      const result = await extractFactsFromProse({
        sceneText: '',
        sceneId: 's1',
        storyId: 'story1',
      });
      expect(result).toEqual([]);
    });
  });

  describe('checkConsistency', () => {
    it('returns model reply with storyFacts and scene text in prompt', async () => {
      mockGetStoryFacts.mockResolvedValue([{ factType: 'character', content: 'Alice is the hero.' }]);
      mockGetCharacters.mockResolvedValue([{ name: 'Alice', oneSentence: 'Hero.' }]);
      mockGetScene.mockResolvedValue({ content: 'Alice fought the dragon.', oneSentenceSummary: 'Battle.' });
      const result = await checkConsistency({ storyId: 'story1', sceneId: 's1' });
      expect(result).toBe('No contradictions.');
    });
  });
});
