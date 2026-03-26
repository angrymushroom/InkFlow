import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockUpdateScene = vi.fn(() => Promise.resolve());
const mockGetStoryById = vi.fn();
const mockGetCharacters = vi.fn();
const mockGetIdeas = vi.fn();
const mockGetChapters = vi.fn();
const mockGetScenes = vi.fn();
const mockGetStoryFacts = vi.fn(() => Promise.resolve([]));
const mockGetOpenThreads = vi.fn(() => Promise.resolve([]));
const mockGetCharacterStateMap = vi.fn(() => Promise.resolve(new Map()));

vi.mock('@/db', () => ({
  getStoryById: (...args) => mockGetStoryById(...args),
  getCharacters: (...args) => mockGetCharacters(...args),
  getIdeas: (...args) => mockGetIdeas(...args),
  getChapters: (...args) => mockGetChapters(...args),
  getScenes: (...args) => mockGetScenes(...args),
  getStoryFacts: (...args) => mockGetStoryFacts(...args),
  getOpenThreads: (...args) => mockGetOpenThreads(...args),
  getCharacterStateMap: (...args) => mockGetCharacterStateMap(...args),
  updateScene: (...args) => mockUpdateScene(...args),
}));

vi.mock('@/services/ai', () => ({
  completeWithAi: vi.fn(() => Promise.resolve('Generated scene prose.')),
  TIERS: { LIGHT: 'light', ADVANCED: 'advanced' },
  CONTEXTS: { CONSISTENCY: 'consistency', CHAT: 'chat', SCENE_PROSE: 'scene_prose', EXPAND_SHORT: 'expand_short', OUTLINE_DRAFT_FULL: 'outline_draft_full', OUTLINE_DRAFT_SECTION: 'outline_draft_section', CHAT_WITH_TOOLS: 'chat_with_tools' },
  tierForContext: vi.fn(() => 'light'),
}));

const { buildSceneContext, generateSceneProse, generateFromScene } = await import('@/services/generation.js');

describe('generation', () => {
  const storyId = 'story-1';
  const sceneId = 'scene-2';
  const story = {
    id: storyId,
    oneSentence: 'A hero saves the village.',
    setup: 'The village is threatened.',
    disaster1: '',
    disaster2: '',
    disaster3: '',
    ending: 'Peace returns.',
  };
  const characters = [{ id: 'c1', name: 'Alice', oneSentence: 'The hero.' }];
  const ideas = [{ id: 'i1', type: 'theme', title: 'Courage', body: 'Stand up.' }];
  const chapters = [{ id: 'ch1', storyId, order: 0 }];
  const scenes = [
    { id: 'scene-1', chapterId: 'ch1', order: 0, title: 'Opening', content: 'First scene text.', oneSentenceSummary: 'Start.' },
    { id: sceneId, chapterId: 'ch1', order: 1, title: 'Scene Two', oneSentenceSummary: 'The conflict.', notes: 'Use POV Alice.' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoryById.mockResolvedValue(story);
    mockGetCharacters.mockResolvedValue(characters);
    mockGetIdeas.mockResolvedValue(ideas);
    mockGetChapters.mockResolvedValue(chapters);
    mockGetScenes.mockResolvedValue(scenes);
    mockGetStoryFacts.mockResolvedValue([]);
    mockGetOpenThreads.mockResolvedValue([]);
    mockGetCharacterStateMap.mockResolvedValue(new Map());
  });

  describe('buildSceneContext', () => {
    it('returns a string containing story spine and character names', async () => {
      const ctx = await buildSceneContext(storyId, sceneId);
      expect(typeof ctx).toBe('string');
      expect(ctx).toContain('A hero saves the village.');
      expect(ctx).toContain('Alice');
      expect(ctx).toContain('Courage');
      expect(ctx).toContain('Scene Two');
      expect(ctx).toContain('The conflict.');
      expect(ctx).toContain('Last lines of previous scene');
      expect(ctx).toContain('First scene text.');
    });

    it('throws if story not found', async () => {
      mockGetStoryById.mockResolvedValue(null);
      await expect(buildSceneContext(storyId, sceneId)).rejects.toThrow('Story not found');
    });

    it('throws if scene not in story', async () => {
      mockGetScenes.mockResolvedValue(scenes.filter((s) => s.id !== sceneId));
      await expect(buildSceneContext(storyId, sceneId)).rejects.toThrow('Scene not found');
    });

    it('includes Establish facts when story_facts exist', async () => {
      mockGetStoryFacts.mockResolvedValue([
        { factType: 'character', content: 'Alice is the hero.' },
        { factType: 'location', content: 'Village.' },
      ]);
      const ctx = await buildSceneContext(storyId, sceneId);
      expect(ctx).toContain('Established facts');
      expect(ctx).toContain('Alice is the hero.');
      expect(ctx).toContain('Village.');
    });
  });

  describe('generateSceneProse', () => {
    it('calls updateScene with generated content', async () => {
      const result = await generateSceneProse({ storyId, sceneId });
      expect(result).toBe('Generated scene prose.');
      expect(mockUpdateScene).toHaveBeenCalledWith(sceneId, { content: 'Generated scene prose.' });
    });
  });

  describe('generateFromScene', () => {
    it('generates from given scene to end and returns count', async () => {
      mockUpdateScene.mockClear();
      const result = await generateFromScene(storyId, sceneId);
      expect(result.generated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockUpdateScene).toHaveBeenCalledTimes(1);
      expect(mockUpdateScene).toHaveBeenCalledWith(sceneId, { content: 'Generated scene prose.' });
    });
  });
});
