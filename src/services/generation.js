import {
  getStoryById,
  getCharacters,
  getIdeas,
  getChapters,
  getScenes,
  getStoryFacts,
  updateScene,
} from "@/db";
import { completeWithAi, TIERS, CONTEXTS, tierForContext } from "@/services/ai";
import { buildSpineSummary } from "@/data/templates";

const PRIOR_SCENE_TAIL_CHARS = 800;
const LAST_LINES_CHARS = 400;
const SCENE_GENERATION_MAX_TOKENS = 1500;

/**
 * Build the context string for generating one scene.
 * Includes: story spine, characters, ideas, established facts,
 * prior scenes (summary/tail), last lines of the immediately preceding scene,
 * next scene metadata (for closing-hook guidance), and current scene metadata.
 * @param {string} storyId
 * @param {string} sceneId
 * @returns {Promise<string>}
 */
export async function buildSceneContext(storyId, sceneId) {
  const [story, characters, ideas, chapters, scenes, storyFacts] = await Promise.all([
    getStoryById(storyId),
    getCharacters(storyId),
    getIdeas(storyId),
    getChapters(storyId),
    getScenes(storyId),
    getStoryFacts(storyId),
  ]);

  if (!story) throw new Error("Story not found.");
  const sceneIndex = scenes.findIndex((s) => s.id === sceneId);
  if (sceneIndex < 0) throw new Error("Scene not found in this story.");
  const currentScene = scenes[sceneIndex];

  // --- Story spine (template-aware) ---
  const spineSummary = buildSpineSummary(story);
  const spineBlock = spineSummary !== '(Story spine not filled yet)'
    ? `Story spine (${story.template ?? 'snowflake'}):\n${spineSummary}`
    : "Story spine: (not filled yet)";

  // --- Characters ---
  const charsBlock =
    characters.length > 0
      ? `Characters:\n${characters.map((c) => `- ${c.name || "Unnamed"}: ${(c.oneSentence || "").slice(0, 150)}`).join("\n")}`
      : "Characters: (none)";

  // --- Ideas ---
  const ideasBlock =
    ideas.length > 0
      ? `Idea cards:\n${ideas.map((i) => `- [${i.type}] ${i.title || "Untitled"}: ${(i.body || "").slice(0, 200)}`).join("\n")}`
      : "Idea cards: (none)";

  // --- Established facts ---
  let factsBlock = "";
  if (Array.isArray(storyFacts) && storyFacts.length > 0) {
    factsBlock = `Established facts (never contradict):\n${storyFacts.map((f) => `[${f.factType}] ${f.content}`).join("\n")}`;
  }

  // --- Prior scenes (summaries / tails for context, excluding the immediately previous) ---
  let priorScenesBlock = "";
  if (sceneIndex > 1) {
    const parts = [];
    for (let i = 0; i < sceneIndex - 1; i++) {
      const s = scenes[i];
      const summary = s.oneSentenceSummary?.trim();
      const content = (s.content || "").trim();
      if (content.length > PRIOR_SCENE_TAIL_CHARS) {
        parts.push(`Scene "${s.title || "Untitled"}": …${content.slice(-PRIOR_SCENE_TAIL_CHARS)}`);
      } else if (content) {
        parts.push(`Scene "${s.title || "Untitled"}": ${content}`);
      } else if (summary) {
        parts.push(`Scene "${s.title || "Untitled"}": [summary] ${summary}`);
      }
    }
    if (parts.length) priorScenesBlock = `Earlier scenes (what happened so far):\n${parts.join("\n\n")}`;
  }

  // --- Last lines of the immediately preceding scene (most prominent continuity signal) ---
  let lastLinesBlock = "";
  if (sceneIndex > 0) {
    const prevScene = scenes[sceneIndex - 1];
    const prevContent = (prevScene.content || "").trim();
    if (prevContent) {
      const tail =
        prevContent.length > LAST_LINES_CHARS
          ? "…" + prevContent.slice(-LAST_LINES_CHARS)
          : prevContent;
      lastLinesBlock = `Last lines of previous scene ("${prevScene.title || "Untitled"}"):\n${tail}`;
    } else if (prevScene.oneSentenceSummary) {
      lastLinesBlock = `Previous scene ("${prevScene.title || "Untitled"}") ended with: [summary] ${prevScene.oneSentenceSummary}`;
    }
  }

  // --- Next scene metadata (so the AI can craft a closing hook toward it) ---
  let nextSceneBlock = "";
  if (sceneIndex < scenes.length - 1) {
    const nextScene = scenes[sceneIndex + 1];
    const nextParts = [
      `Next scene title: ${nextScene.title || "Untitled"}`,
      nextScene.oneSentenceSummary && `Next scene summary: ${nextScene.oneSentenceSummary}`,
    ].filter(Boolean);
    nextSceneBlock = `Upcoming scene (end your scene with a hook that leads here):\n${nextParts.join("\n")}`;
  }

  // --- Current scene ---
  const positionLabel = `Scene ${sceneIndex + 1} of ${scenes.length}`;
  const currentBlock = [
    `Current scene (${positionLabel}): ${currentScene.title || "Untitled"}`,
    currentScene.oneSentenceSummary && `One-sentence: ${currentScene.oneSentenceSummary}`,
    currentScene.notes && `Notes: ${currentScene.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sections = [
    spineBlock,
    charsBlock,
    ideasBlock,
    factsBlock,
    priorScenesBlock,
    lastLinesBlock,
    nextSceneBlock,
    currentBlock,
  ].filter(Boolean);

  return sections.join("\n\n---\n\n");
}

/**
 * Generate prose for one scene using AI and save to scene.content.
 * @param {{ storyId: string, sceneId: string }}
 * @returns {Promise<string>} Generated prose text
 */
export async function generateSceneProse({ storyId, sceneId }) {
  // Fetch scene list to determine position for dynamic prompt instructions
  const scenes = await getScenes(storyId);
  const sceneIndex = scenes.findIndex((s) => s.id === sceneId);
  if (sceneIndex < 0) throw new Error("Scene not found.");

  const isFirstScene = sceneIndex === 0;
  const isLastScene = sceneIndex === scenes.length - 1;
  const prevScene = sceneIndex > 0 ? scenes[sceneIndex - 1] : null;
  const nextScene = !isLastScene ? scenes[sceneIndex + 1] : null;
  const hasPreviousContent = !!prevScene?.content?.trim();

  const context = await buildSceneContext(storyId, sceneId);

  // System prompt: explicit craft rules
  const systemPrompt = [
    "You are a professional fiction writer helping with the Snowflake Method. Follow these rules strictly:",
    "1. OPENING HOOK: Start the scene in medias res — drop the reader directly into action, tension, or dialogue. Never open with scene-setting description or a weather/time-of-day paragraph.",
    "2. CLOSING HOOK: End the scene with unresolved tension, a cliffhanger, a surprising revelation, or a clear emotional pull toward what comes next. Never end with a tidy summary or the character going to sleep.",
    hasPreviousContent
      ? '3. CONTINUITY: "Last lines of previous scene" are provided in the context. Pick up the narrative directly from them — match the tone, voice, POV, and momentum exactly. Do not recap what just happened.'
      : "3. CONTINUITY: This is the opening scene. Establish tone, voice, and setting efficiently before moving into action.",
    nextScene
      ? `4. FORWARD HOOK: The next scene is provided in context. Shape your closing hook so it flows naturally into that scene without being obvious or mechanical.`
      : "4. FINALE: This is the final scene. Resolve the central tension and deliver a satisfying, resonant ending.",
    "5. CONSISTENCY: Never contradict any character name, relationship, event, or established fact from prior scenes or the facts list. If the previous scene's last lines set up something, follow through on it.",
    '6. OUTPUT: Scene prose only. No title, no chapter heading, no preamble, no "Here is...", no markdown.',
  ]
    .filter(Boolean)
    .join("\n");

  // Dynamic closing instruction in the user prompt
  const closingInstruction = (() => {
    if (isFirstScene && isLastScene) {
      return "Write the complete story as a single scene. Open with a strong hook and end with a satisfying resolution.";
    }
    if (isLastScene) {
      return "This is the final scene. Resolve all threads and deliver a powerful, resonant ending.";
    }
    const nextTitle = nextScene?.title || "Untitled";
    const nextSummary = nextScene?.oneSentenceSummary;
    const nextHint = nextSummary ? ` (${nextSummary})` : "";
    return `End with a hook that pulls directly into the next scene: "${nextTitle}"${nextHint}.`;
  })();

  const continuityInstruction = hasPreviousContent
    ? `Pick up the prose directly from the last lines of the previous scene. Do not recap.`
    : "";

  const userPrompt = [
    context,
    "---",
    "Write the prose for the current scene only.",
    continuityInstruction,
    closingInstruction,
    "Output only the scene prose.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await completeWithAi({
    systemPrompt,
    userPrompt,
    tier: tierForContext(CONTEXTS.SCENE_PROSE),
    maxTokens: SCENE_GENERATION_MAX_TOKENS,
  });

  const trimmed = (text || "").trim();
  if (trimmed) await updateScene(sceneId, { content: trimmed });
  return trimmed;
}

/**
 * Generate prose for all scenes from fromSceneId to the end (in outline order).
 * One API call per scene, with optional live progress callback.
 * @param {string} storyId
 * @param {string} fromSceneId - First scene to generate (inclusive)
 * @param {{ onProgress?: Function }} options
 * @returns {Promise<{ generated: number, errors: { sceneId: string, message: string }[] }>}
 */
export async function generateFromScene(storyId, fromSceneId, { onProgress } = {}) {
  const scenes = await getScenes(storyId);
  const fromIndex = scenes.findIndex((s) => s.id === fromSceneId);
  if (fromIndex < 0) return { generated: 0, errors: [{ sceneId: fromSceneId, message: "Scene not found." }] };
  const toGenerate = scenes.slice(fromIndex);
  let generated = 0;
  const errors = [];
  for (let i = 0; i < toGenerate.length; i++) {
    const scene = toGenerate[i];
    onProgress?.({ current: i + 1, total: toGenerate.length, sceneName: scene.title || "Untitled" });
    try {
      await generateSceneProse({ storyId, sceneId: scene.id });
      generated++;
    } catch (e) {
      errors.push({ sceneId: scene.id, message: e?.message || "Generation failed." });
    }
  }
  return { generated, errors };
}
