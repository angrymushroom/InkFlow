import { vi, describe, it, expect } from 'vitest';

// Mock Dexie so db module can load without IndexedDB
vi.mock('dexie', () => ({
  default: class MockDexie {
    constructor() {
      this.stories = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []) };
      this.ideas = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []) };
      this.characters = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []) };
      this.chapters = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []) };
      this.scenes = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []) };
      this.idea_custom_types = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []) };
      const chain = () => ({ equals: () => ({ sortBy: () => Promise.resolve([]), delete: () => Promise.resolve() }) });
      this.story_facts = { clear: vi.fn(), add: vi.fn(), toArray: vi.fn(() => []), where: vi.fn(chain) };
      this.transaction = vi.fn((_mode, _stores, fn) => (typeof fn === 'function' ? fn() : Promise.resolve()));
    }
    version() {
      return { stores: () => ({ upgrade: () => {} }) };
    }
  },
}));

const { validateImportData } = await import('@/db/index.js');

describe('validateImportData', () => {
  it('throws IMPORT_VALIDATION for null', () => {
    expect(() => validateImportData(null)).toThrow();
    try {
      validateImportData(null);
    } catch (e) {
      expect(e.code).toBe('IMPORT_VALIDATION');
    }
  });

  it('throws IMPORT_VALIDATION for non-object', () => {
    expect(() => validateImportData([])).toThrow();
    try {
      validateImportData([]);
    } catch (e) {
      expect(e.code).toBe('IMPORT_VALIDATION');
    }
  });

  it('throws IMPORT_VALIDATION for empty object', () => {
    try {
      validateImportData({});
    } catch (e) {
      expect(e.code).toBe('IMPORT_VALIDATION');
    }
  });

  it('throws IMPORT_VALIDATION when ideas is not an array', () => {
    try {
      validateImportData({ version: 2, stories: [], ideas: 'not-array', characters: [], chapters: [], scenes: [] });
    } catch (e) {
      expect(e.code).toBe('IMPORT_VALIDATION');
    }
  });

  it('throws IMPORT_VALIDATION when characters is not an array', () => {
    try {
      validateImportData({ version: 2, stories: [], ideas: [], characters: null, chapters: [], scenes: [] });
    } catch (e) {
      expect(e.code).toBe('IMPORT_VALIDATION');
    }
  });

  it('accepts valid v2 structure', () => {
    expect(() =>
      validateImportData({
        version: 2,
        stories: [{ id: 'story', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 0, createdAt: 0 }],
        ideas: [],
        characters: [],
        chapters: [],
        scenes: [],
      })
    ).not.toThrow();
  });

  it('accepts valid legacy structure', () => {
    expect(() =>
      validateImportData({
        story: { id: 'story' },
        ideas: [],
        characters: [],
        chapters: [],
        scenes: [],
      })
    ).not.toThrow();
  });

  it('accepts valid v4 structure with storyFacts', () => {
    expect(() =>
      validateImportData({
        version: 4,
        stories: [{ id: 'story', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 0, createdAt: 0 }],
        ideas: [],
        characters: [],
        chapters: [],
        scenes: [],
        ideaCustomTypes: [],
        storyFacts: [],
      })
    ).not.toThrow();
  });

  it('throws IMPORT_VALIDATION when storyFacts is not an array', () => {
    try {
      validateImportData({
        version: 4,
        stories: [],
        ideas: [],
        characters: [],
        chapters: [],
        scenes: [],
        storyFacts: 'not-array',
      });
    } catch (e) {
      expect(e.code).toBe('IMPORT_VALIDATION');
    }
  });
});
