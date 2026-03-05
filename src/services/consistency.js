import { getStoryFacts, getCharacters, getScene, getScenes, replaceStoryFactsForScenes } from "@/db";
import { completeWithAi } from "@/services/ai";
import { TIERS } from "@/services/ai";

const EXTRACT_SYSTEM = "You are a fiction analyst. Extract structured facts from scene text. Reply with valid JSON only, no markdown or preamble.";
const EXTRACT_USER = `From this scene text, list:
(1) character names and one key trait or role each
(2) location names mentioned
(3) 1-3 key events that happened

Return a single JSON object with exactly these keys: "characters" (array of { "name": string, "trait": string }), "locations" (array of strings), "events" (array of strings).

Scene text:
{{SCENE_TEXT}}

JSON:`;

const CHECK_SYSTEM = "You are a fiction consistency checker. Given established story facts and character notes, determine if the given text contradicts any of them. List only the contradictions, one per line. If there are no contradictions, reply with exactly: No contradictions.";
const CHECK_USER = `Established facts and character notes:
{{FACTS}}

Text to check:
{{TEXT}}

Does the text contradict any of the established facts? List contradictions only. If none, say: No contradictions.`;

/**
 * Extract facts from scene prose via AI. Returns array of { factType, content, sourceSceneId, sourceChapterId }.
 * @param {{ sceneText: string, sceneId: string, chapterId?: string, storyId: string }}
 * @returns {Promise<{ factType: string, content: string, sourceSceneId: string, sourceChapterId?: string }[]>}
 */
export async function extractFactsFromProse({ sceneText, sceneId, chapterId, storyId }) {
  if (!sceneText?.trim()) return [];
  const userPrompt = EXTRACT_USER.replace("{{SCENE_TEXT}}", sceneText.slice(0, 8000));
  const raw = await completeWithAi({
    systemPrompt: EXTRACT_SYSTEM,
    userPrompt,
    tier: TIERS.LIGHT,
    maxTokens: 600,
  });
  const facts = [];
  try {
    const cleaned = (raw || "").replace(/```\w*\n?/g, "").trim();
    const json = JSON.parse(cleaned);
    const chars = Array.isArray(json.characters) ? json.characters : [];
    for (const c of chars) {
      const name = c?.name ?? "";
      const trait = c?.trait ?? c?.role ?? "";
      facts.push({
        factType: "character",
        content: typeof name === "string" ? (trait ? `${name}: ${trait}` : name) : JSON.stringify(c),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
      });
    }
    const locs = Array.isArray(json.locations) ? json.locations : [];
    for (const loc of locs) {
      facts.push({
        factType: "location",
        content: typeof loc === "string" ? loc : JSON.stringify(loc),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
      });
    }
    const evts = Array.isArray(json.events) ? json.events : [];
    for (const ev of evts) {
      facts.push({
        factType: "event",
        content: typeof ev === "string" ? ev : JSON.stringify(ev),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
      });
    }
  } catch (_) {
    // If parse fails, still append one raw fact so user sees something happened
    facts.push({
      factType: "event",
      content: (raw || "").slice(0, 500),
      sourceSceneId: sceneId,
      sourceChapterId: chapterId ?? null,
    });
  }
  return facts;
}

/**
 * Update story facts by re-extracting from all scenes that have content.
 * Replaces facts whose sourceSceneId is in the set of processed scenes.
 * @param {string} storyId
 * @param {{ id: string, chapterId: string, content?: string }[]} scenes
 * @returns {Promise<{ updated: number }>}
 */
export async function updateStoryFactsFromScenes(storyId, scenes) {
  const withContent = scenes.filter((s) => (s.content || "").trim().length > 0);
  const allNewFacts = [];
  const processedSceneIds = [];
  for (const scene of withContent) {
    const extracted = await extractFactsFromProse({
      sceneText: (scene.content || "").trim(),
      sceneId: scene.id,
      chapterId: scene.chapterId,
      storyId,
    });
    processedSceneIds.push(scene.id);
    allNewFacts.push(...extracted);
  }
  await replaceStoryFactsForScenes(storyId, processedSceneIds, allNewFacts);
  return { updated: processedSceneIds.length };
}

/**
 * Check if the given (or current scene) text contradicts established story facts and character notes.
 * @param {{ storyId: string, sceneId?: string }} opts - If sceneId omitted, uses all scenes' content as text to check
 * @returns {Promise<string>} Model reply: list of contradictions or "No contradictions."
 */
export async function checkConsistency({ storyId, sceneId }) {
  const [storyFacts, characters] = await Promise.all([
    getStoryFacts(storyId),
    getCharacters(storyId),
  ]);
  const factsLines = [
    ...storyFacts.map((f) => `[${f.factType}] ${f.content}`),
    ...characters.map((c) => `Character: ${c.name || "Unnamed"} - ${(c.oneSentence || "").slice(0, 120)}`),
  ];
  const factsBlock = factsLines.length ? factsLines.join("\n") : "(No facts or characters yet.)";

  let textToCheck = "";
  if (sceneId) {
    const scene = await getScene(sceneId);
    textToCheck = (scene?.content || scene?.oneSentenceSummary || "").trim() || "(Scene has no content.)";
  } else {
    const scenes = await getScenes(storyId);
    const parts = scenes.map((s) => `Scene "${s.title || "Untitled"}": ${(s.content || s.oneSentenceSummary || "").slice(0, 1500)}`);
    textToCheck = parts.join("\n\n") || "(No scene content.)";
  }

  const userPrompt = CHECK_USER.replace("{{FACTS}}", factsBlock.slice(0, 6000)).replace("{{TEXT}}", textToCheck.slice(0, 4000));
  const reply = await completeWithAi({
    systemPrompt: CHECK_SYSTEM,
    userPrompt,
    tier: TIERS.LIGHT,
    maxTokens: 500,
  });
  return (reply || "").trim();
}
