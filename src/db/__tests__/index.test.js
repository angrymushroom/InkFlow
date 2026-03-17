import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory table that mimics the Dexie table API used by db/index.js
// ---------------------------------------------------------------------------
class MockTable {
  constructor() {
    this._data = new Map();
  }

  _reset() { this._data.clear(); }

  async add(record) {
    this._data.set(record.id, { ...record });
    return record.id;
  }

  async put(record) {
    this._data.set(record.id, { ...record });
    return record.id;
  }

  async get(id) {
    return this._data.get(id);
  }

  async update(id, changes) {
    const existing = this._data.get(id);
    if (existing) this._data.set(id, { ...existing, ...changes });
    return existing ? 1 : 0;
  }

  async delete(id) { this._data.delete(id); }

  async clear() { this._data.clear(); }

  async toArray() { return [...this._data.values()]; }

  async count() { return this._data.size; }

  toCollection() {
    const d = this._data;
    return { first: async () => [...d.values()][0] };
  }

  orderBy(field) {
    const d = this._data;
    return {
      reverse: () => ({
        toArray: async () => [...d.values()].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0)),
      }),
      toArray: async () => [...d.values()].sort((a, b) => (a[field] ?? 0) - (b[field] ?? 0)),
    };
  }

  where(field) {
    const d = this._data;
    return {
      equals: (val) => ({
        toArray: async () => [...d.values()].filter((r) => r[field] === val),
        delete: async () => { for (const [k, v] of d) if (v[field] === val) d.delete(k); },
        primaryKeys: async () => [...d.values()].filter((r) => r[field] === val).map((r) => r.id),
        count: async () => [...d.values()].filter((r) => r[field] === val).length,
        sortBy: async (sf) =>
          [...d.values()].filter((r) => r[field] === val).sort((a, b) => (a[sf] > b[sf] ? 1 : -1)),
        modify: async (ch) => {
          for (const [k, v] of d) if (v[field] === val) d.set(k, { ...v, ...ch });
        },
        reverse: () => ({
          toArray: async () =>
            [...d.values()].filter((r) => r[field] === val).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
        }),
      }),
      anyOf: (vals) => ({
        toArray: async () => [...d.values()].filter((r) => vals.includes(r[field])),
        delete: async () => { for (const [k, v] of d) if (vals.includes(v[field])) d.delete(k); },
        primaryKeys: async () => [...d.values()].filter((r) => vals.includes(r[field])).map((r) => r.id),
      }),
    };
  }

  filter(fn) {
    const d = this._data;
    return {
      delete: async () => { for (const [k, v] of d) if (fn(v)) d.delete(k); },
      modify: async (ch) => { for (const [k, v] of d) if (fn(v)) d.set(k, { ...v, ...ch }); },
      toArray: async () => [...d.values()].filter(fn),
    };
  }
}

// ---------------------------------------------------------------------------
// Mock Dexie — use real MockTable instances so CRUD functions actually work
// ---------------------------------------------------------------------------
vi.mock('dexie', () => ({
  default: class MockDexie {
    constructor() {
      this.story = new MockTable();
      this.stories = new MockTable();
      this.ideas = new MockTable();
      this.characters = new MockTable();
      this.chapters = new MockTable();
      this.scenes = new MockTable();
      this.idea_custom_types = new MockTable();
      this.story_facts = new MockTable();
      this.character_relationships = new MockTable();
      this.transaction = vi.fn((_mode, _stores, fn) =>
        typeof fn === 'function' ? fn() : Promise.resolve()
      );
    }
    version() {
      return { stores: () => ({ upgrade: () => {} }) };
    }
  },
}));

// Seed localStorage so getCurrentStoryId() returns a deterministic value
localStorage.setItem('inkflow_current_story_id', 'story');

const {
  db,
  validateImportData,
  saveStory,
  createStory,
  addCharacter,
  deleteCharacter,
  deleteStory,
  addScene,
  addChapter,
  getScenes,
  getCharacterRelationships,
  addCharacterRelationship,
  updateCharacterRelationship,
  deleteCharacterRelationship,
  addCustomIdeaType,
  deleteCustomIdeaType,
  renameCustomIdeaType,
  getCustomIdeaTypes,
  exportProject,
  importProject,
} = await import('@/db/index.js');

// Helper to reset all tables between tests
function resetAllTables() {
  for (const key of [
    'story', 'stories', 'ideas', 'characters', 'chapters',
    'scenes', 'idea_custom_types', 'story_facts', 'character_relationships',
  ]) {
    db[key]._reset();
  }
}

// ---------------------------------------------------------------------------
// validateImportData
// ---------------------------------------------------------------------------
describe('validateImportData', () => {
  it('throws IMPORT_VALIDATION for null', () => {
    expect(() => validateImportData(null)).toThrow();
    try { validateImportData(null); } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });

  it('throws IMPORT_VALIDATION for non-object (array)', () => {
    expect(() => validateImportData([])).toThrow();
    try { validateImportData([]); } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });

  it('throws IMPORT_VALIDATION for empty object', () => {
    try { validateImportData({}); } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });

  it('throws IMPORT_VALIDATION when ideas is not an array', () => {
    try {
      validateImportData({ version: 2, stories: [], ideas: 'not-array', characters: [], chapters: [], scenes: [] });
    } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });

  it('throws IMPORT_VALIDATION when characters is not an array', () => {
    try {
      validateImportData({ version: 2, stories: [], ideas: [], characters: null, chapters: [], scenes: [] });
    } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });

  it('accepts valid v2 structure', () => {
    expect(() =>
      validateImportData({
        version: 2,
        stories: [{ id: 'story', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 0, createdAt: 0 }],
        ideas: [], characters: [], chapters: [], scenes: [],
      })
    ).not.toThrow();
  });

  it('accepts valid legacy structure', () => {
    expect(() =>
      validateImportData({ story: { id: 'story' }, ideas: [], characters: [], chapters: [], scenes: [] })
    ).not.toThrow();
  });

  it('accepts valid v4 structure with storyFacts', () => {
    expect(() =>
      validateImportData({
        version: 4,
        stories: [{ id: 'story', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 0, createdAt: 0 }],
        ideas: [], characters: [], chapters: [], scenes: [], ideaCustomTypes: [], storyFacts: [],
      })
    ).not.toThrow();
  });

  it('throws IMPORT_VALIDATION when storyFacts is not an array', () => {
    try {
      validateImportData({ version: 4, stories: [], ideas: [], characters: [], chapters: [], scenes: [], storyFacts: 'not-array' });
    } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });

  // v5 — characterRelationships
  it('accepts valid v5 structure with characterRelationships', () => {
    expect(() =>
      validateImportData({
        version: 5,
        stories: [{ id: 'story', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 0, createdAt: 0 }],
        ideas: [], characters: [], chapters: [], scenes: [],
        ideaCustomTypes: [], storyFacts: [], characterRelationships: [],
      })
    ).not.toThrow();
  });

  it('throws IMPORT_VALIDATION when characterRelationships is not an array', () => {
    try {
      validateImportData({
        version: 5, stories: [], ideas: [], characters: [], chapters: [], scenes: [],
        characterRelationships: 'bad',
      });
    } catch (e) { expect(e.code).toBe('IMPORT_VALIDATION'); }
  });
});

// ---------------------------------------------------------------------------
// saveStory — dynamic merge
// ---------------------------------------------------------------------------
describe('saveStory', () => {
  beforeEach(resetAllTables);

  it('creates a new story with core fields defaulted to empty string', async () => {
    const result = await saveStory({ id: 'story' });
    expect(result.id).toBe('story');
    expect(result.oneSentence).toBe('');
    expect(result.setup).toBe('');
    expect(result.ending).toBe('');
  });

  it('persists provided core fields', async () => {
    const result = await saveStory({ id: 'story', oneSentence: 'A hero rises.', ending: 'Peace.' });
    expect(result.oneSentence).toBe('A hero rises.');
    expect(result.ending).toBe('Peace.');
  });

  it('preserves extra fields not in the original whitelist (e.g. title)', async () => {
    const result = await saveStory({ id: 'story', title: 'My Novel', oneSentence: 'Hero.' });
    expect(result.title).toBe('My Novel');
    const saved = await db.stories.get('story');
    expect(saved.title).toBe('My Novel');
  });

  it('merges with existing record without wiping unreferenced fields', async () => {
    await saveStory({ id: 'story', oneSentence: 'Hero.', title: 'First Title' });
    // Update only oneSentence — title should survive
    const result = await saveStory({ id: 'story', oneSentence: 'Updated hero.' });
    expect(result.title).toBe('First Title');
    expect(result.oneSentence).toBe('Updated hero.');
  });

  it('preserves createdAt from original record on subsequent saves', async () => {
    const first = await saveStory({ id: 'story' });
    const second = await saveStory({ id: 'story', oneSentence: 'Changed.' });
    expect(second.createdAt).toBe(first.createdAt);
  });

  it('always updates updatedAt', async () => {
    const first = await saveStory({ id: 'story' });
    await new Promise((r) => setTimeout(r, 2));
    const second = await saveStory({ id: 'story' });
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
  });
});

// ---------------------------------------------------------------------------
// createStory
// ---------------------------------------------------------------------------
describe('createStory', () => {
  beforeEach(resetAllTables);

  it('creates a story with default core fields', async () => {
    const story = await createStory();
    expect(typeof story.id).toBe('string');
    expect(story.oneSentence).toBe('');
    expect(story.ending).toBe('');
  });

  it('accepts overrides including extra fields', async () => {
    const story = await createStory({ oneSentence: 'A tale.', title: 'My Book' });
    expect(story.oneSentence).toBe('A tale.');
    expect(story.title).toBe('My Book');
  });

  it('overrides cannot change id or timestamps provided via override (they are locked)', async () => {
    const story = await createStory({ oneSentence: 'X.' });
    expect(typeof story.id).toBe('string');
    expect(typeof story.createdAt).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Character relationship CRUD
// ---------------------------------------------------------------------------
describe('character relationships', () => {
  beforeEach(resetAllTables);

  it('addCharacterRelationship creates a record', async () => {
    const rel = await addCharacterRelationship({
      storyId: 'story',
      fromCharId: 'c1',
      toCharId: 'c2',
      label: 'rivals',
      description: 'They compete.',
    });
    expect(rel.id).toBeTruthy();
    expect(rel.fromCharId).toBe('c1');
    expect(rel.toCharId).toBe('c2');
    expect(rel.label).toBe('rivals');
    expect(rel.storyId).toBe('story');
  });

  it('getCharacterRelationships returns all rels for a story', async () => {
    await addCharacterRelationship({ storyId: 'story', fromCharId: 'c1', toCharId: 'c2', label: 'friends' });
    await addCharacterRelationship({ storyId: 'story', fromCharId: 'c2', toCharId: 'c3', label: 'enemies' });
    await addCharacterRelationship({ storyId: 'other', fromCharId: 'cx', toCharId: 'cy', label: 'unrelated' });
    const rels = await getCharacterRelationships('story');
    expect(rels).toHaveLength(2);
    expect(rels.every((r) => r.storyId === 'story')).toBe(true);
  });

  it('updateCharacterRelationship updates label and description', async () => {
    const rel = await addCharacterRelationship({ storyId: 'story', fromCharId: 'c1', toCharId: 'c2', label: 'friends' });
    await updateCharacterRelationship(rel.id, { label: 'enemies' });
    const updated = await db.character_relationships.get(rel.id);
    expect(updated.label).toBe('enemies');
    expect(updated.updatedAt).toBeTruthy();
  });

  it('deleteCharacterRelationship removes the record', async () => {
    const rel = await addCharacterRelationship({ storyId: 'story', fromCharId: 'c1', toCharId: 'c2', label: 'x' });
    await deleteCharacterRelationship(rel.id);
    const gone = await db.character_relationships.get(rel.id);
    expect(gone).toBeUndefined();
  });

  it('label defaults to empty string when not provided', async () => {
    const rel = await addCharacterRelationship({ storyId: 'story', fromCharId: 'c1', toCharId: 'c2' });
    expect(rel.label).toBe('');
    expect(rel.description).toBe('');
  });
});

// ---------------------------------------------------------------------------
// deleteCharacter cascade
// ---------------------------------------------------------------------------
describe('deleteCharacter cascade', () => {
  beforeEach(resetAllTables);

  it('nullifies povCharacterId in scenes that reference the deleted character', async () => {
    const char = await addCharacter({ storyId: 'story', name: 'Alice' });
    // second character for unrelated POV
    await db.scenes.add({ id: 's1', chapterId: 'ch1', order: 0, povCharacterId: char.id, createdAt: Date.now() });
    await db.scenes.add({ id: 's2', chapterId: 'ch1', order: 1, povCharacterId: 'other-char', createdAt: Date.now() });
    await deleteCharacter(char.id);
    const s1 = await db.scenes.get('s1');
    const s2 = await db.scenes.get('s2');
    expect(s1.povCharacterId).toBeNull();
    expect(s2.povCharacterId).toBe('other-char'); // untouched
  });

  it('deletes all character_relationships involving the deleted character', async () => {
    const char = await addCharacter({ storyId: 'story', name: 'Alice' });
    await addCharacterRelationship({ storyId: 'story', fromCharId: char.id, toCharId: 'c2', label: 'a' });
    await addCharacterRelationship({ storyId: 'story', fromCharId: 'c3', toCharId: char.id, label: 'b' });
    await addCharacterRelationship({ storyId: 'story', fromCharId: 'c2', toCharId: 'c3', label: 'c' }); // unrelated
    await deleteCharacter(char.id);
    const rels = await db.character_relationships.toArray();
    expect(rels).toHaveLength(1);
    expect(rels[0].label).toBe('c');
  });

  it('deletes the character record itself', async () => {
    const char = await addCharacter({ storyId: 'story', name: 'Bob' });
    await deleteCharacter(char.id);
    const gone = await db.characters.get(char.id);
    expect(gone).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deleteStory cascade — character_relationships
// ---------------------------------------------------------------------------
describe('deleteStory cascade', () => {
  beforeEach(resetAllTables);

  it('deletes character_relationships belonging to the deleted story', async () => {
    await db.stories.add({ id: 's1', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 1, createdAt: 1 });
    await db.stories.add({ id: 's2', oneSentence: '', setup: '', disaster1: '', disaster2: '', disaster3: '', ending: '', updatedAt: 2, createdAt: 2 });
    await addCharacterRelationship({ storyId: 's1', fromCharId: 'c1', toCharId: 'c2', label: 'x' });
    await addCharacterRelationship({ storyId: 's1', fromCharId: 'c3', toCharId: 'c4', label: 'y' });
    await addCharacterRelationship({ storyId: 's2', fromCharId: 'cx', toCharId: 'cy', label: 'z' }); // keep
    await deleteStory('s1');
    const rels = await db.character_relationships.toArray();
    expect(rels).toHaveLength(1);
    expect(rels[0].storyId).toBe('s2');
  });
});

// ---------------------------------------------------------------------------
// getScenes — sorted by chapter.order then scene.order (not chapterId UUID)
// ---------------------------------------------------------------------------
describe('getScenes sort order', () => {
  beforeEach(resetAllTables);

  it('returns scenes in chapter.order then scene.order sequence', async () => {
    // Chapter with order:1 created first, then chapter with order:0
    await db.chapters.add({ id: 'ch-late', storyId: 'story', order: 1, createdAt: 1 });
    await db.chapters.add({ id: 'ch-early', storyId: 'story', order: 0, createdAt: 2 });
    await db.scenes.add({ id: 's1', chapterId: 'ch-late', order: 0, createdAt: 1 });
    await db.scenes.add({ id: 's2', chapterId: 'ch-early', order: 0, createdAt: 2 });
    const scenes = await getScenes('story');
    expect(scenes[0].id).toBe('s2'); // ch-early (order:0) comes before ch-late (order:1)
    expect(scenes[1].id).toBe('s1');
  });

  it('sorts scenes within same chapter by scene.order', async () => {
    await db.chapters.add({ id: 'ch1', storyId: 'story', order: 0, createdAt: 1 });
    await db.scenes.add({ id: 's-b', chapterId: 'ch1', order: 1, createdAt: 1 });
    await db.scenes.add({ id: 's-a', chapterId: 'ch1', order: 0, createdAt: 2 });
    const scenes = await getScenes('story');
    expect(scenes[0].id).toBe('s-a');
    expect(scenes[1].id).toBe('s-b');
  });

  it('returns empty array when story has no chapters', async () => {
    const scenes = await getScenes('story');
    expect(scenes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Custom idea type management — delete and rename
// ---------------------------------------------------------------------------
describe('custom idea type management', () => {
  beforeEach(resetAllTables);

  it('deleteCustomIdeaType removes the record', async () => {
    const type = await addCustomIdeaType('Fantasy Elements');
    await deleteCustomIdeaType(type.id);
    const types = await getCustomIdeaTypes();
    expect(types.find((t) => t.id === type.id)).toBeUndefined();
  });

  it('deleteCustomIdeaType does not affect other types', async () => {
    const a = await addCustomIdeaType('Alpha');
    const b = await addCustomIdeaType('Beta');
    await deleteCustomIdeaType(a.id);
    const types = await getCustomIdeaTypes();
    expect(types).toHaveLength(1);
    expect(types[0].id).toBe(b.id);
  });

  it('renameCustomIdeaType updates the name', async () => {
    const type = await addCustomIdeaType('Old Name');
    await renameCustomIdeaType(type.id, 'New Name');
    const types = await getCustomIdeaTypes();
    const updated = types.find((t) => t.id === type.id);
    expect(updated.name).toBe('New Name');
  });

  it('renameCustomIdeaType trims whitespace', async () => {
    const type = await addCustomIdeaType('Trim Me');
    await renameCustomIdeaType(type.id, '  Trimmed  ');
    const types = await getCustomIdeaTypes();
    expect(types.find((t) => t.id === type.id).name).toBe('Trimmed');
  });

  it('renameCustomIdeaType ignores empty name', async () => {
    const type = await addCustomIdeaType('Keep Me');
    await renameCustomIdeaType(type.id, '   ');
    const types = await getCustomIdeaTypes();
    // name should be unchanged (empty rename is a no-op)
    expect(types.find((t) => t.id === type.id).name).toBe('Keep Me');
  });
});

// ---------------------------------------------------------------------------
// exportProject — version 5 and characterRelationships included
// ---------------------------------------------------------------------------
describe('exportProject', () => {
  beforeEach(resetAllTables);

  it('exports version 5', async () => {
    const data = await exportProject();
    expect(data.version).toBe(5);
  });

  it('includes characterRelationships in export', async () => {
    await addCharacterRelationship({ storyId: 'story', fromCharId: 'c1', toCharId: 'c2', label: 'allies' });
    const data = await exportProject();
    expect(Array.isArray(data.characterRelationships)).toBe(true);
    expect(data.characterRelationships).toHaveLength(1);
    expect(data.characterRelationships[0].label).toBe('allies');
  });

  it('includes exportedAt timestamp', async () => {
    const data = await exportProject();
    expect(typeof data.exportedAt).toBe('string');
  });
});
