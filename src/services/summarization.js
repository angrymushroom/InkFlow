import { getScene, getScenesByChapter, getChapterById, updateSceneSummary, updateChapterSummary } from "@/db";
import { completeWithAi, CONTEXTS, tierForContext } from "@/services/ai";

const SCENE_SUMMARY_SYSTEM =
  "You are a fiction editor. Summarize this scene in 2-3 concise sentences. " +
  "Cover: who is present, what happens, and what the narrative consequence is. " +
  "Be specific about character names and outcomes. Return only the summary text, no preamble. " +
  "IMPORTANT: Reply in the same language as the scene text.";

const CHAPTER_SUMMARY_SYSTEM =
  "You are a fiction editor. Given scene-by-scene summaries from one chapter, " +
  "write a single 2-4 sentence chapter summary covering the key events, " +
  "character developments, and how the chapter advances the overall story. " +
  "Return only the summary text, no preamble. " +
  "IMPORTANT: Reply in the same language as the summaries.";

/**
 * Generate and cache an AI summary for one scene.
 * Skips generation if a valid cached summary already exists.
 *
 * @param {string} sceneId
 * @returns {Promise<string|null>} The summary, or null if no prose to summarize.
 */
export async function generateSceneSummary(sceneId) {
  const scene = await getScene(sceneId);
  if (!scene) return null;

  const text = (scene.content || "").trim();
  if (!text || text.length < 50) return null;

  // Cache hit: summary is up-to-date relative to last content change
  if (scene.aiSummary && scene.aiSummaryAt && scene.aiSummaryAt >= (scene.updatedAt || 0)) {
    return scene.aiSummary;
  }

  const summary = await completeWithAi({
    systemPrompt: SCENE_SUMMARY_SYSTEM,
    userPrompt: text.slice(0, 6000),
    tier: tierForContext(CONTEXTS.CONSISTENCY),
    maxTokens: 150,
  });

  const trimmed = (summary || "").trim();
  if (trimmed) {
    await updateSceneSummary(sceneId, trimmed, Date.now());
  }
  return trimmed || null;
}

/**
 * Generate and cache an AI summary for one chapter,
 * built from the summaries of all scenes in that chapter.
 * Only runs if at least one scene has an aiSummary.
 *
 * @param {string} chapterId
 * @returns {Promise<string|null>}
 */
export async function generateChapterSummary(chapterId) {
  const scenes = await getScenesByChapter(chapterId);
  const withSummary = scenes.filter((s) => s.aiSummary?.trim());
  if (!withSummary.length) return null;

  const summariesBlock = withSummary
    .map((s, i) => `Scene ${i + 1} "${s.title || "Untitled"}": ${s.aiSummary}`)
    .join("\n");

  const summary = await completeWithAi({
    systemPrompt: CHAPTER_SUMMARY_SYSTEM,
    userPrompt: summariesBlock.slice(0, 4000),
    tier: tierForContext(CONTEXTS.CONSISTENCY),
    maxTokens: 200,
  });

  const trimmed = (summary || "").trim();
  if (trimmed) {
    await updateChapterSummary(chapterId, trimmed, Date.now());
  }
  return trimmed || null;
}

/**
 * Full summary pipeline triggered after a scene is saved.
 * 1. Generates/refreshes the scene's aiSummary.
 * 2. Refreshes the parent chapter's aiSummary.
 *
 * Fire-and-forget: callers should NOT await this.
 *
 * @param {string} sceneId
 * @param {string} chapterId  - the scene's parent chapter id
 */
export async function runSummaryPipeline(sceneId, chapterId) {
  try {
    await generateSceneSummary(sceneId);
  } catch {
    return; // scene summary failed — skip chapter step
  }
  try {
    if (chapterId) await generateChapterSummary(chapterId);
  } catch {
    // chapter summary failure is non-fatal
  }
}
