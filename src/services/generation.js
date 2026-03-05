import {
  getStoryById,
  getCharacters,
  getIdeas,
  getChapters,
  getScenes,
  getStoryFacts,
  updateScene,
} from "@/db";
import { completeWithAi } from "@/services/ai";
import { TIERS } from "@/services/ai";

const PRIOR_SCENE_TAIL_CHARS = 1200;
const SCENE_GENERATION_MAX_TOKENS = 1500;

/**
 * Build the context string for generating one scene: spine, characters, ideas,
 * prior scenes (tail or summary), and current scene metadata.
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

  const spineLines = [
    story.oneSentence && `One-sentence: ${story.oneSentence}`,
    story.setup && `Setup: ${story.setup}`,
    story.disaster1 && `Disaster 1: ${story.disaster1}`,
    story.disaster2 && `Disaster 2: ${story.disaster2}`,
    story.disaster3 && `Disaster 3: ${story.disaster3}`,
    story.ending && `Ending: ${story.ending}`,
  ].filter(Boolean);
  const spineBlock = spineLines.length ? `Story spine:\n${spineLines.join("\n")}` : "Story spine: (not filled yet)";

  const charsBlock =
    characters.length > 0
      ? `Characters:\n${characters.map((c) => `- ${c.name || "Unnamed"}: ${(c.oneSentence || "").slice(0, 150)}`).join("\n")}`
      : "Characters: (none)";

  const ideasBlock =
    ideas.length > 0
      ? `Idea cards:\n${ideas.map((i) => `- [${i.type}] ${i.title || "Untitled"}: ${(i.body || "").slice(0, 200)}`).join("\n")}`
      : "Idea cards: (none)";

  let priorScenesBlock = "";
  if (sceneIndex > 0) {
    const parts = [];
    for (let i = 0; i < sceneIndex; i++) {
      const s = scenes[i];
      const summary = s.oneSentenceSummary?.trim();
      const content = (s.content || "").trim();
      if (content.length > PRIOR_SCENE_TAIL_CHARS) {
        parts.push(`Scene "${s.title || "Untitled"}": ... ${content.slice(-PRIOR_SCENE_TAIL_CHARS)}`);
      } else if (content) {
        parts.push(`Scene "${s.title || "Untitled"}": ${content}`);
      } else if (summary) {
        parts.push(`Scene "${s.title || "Untitled"}": ${summary}`);
      }
    }
    priorScenesBlock = parts.length ? `Prior scenes (what happened so far):\n${parts.join("\n\n")}` : "";
  }

  const currentBlock = [
    `Current scene title: ${currentScene.title || "Untitled"}`,
    currentScene.oneSentenceSummary && `One-sentence: ${currentScene.oneSentenceSummary}`,
    currentScene.notes && `Notes: ${currentScene.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  let factsBlock = "";
  if (Array.isArray(storyFacts) && storyFacts.length > 0) {
    const factsSummary = storyFacts.map((f) => `[${f.factType}] ${f.content}`).join("\n");
    factsBlock = `Establish facts (do not contradict):\n${factsSummary}`;
  }

  const sections = [spineBlock, charsBlock, ideasBlock, factsBlock, priorScenesBlock, currentBlock].filter(Boolean);
  return sections.join("\n\n---\n\n");
}

/**
 * Generate prose for one scene using AI and save to scene.content.
 * @param {{ storyId: string, sceneId: string }}
 * @returns {Promise<string>} Generated prose text
 */
export async function generateSceneProse({ storyId, sceneId }) {
  const context = await buildSceneContext(storyId, sceneId);
  const systemPrompt =
    "You are a fiction writing assistant. The writer is using the Snowflake Method. " +
    "Write in a clear, structural style. Stay consistent with the story spine, characters, and ideas provided. " +
    "Output only the scene prose, no preamble, no \"Here is...\", no quotes around the result.";
  const userPrompt = `${context}\n\n---\n\nWrite the prose for this scene only. Output only the scene prose.`;

  const text = await completeWithAi({
    systemPrompt,
    userPrompt,
    tier: TIERS.LIGHT,
    maxTokens: SCENE_GENERATION_MAX_TOKENS,
  });

  const trimmed = (text || "").trim();
  if (trimmed) await updateScene(sceneId, { content: trimmed });
  return trimmed;
}

/**
 * Generate prose for all scenes from fromSceneId to the end (in outline order).
 * One API call per scene.
 * @param {string} storyId
 * @param {string} fromSceneId - First scene to generate (inclusive)
 * @returns {Promise<{ generated: number, errors: { sceneId: string, message: string }[] }>}
 */
export async function generateFromScene(storyId, fromSceneId) {
  const scenes = await getScenes(storyId);
  const fromIndex = scenes.findIndex((s) => s.id === fromSceneId);
  if (fromIndex < 0) return { generated: 0, errors: [{ sceneId: fromSceneId, message: "Scene not found." }] };
  const toGenerate = scenes.slice(fromIndex);
  let generated = 0;
  const errors = [];
  for (const scene of toGenerate) {
    try {
      await generateSceneProse({ storyId, sceneId: scene.id });
      generated++;
    } catch (e) {
      errors.push({ sceneId: scene.id, message: e?.message || "Generation failed." });
    }
  }
  return { generated, errors };
}
