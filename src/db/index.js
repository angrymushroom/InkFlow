import Dexie from "dexie";

export const db = new Dexie("InkFlow");

db.version(1).stores({
  story: "id, updatedAt",
  ideas: "id, type, createdAt",
  characters: "id, createdAt",
  chapters: "id, order, createdAt",
  scenes: "id, chapterId, order, createdAt",
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

// Singleton story (one project)
export async function getStory() {
  try {
    const row = await db.story.toCollection().first();
    return row || null;
  } catch (e) {
    throw createStorageError(
      "Could not load your project. If you're in private browsing or out of space, try another browser or window.",
      e
    );
  }
}

export async function saveStory(data) {
  try {
    const id = data.id || "story";
    const updatedAt = Date.now();
    await db.story.put({ id, ...data, updatedAt });
    return { id, ...data, updatedAt };
  } catch (e) {
    throw createStorageError(
      "Could not save. If you're in private browsing or out of space, try downloading a backup and using a normal window.",
      e
    );
  }
}

// Ideas
export async function getIdeas() {
  return db.ideas.orderBy("createdAt").reverse().toArray();
}

export async function addIdea(idea) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.ideas.add({ id, ...idea, createdAt });
  return { id, ...idea, createdAt };
}

export async function updateIdea(id, data) {
  await db.ideas.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteIdea(id) {
  await db.ideas.delete(id);
}

// Characters
export async function getCharacters() {
  return db.characters.orderBy("createdAt").toArray();
}

export async function addCharacter(char) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.characters.add({ id, ...char, createdAt });
  return { id, ...char, createdAt };
}

export async function updateCharacter(id, data) {
  await db.characters.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteCharacter(id) {
  await db.characters.delete(id);
}

// Chapters
export async function getChapters() {
  return db.chapters.orderBy("order").toArray();
}

export async function addChapter(chapter) {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const order = chapter.order ?? (await db.chapters.count());
  await db.chapters.add({ id, ...chapter, order, createdAt });
  return { id, ...chapter, order, createdAt };
}

export async function updateChapter(id, data) {
  await db.chapters.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteChapter(id) {
  await db.scenes.where("chapterId").equals(id).delete();
  await db.chapters.delete(id);
}

// Scenes
export async function getScenes() {
  const list = await db.scenes.toArray();
  return list.sort((a, b) => {
    const c = (a.chapterId || '').localeCompare(b.chapterId || '');
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

// Export/Import (full project)
export async function exportProject() {
  try {
    const [story, ideas, characters, chapters, scenes] = await Promise.all([
      db.story.toArray(),
      db.ideas.toArray(),
      db.characters.toArray(),
      db.chapters.toArray(),
      db.scenes.toArray(),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      story: story[0] ?? null,
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
  const hasExpectedKeys =
    ["story", "ideas", "characters", "chapters", "scenes"].some((k) => k in data);
  if (!hasVersion && !hasExpectedKeys) {
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
    await db.transaction("rw", db.story, db.ideas, db.characters, db.chapters, db.scenes, async () => {
      await db.story.clear();
      await db.ideas.clear();
      await db.characters.clear();
      await db.chapters.clear();
      await db.scenes.clear();
      if (data.story && typeof data.story === "object") await db.story.add(data.story);
      for (const i of data.ideas || []) await db.ideas.add(i);
      for (const c of data.characters || []) await db.characters.add(c);
      for (const ch of data.chapters || []) await db.chapters.add(ch);
      for (const s of data.scenes || []) await db.scenes.add(s);
    });
  } catch (e) {
    if (e && e.code === "IMPORT_VALIDATION") throw e;
    throw createStorageError(
      `Import failed: ${e?.message || "unknown error"}. Your current project was not changed.`,
      e
    );
  }
}
