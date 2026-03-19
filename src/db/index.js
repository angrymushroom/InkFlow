import Dexie from "dexie";

export const db = new Dexie("InkFlow");

const CURRENT_STORY_KEY = "inkflow_current_story_id";

db.version(1).stores({
  story: "id, updatedAt",
  ideas: "id, type, createdAt",
  characters: "id, createdAt",
  chapters: "id, order, createdAt",
  scenes: "id, chapterId, order, createdAt",
});

db.version(2)
  .stores({
    story: "id, updatedAt",
    stories: "id, updatedAt, createdAt",
    ideas: "id, storyId, type, createdAt",
    characters: "id, storyId, createdAt",
    chapters: "id, storyId, order, createdAt",
    scenes: "id, chapterId, order, createdAt",
  })
  .upgrade(async (tx) => {
    const legacyStory = await tx.table("story").toCollection().first();
    const defaultStoryId = legacyStory ? (legacyStory.id || "story") : "story";
    const now = Date.now();
    const storyPayload = legacyStory
      ? {
          id: legacyStory.id || "story",
          oneSentence: legacyStory.oneSentence ?? "",
          setup: legacyStory.setup ?? "",
          disaster1: legacyStory.disaster1 ?? "",
          disaster2: legacyStory.disaster2 ?? "",
          disaster3: legacyStory.disaster3 ?? "",
          ending: legacyStory.ending ?? "",
          updatedAt: legacyStory.updatedAt ?? now,
          createdAt: legacyStory.createdAt ?? now,
        }
      : {
          id: "story",
          oneSentence: "",
          setup: "",
          disaster1: "",
          disaster2: "",
          disaster3: "",
          ending: "",
          updatedAt: now,
          createdAt: now,
        };
    await tx.table("stories").put(storyPayload);
    await tx.table("ideas").toCollection().modify((r) => {
      if (r.storyId == null) r.storyId = defaultStoryId;
    });
    await tx.table("characters").toCollection().modify((r) => {
      if (r.storyId == null) r.storyId = defaultStoryId;
    });
    await tx.table("chapters").toCollection().modify((r) => {
      if (r.storyId == null) r.storyId = defaultStoryId;
    });
    if (!localStorage.getItem(CURRENT_STORY_KEY)) {
      localStorage.setItem(CURRENT_STORY_KEY, defaultStoryId);
    }
  });

db.version(3).stores({
  story: "id, updatedAt",
  stories: "id, updatedAt, createdAt",
  ideas: "id, storyId, type, createdAt",
  characters: "id, storyId, createdAt",
  chapters: "id, storyId, order, createdAt",
  scenes: "id, chapterId, order, createdAt",
  idea_custom_types: "id, createdAt",
});

db.version(4).stores({
  story: "id, updatedAt",
  stories: "id, updatedAt, createdAt",
  ideas: "id, storyId, type, createdAt",
  characters: "id, storyId, createdAt",
  chapters: "id, storyId, order, createdAt",
  scenes: "id, chapterId, order, createdAt",
  idea_custom_types: "id, createdAt",
  story_facts: "id, storyId, factType, createdAt",
});

db.version(5).stores({
  story: "id, updatedAt",
  stories: "id, updatedAt, createdAt",
  ideas: "id, storyId, type, createdAt",
  characters: "id, storyId, createdAt",
  chapters: "id, storyId, order, createdAt",
  scenes: "id, chapterId, order, createdAt",
  idea_custom_types: "id, createdAt",
  story_facts: "id, storyId, factType, createdAt",
  character_relationships: "id, storyId, fromCharId, toCharId, createdAt",
});

function createStorageError(message, cause) {
  const err = new Error(message);
  err.code = "STORAGE_ERROR";
  err.cause = cause;
  return err;
}

function createImportValidationError(message) {
  const err = new Error(message);
  err.code = "IMPORT_VALIDATION";
  return err;
}

// Current story (project) selection
export function getCurrentStoryId() {
  return localStorage.getItem(CURRENT_STORY_KEY) || "story";
}

export function setCurrentStoryId(id) {
  localStorage.setItem(CURRENT_STORY_KEY, id || "story");
}

// Stories (multi-project)
export async function getStories() {
  try {
    const list = await db.stories.orderBy("updatedAt").reverse().toArray();
    if (list.length === 0) {
      const now = Date.now();
      const defaultStory = {
        id: "story",
        oneSentence: "",
        setup: "",
        disaster1: "",
        disaster2: "",
        disaster3: "",
        ending: "",
        updatedAt: now,
        createdAt: now,
      };
      await db.stories.add(defaultStory);
      setCurrentStoryId("story");
      return [defaultStory];
    }
    return list;
  } catch (e) {
    throw createStorageError(
      "Could not load stories. If you're in private browsing or out of space, try another browser or window.",
      e
    );
  }
}

export async function getStoryById(id) {
  return db.stories.get(id);
}

export async function getStory() {
  try {
    const id = getCurrentStoryId();
    let row = await db.stories.get(id);
    if (!row && id === "story") {
      const legacy = await db.story.toCollection().first();
      if (legacy) {
        const now = Date.now();
        row = {
          id: legacy.id || "story",
          oneSentence: legacy.oneSentence ?? "",
          setup: legacy.setup ?? "",
          disaster1: legacy.disaster1 ?? "",
          disaster2: legacy.disaster2 ?? "",
          disaster3: legacy.disaster3 ?? "",
          ending: legacy.ending ?? "",
          updatedAt: legacy.updatedAt ?? now,
          createdAt: legacy.createdAt ?? now,
        };
        await db.stories.put(row);
      }
    }
    if (!row) {
      const list = await getStories();
      const first = list[0];
      if (first) setCurrentStoryId(first.id);
      return first || null;
    }
    return row;
  } catch (e) {
    throw createStorageError(
      "Could not load your project. If you're in private browsing or out of space, try another browser or window.",
      e
    );
  }
}

// Snowflake Method core fields — always present, default to empty string
const STORY_CORE_FIELDS = ["oneSentence", "setup", "disaster1", "disaster2", "disaster3", "ending"];

export async function saveStory(data) {
  try {
    const id = data.id || getCurrentStoryId() || "story";
    const updatedAt = Date.now();
    const existing = await db.stories.get(id);
    // Merge: existing record first, then incoming data, then lock system fields.
    // This preserves any extra story fields (e.g. title, discoveryPhase) without a whitelist.
    const payload = {
      ...(existing || {}),
      ...data,
      id,
      updatedAt,
      createdAt: existing?.createdAt ?? updatedAt,
    };
    for (const f of STORY_CORE_FIELDS) {
      if (payload[f] == null) payload[f] = "";
    }
    await db.stories.put(payload);
    return payload;
  } catch (e) {
    throw createStorageError(
      "Could not save. If you're in private browsing or out of space, try downloading a backup and using a normal window.",
      e
    );
  }
}

export async function createStory(overrides = {}) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const story = {
    oneSentence: "",
    setup: "",
    disaster1: "",
    disaster2: "",
    disaster3: "",
    ending: "",
    ...overrides,
    id,
    updatedAt: now,
    createdAt: now,
  };
  await db.stories.add(story);
  return story;
}

/**
 * Permanently deletes a story and all its ideas, characters, chapters, and scenes.
 * If the deleted story was the current one, sets current story to another and returns its id.
 * @param {string} id - Story id to delete
 * @returns {Promise<{ switchedToId: string | null }>} - switchedToId when current was deleted and another story exists
 */
export async function deleteStory(id) {
  const chapterIds = await db.chapters.where("storyId").equals(id).primaryKeys();
  if (chapterIds.length > 0) {
    await db.scenes.where("chapterId").anyOf(chapterIds).delete();
  }
  await db.chapters.where("storyId").equals(id).delete();
  await db.ideas.where("storyId").equals(id).delete();
  await db.characters.where("storyId").equals(id).delete();
  if (db.story_facts) await db.story_facts.where("storyId").equals(id).delete();
  if (db.character_relationships) await db.character_relationships.where("storyId").equals(id).delete();
  await db.stories.delete(id);

  let switchedToId = null;
  if (id === getCurrentStoryId()) {
    const remaining = await db.stories.orderBy("updatedAt").reverse().toArray();
    if (remaining.length > 0) {
      setCurrentStoryId(remaining[0].id);
      switchedToId = remaining[0].id;
    }
  }
  return { switchedToId };
}

// Ideas (scoped by current story)
export async function getIdeas(storyId) {
  const sid = storyId ?? getCurrentStoryId();
  const list = await db.ideas.where("storyId").equals(sid).toArray();
  return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function addIdea(idea) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const storyId = idea.storyId ?? getCurrentStoryId();
  const record = { ...idea, id, storyId, createdAt };
  await db.ideas.add(record);
  return record;
}

export async function updateIdea(id, data) {
  await db.ideas.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteIdea(id) {
  await db.ideas.delete(id);
}

// Idea custom types (user-defined type names for ideas dropdown)
export async function getCustomIdeaTypes() {
  try {
    return db.idea_custom_types.orderBy("createdAt").toArray();
  } catch (_) {
    return [];
  }
}

export async function addCustomIdeaType(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.idea_custom_types.add({ id, name: trimmed, createdAt });
  return { id, name: trimmed, createdAt };
}

export async function deleteCustomIdeaType(id) {
  await db.idea_custom_types.delete(id);
}

export async function renameCustomIdeaType(id, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  await db.idea_custom_types.update(id, { name: trimmed, updatedAt: Date.now() });
}

// Characters (scoped by current story)
export async function getCharacters(storyId) {
  const sid = storyId ?? getCurrentStoryId();
  return db.characters.where("storyId").equals(sid).sortBy("createdAt");
}

export async function addCharacter(char) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const storyId = char.storyId ?? getCurrentStoryId();
  const record = { ...char, id, storyId, createdAt };
  await db.characters.add(record);
  return record;
}

export async function updateCharacter(id, data) {
  await db.characters.update(id, { ...data, updatedAt: Date.now() });
}



export async function deleteCharacter(id) {
  // Nullify POV references in scenes so they don't hold orphaned character ids
  await db.scenes.filter((s) => s.povCharacterId === id).modify({ povCharacterId: null });
  // Delete all relationships involving this character
  if (db.character_relationships) {
    await db.character_relationships
      .filter((r) => r.fromCharId === id || r.toCharId === id)
      .delete();
  }
  await db.characters.delete(id);
}

// Character relationships (explicit edges between characters within a story)
export async function getCharacterRelationships(storyId) {
  const sid = storyId ?? getCurrentStoryId();
  return db.character_relationships.where("storyId").equals(sid).toArray();
}

export async function addCharacterRelationship(rel) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const storyId = rel.storyId ?? getCurrentStoryId();
  const record = {
    id,
    storyId,
    fromCharId: rel.fromCharId,
    toCharId: rel.toCharId,
    label: rel.label ?? "",
    description: rel.description ?? "",
    createdAt,
  };
  await db.character_relationships.add(record);
  return record;
}

export async function updateCharacterRelationship(id, data) {
  await db.character_relationships.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteCharacterRelationship(id) {
  await db.character_relationships.delete(id);
}

// Chapters (scoped by current story)
export async function getChapters(storyId) {
  const sid = storyId ?? getCurrentStoryId();
  return db.chapters.where("storyId").equals(sid).sortBy("order");
}

export async function addChapter(chapter) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const storyId = chapter.storyId ?? getCurrentStoryId();
  const count = await db.chapters.where("storyId").equals(storyId).count();
  const order = chapter.order ?? count;
  const record = { ...chapter, id, storyId, order, createdAt };
  await db.chapters.add(record);
  return record;
}

export async function updateChapter(id, data) {
  await db.chapters.update(id, { ...data, updatedAt: Date.now() });
}

/**
 * Update chapter order for the whole story. chapterIdsInOrder is the full list of chapter ids in desired order.
 */
export async function reorderChapters(storyId, chapterIdsInOrder) {
  for (let i = 0; i < chapterIdsInOrder.length; i++) {
    await db.chapters.update(chapterIdsInOrder[i], { order: i, updatedAt: Date.now() });
  }
}

export async function deleteChapter(id) {
  await db.scenes.where("chapterId").equals(id).delete();
  await db.chapters.delete(id);
}

// Scenes (when storyId given, only scenes whose chapter belongs to that story)
export async function getScenes(storyId) {
  if (storyId != null) {
    // Fetch chapters with their order so we can sort scenes correctly.
    // Sorting by chapterId (UUID string) is wrong — it must follow chapter.order.
    const chapters = await db.chapters.where("storyId").equals(storyId).toArray();
    if (chapters.length === 0) return [];
    const chapterOrderMap = new Map(chapters.map((ch) => [ch.id, ch.order ?? 0]));
    const chapterIds = chapters.map((ch) => ch.id);
    const list = await db.scenes.where("chapterId").anyOf(chapterIds).toArray();
    return list.sort((a, b) => {
      const co = (chapterOrderMap.get(a.chapterId) ?? 0) - (chapterOrderMap.get(b.chapterId) ?? 0);
      return co !== 0 ? co : (a.order ?? 0) - (b.order ?? 0);
    });
  }
  const list = await db.scenes.toArray();
  return list.sort((a, b) => {
    const c = (a.chapterId || "").localeCompare(b.chapterId || "");
    return c !== 0 ? c : (a.order ?? 0) - (b.order ?? 0);
  });
}

export async function getScene(id) {
  return db.scenes.get(id);
}

export async function getScenesByChapter(chapterId) {
  return db.scenes.where("chapterId").equals(chapterId).sortBy("order");
}

export async function addScene(scene) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const order =
    scene.order ??
    (await db.scenes.where("chapterId").equals(scene.chapterId).count());
  const record = { ...scene, id, order, createdAt };
  await db.scenes.add(record);
  return record;
}

export async function updateScene(id, data) {
  try {
    await db.scenes.update(id, { ...data, updatedAt: Date.now() });
  } catch (e) {
    throw createStorageError(
      "Could not save scene. If you're in private browsing or out of space, try downloading a backup and using a normal window.",
      e
    );
  }
}

/**
 * Update scene order within a chapter. sceneIdsInOrder is the list of scene ids in desired order.
 */
export async function reorderScenesInChapter(chapterId, sceneIdsInOrder) {
  for (let i = 0; i < sceneIdsInOrder.length; i++) {
    await db.scenes.update(sceneIdsInOrder[i], { order: i, updatedAt: Date.now() });
  }
}

export async function deleteScene(id) {
  await db.scenes.delete(id);
}

// Story facts (consistency: extracted characters, locations, events)
export async function getStoryFacts(storyId) {
  if (!db.story_facts) return [];
  const list = await db.story_facts.where("storyId").equals(storyId).sortBy("createdAt");
  return list;
}

export async function addStoryFact(fact) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const storyId = fact.storyId;
  if (!storyId) throw createStorageError("storyId is required for addStoryFact", null);
  await db.story_facts.add({
    id,
    storyId,
    factType: fact.factType || "event",
    content: fact.content ?? "",
    sourceSceneId: fact.sourceSceneId ?? null,
    sourceChapterId: fact.sourceChapterId ?? null,
    createdAt,
  });
  return { id, ...fact, createdAt };
}

export async function deleteStoryFactsForStory(storyId) {
  if (!db.story_facts) return;
  await db.story_facts.where("storyId").equals(storyId).delete();
}

/**
 * Replace facts that came from the given scene IDs with a new set of facts.
 * Deletes existing facts whose sourceSceneId is in sceneIds, then adds newFacts.
 * @param {string} storyId
 * @param {string[]} sceneIds
 * @param {{ factType: string, content: string, sourceSceneId: string, sourceChapterId?: string }[]} newFacts
 */
export async function replaceStoryFactsForScenes(storyId, sceneIds, newFacts) {
  if (!db.story_facts) return;
  const existing = await db.story_facts.where("storyId").equals(storyId).toArray();
  const toDelete = existing.filter((f) => f.sourceSceneId && sceneIds.includes(f.sourceSceneId)).map((f) => f.id);
  for (const id of toDelete) await db.story_facts.delete(id);
  for (const f of newFacts) {
    await addStoryFact({
      storyId,
      factType: f.factType,
      content: typeof f.content === "string" ? f.content : JSON.stringify(f.content),
      sourceSceneId: f.sourceSceneId ?? null,
      sourceChapterId: f.sourceChapterId ?? null,
    });
  }
}

const EXAMPLE_SEEDED_KEY = 'inkflow_example_seeded';

async function insertExampleStory(locale) {
  const { getLocalizedExampleStory, EXAMPLE_STORY_ID } = await import('@/data/exampleStory.js');
  const data = getLocalizedExampleStory(locale);
  await db.transaction('rw', [db.stories, db.characters, db.chapters, db.scenes, db.ideas], async () => {
    await db.stories.add(data.story);
    for (const c of data.characters) await db.characters.add(c);
    for (const ch of data.chapters) await db.chapters.add(ch);
    for (const s of data.scenes) await db.scenes.add(s);
    for (const i of data.ideas) await db.ideas.add(i);
  });
  return EXAMPLE_STORY_ID;
}

// Seed the example story once on first launch (no-op if already seeded or deleted by user).
export async function seedExampleStoryOnce(locale = 'en') {
  if (localStorage.getItem(EXAMPLE_SEEDED_KEY)) return;
  try {
    const { EXAMPLE_STORY_ID } = await import('@/data/exampleStory.js');
    const existing = await db.stories.get(EXAMPLE_STORY_ID);
    if (!existing) await insertExampleStory(locale);
    setCurrentStoryId(EXAMPLE_STORY_ID);
  } catch (_) {
    // Non-fatal — app works without the example story
  } finally {
    localStorage.setItem(EXAMPLE_SEEDED_KEY, '1');
  }
}

// Load (or reload) the example story without wiping existing data.
export async function loadExampleStory(locale = 'en') {
  const { EXAMPLE_STORY_ID } = await import('@/data/exampleStory.js');
  try {
    const existing = await db.stories.get(EXAMPLE_STORY_ID);
    if (!existing) await insertExampleStory(locale);
    setCurrentStoryId(EXAMPLE_STORY_ID);
    return EXAMPLE_STORY_ID;
  } catch (e) {
    throw createStorageError('Could not load the example story.', e);
  }
}

// Export/Import (full project; v2+ stories; v3+ ideaCustomTypes; v4+ storyFacts; v5+ characterRelationships)
export async function exportProject() {
  try {
    let ideaCustomTypes = [];
    let storyFacts = [];
    let characterRelationships = [];
    try {
      if (db.idea_custom_types) ideaCustomTypes = await db.idea_custom_types.toArray();
    } catch (_) {}
    try {
      if (db.story_facts) storyFacts = await db.story_facts.toArray();
    } catch (_) {}
    try {
      if (db.character_relationships) characterRelationships = await db.character_relationships.toArray();
    } catch (_) {}
    const [stories, ideas, characters, chapters, scenes] = await Promise.all([
      db.stories.toArray(),
      db.ideas.toArray(),
      db.characters.toArray(),
      db.chapters.toArray(),
      db.scenes.toArray(),
    ]);
    return {
      version: 5,
      exportedAt: new Date().toISOString(),
      stories,
      ideas,
      characters,
      chapters,
      scenes,
      ideaCustomTypes,
      storyFacts,
      characterRelationships,
    };
  } catch (e) {
    throw createStorageError(
      "Could not create backup. Try again or copy your text elsewhere.",
      e
    );
  }
}

export function validateImportData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw createImportValidationError(
      "This file doesn't look like an InkFlow backup. Use a file you exported from this app."
    );
  }
  const hasVersion = typeof data.version === "number";
  const hasStories = data.version >= 2 && Array.isArray(data.stories);
  const hasLegacy = data.story != null || ["story", "ideas", "characters", "chapters", "scenes"].some((k) => k in data);
  if (!hasVersion && !hasStories && !hasLegacy) {
    throw createImportValidationError(
      "This file doesn't look like an InkFlow backup. Use a file you exported from this app."
    );
  }
  if (data.ideas != null && !Array.isArray(data.ideas)) {
    throw createImportValidationError("Invalid backup format: ideas must be an array.");
  }
  if (data.characters != null && !Array.isArray(data.characters)) {
    throw createImportValidationError("Invalid backup format: characters must be an array.");
  }
  if (data.chapters != null && !Array.isArray(data.chapters)) {
    throw createImportValidationError("Invalid backup format: chapters must be an array.");
  }
  if (data.scenes != null && !Array.isArray(data.scenes)) {
    throw createImportValidationError("Invalid backup format: scenes must be an array.");
  }
  if (data.ideaCustomTypes != null && !Array.isArray(data.ideaCustomTypes)) {
    throw createImportValidationError("Invalid backup format: ideaCustomTypes must be an array.");
  }
  if (data.storyFacts != null && !Array.isArray(data.storyFacts)) {
    throw createImportValidationError("Invalid backup format: storyFacts must be an array.");
  }
  if (data.characterRelationships != null && !Array.isArray(data.characterRelationships)) {
    throw createImportValidationError("Invalid backup format: characterRelationships must be an array.");
  }
}

export async function importProject(data) {
  validateImportData(data);
  try {
    const stores = [db.stories, db.ideas, db.characters, db.chapters, db.scenes];
    if (db.idea_custom_types) stores.push(db.idea_custom_types);
    if (db.story_facts) stores.push(db.story_facts);
    if (db.character_relationships) stores.push(db.character_relationships);
    await db.transaction("rw", stores, async () => {
      await db.stories.clear();
      await db.ideas.clear();
      await db.characters.clear();
      await db.chapters.clear();
      await db.scenes.clear();
      if (db.idea_custom_types) await db.idea_custom_types.clear();
      if (db.story_facts) await db.story_facts.clear();
      if (db.character_relationships) await db.character_relationships.clear();
      const isV2 = data.version >= 2 && Array.isArray(data.stories);
      if (isV2 && data.stories?.length) {
        for (const s of data.stories) await db.stories.add(s);
      for (const i of data.ideas || []) await db.ideas.add(i);
      for (const c of data.characters || []) await db.characters.add(c);
      for (const ch of data.chapters || []) await db.chapters.add(ch);
      for (const s of data.scenes || []) await db.scenes.add(s);
        if (db.idea_custom_types && Array.isArray(data.ideaCustomTypes)) {
          for (const ct of data.ideaCustomTypes) await db.idea_custom_types.add(ct);
        }
        if (db.story_facts && Array.isArray(data.storyFacts) && data.storyFacts.length > 0) {
          for (const f of data.storyFacts) await db.story_facts.add(f);
        }
        if (db.character_relationships && Array.isArray(data.characterRelationships)) {
          for (const r of data.characterRelationships) await db.character_relationships.add(r);
        }
        if (data.stories[0]?.id) setCurrentStoryId(data.stories[0].id);
      } else {
        const legacyStory = data.story && typeof data.story === "object" ? data.story : { id: "story", oneSentence: "", setup: "", disaster1: "", disaster2: "", disaster3: "", ending: "", updatedAt: Date.now(), createdAt: Date.now() };
        const storyId = legacyStory.id || "story";
        await db.stories.add(legacyStory);
        for (const i of data.ideas || []) await db.ideas.add({ ...i, storyId: i.storyId ?? storyId });
        for (const c of data.characters || []) await db.characters.add({ ...c, storyId: c.storyId ?? storyId });
        for (const ch of data.chapters || []) await db.chapters.add({ ...ch, storyId: ch.storyId ?? storyId });
        for (const s of data.scenes || []) await db.scenes.add(s);
        if (db.idea_custom_types && Array.isArray(data.ideaCustomTypes)) {
          for (const ct of data.ideaCustomTypes) await db.idea_custom_types.add(ct);
        }
        if (db.story_facts && Array.isArray(data.storyFacts) && data.storyFacts.length > 0) {
          for (const f of data.storyFacts) await db.story_facts.add(f);
        }
        if (db.character_relationships && Array.isArray(data.characterRelationships)) {
          for (const r of data.characterRelationships) await db.character_relationships.add(r);
        }
        setCurrentStoryId(storyId);
      }
    });
  } catch (e) {
    if (e && e.code === "IMPORT_VALIDATION") throw e;
    throw createStorageError(
      `Import failed: ${e?.message || "unknown error"}. Your current project was not changed.`,
      e
    );
  }
}
