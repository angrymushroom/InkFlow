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

export async function saveStory(data) {
  try {
    const id = data.id || getCurrentStoryId() || "story";
    const updatedAt = Date.now();
    const existing = await db.stories.get(id);
    const payload = {
      id,
      oneSentence: data.oneSentence ?? "",
      setup: data.setup ?? "",
      disaster1: data.disaster1 ?? "",
      disaster2: data.disaster2 ?? "",
      disaster3: data.disaster3 ?? "",
      ending: data.ending ?? "",
      updatedAt,
      createdAt: existing?.createdAt ?? updatedAt,
    };
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
    id,
    oneSentence: overrides.oneSentence ?? "",
    setup: overrides.setup ?? "",
    disaster1: overrides.disaster1 ?? "",
    disaster2: overrides.disaster2 ?? "",
    disaster3: overrides.disaster3 ?? "",
    ending: overrides.ending ?? "",
    updatedAt: now,
    createdAt: now,
  };
  await db.stories.add(story);
  return story;
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
  await db.ideas.add({ id, ...idea, storyId, createdAt });
  return { id, ...idea, storyId, createdAt };
}

export async function updateIdea(id, data) {
  await db.ideas.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteIdea(id) {
  await db.ideas.delete(id);
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
  await db.characters.add({ id, ...char, storyId, createdAt });
  return { id, ...char, storyId, createdAt };
}

export async function updateCharacter(id, data) {
  await db.characters.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteCharacter(id) {
  await db.characters.delete(id);
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
  await db.chapters.add({ id, ...chapter, storyId, order, createdAt });
  return { id, ...chapter, storyId, order, createdAt };
}

export async function updateChapter(id, data) {
  await db.chapters.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteChapter(id) {
  await db.scenes.where("chapterId").equals(id).delete();
  await db.chapters.delete(id);
}

// Scenes (when storyId given, only scenes whose chapter belongs to that story)
export async function getScenes(storyId) {
  if (storyId != null) {
    const chapterIds = await db.chapters.where("storyId").equals(storyId).primaryKeys();
    if (chapterIds.length === 0) return [];
    const list = await db.scenes.where("chapterId").anyOf(chapterIds).toArray();
    return list.sort((a, b) => {
      const c = (a.chapterId || "").localeCompare(b.chapterId || "");
      return c !== 0 ? c : (a.order ?? 0) - (b.order ?? 0);
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
  await db.scenes.add({ id, ...scene, order, createdAt });
  return { id, ...scene, order, createdAt };
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

export async function deleteScene(id) {
  await db.scenes.delete(id);
}

// Export/Import (full project; v2 includes stories and storyId)
export async function exportProject() {
  try {
    const [stories, ideas, characters, chapters, scenes] = await Promise.all([
      db.stories.toArray(),
      db.ideas.toArray(),
      db.characters.toArray(),
      db.chapters.toArray(),
      db.scenes.toArray(),
    ]);
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      stories,
      ideas,
      characters,
      chapters,
      scenes,
    };
  } catch (e) {
    throw createStorageError(
      "Could not create backup. Try again or copy your text elsewhere.",
      e
    );
  }
}

function validateImportData(data) {
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
}

export async function importProject(data) {
  validateImportData(data);
  try {
    const stores = [db.stories, db.ideas, db.characters, db.chapters, db.scenes];
    await db.transaction("rw", stores, async () => {
      await db.stories.clear();
      await db.ideas.clear();
      await db.characters.clear();
      await db.chapters.clear();
      await db.scenes.clear();
      const isV2 = data.version >= 2 && Array.isArray(data.stories);
      if (isV2 && data.stories?.length) {
        for (const s of data.stories) await db.stories.add(s);
        for (const i of data.ideas || []) await db.ideas.add(i);
        for (const c of data.characters || []) await db.characters.add(c);
        for (const ch of data.chapters || []) await db.chapters.add(ch);
        for (const s of data.scenes || []) await db.scenes.add(s);
        if (data.stories[0]?.id) setCurrentStoryId(data.stories[0].id);
      } else {
        const legacyStory = data.story && typeof data.story === "object" ? data.story : { id: "story", oneSentence: "", setup: "", disaster1: "", disaster2: "", disaster3: "", ending: "", updatedAt: Date.now(), createdAt: Date.now() };
        const storyId = legacyStory.id || "story";
        await db.stories.add(legacyStory);
        for (const i of data.ideas || []) await db.ideas.add({ ...i, storyId: i.storyId ?? storyId });
        for (const c of data.characters || []) await db.characters.add({ ...c, storyId: c.storyId ?? storyId });
        for (const ch of data.chapters || []) await db.chapters.add({ ...ch, storyId: ch.storyId ?? storyId });
        for (const s of data.scenes || []) await db.scenes.add(s);
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
