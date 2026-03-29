import {
  getStoryFacts,
  getCharacters,
  getScene,
  getScenes,
  replaceStoryFactsForScenes,
  resolveOpenThread,
} from '@/db'

const QUICK_CHECK_SYSTEM =
  'You are a fiction consistency checker. Given high-priority story facts and a new scene, ' +
  'identify only clear contradictions — where the new text directly conflicts with established facts. ' +
  'Do not flag stylistic differences or ambiguities. Reply with valid JSON only, no markdown or preamble. ' +
  'IMPORTANT: Write the contradiction descriptions in the same language as the scene text.'
const QUICK_CHECK_USER = `Established high-priority facts:
{{FACTS}}

New scene text (excerpt):
{{SCENE_TEXT}}

Identify any direct contradictions. Return a JSON array of strings, each describing one contradiction concisely (one sentence each). Return an empty array [] if there are no contradictions.

JSON:`
import { completeWithAi, CONTEXTS, tierForContext } from '@/services/ai'

const EXTRACT_SYSTEM =
  'You are a fiction analyst. Extract structured facts from scene text. Reply with valid JSON only, no markdown or preamble. Write all extracted text values (traits, states, events, locations, threads) in the same language as the scene text.'
const EXTRACT_USER = `From this scene text, extract:
(1) character names and one key trait or role each
(2) location names mentioned
(3) 1-3 key events that happened
(4) open plot threads: unresolved mysteries, unanswered questions, or unfulfilled promises introduced in this scene (max 3, omit if none)
(5) character states at the END of this scene: each named character's current location, emotional state, and any important change (e.g. loss, gain, injury)

Return a single JSON object with exactly these keys:
- "characters": array of { "name": string, "trait": string }
- "locations": array of strings
- "events": array of strings
- "open_threads": array of strings describing each unresolved thread (empty array if none)
- "character_states": array of { "name": string, "state": string } where state is a brief phrase like "at the docks, fearful, has lost the amulet"

Scene text:
{{SCENE_TEXT}}

JSON:`

const CHECK_SYSTEM =
  'You are a fiction consistency checker. Given established story facts and character notes, determine if the given text contradicts any of them. List only the contradictions, one per line. If there are no contradictions, reply with exactly: No contradictions. Reply in the same language as the text being checked.'
const CHECK_USER = `Established facts and character notes:
{{FACTS}}

Text to check:
{{TEXT}}

Does the text contradict any of the established facts? List contradictions only. If none, say: No contradictions.`

/**
 * Extract facts from scene prose via AI.
 * Returns array of { factType, content, sourceSceneId, sourceChapterId } on success,
 * or null if the AI response could not be parsed (so the caller can skip replacing existing facts).
 * @param {{ sceneText: string, sceneId: string, chapterId?: string, storyId: string }}
 * @returns {Promise<{ factType: string, content: string, sourceSceneId: string, sourceChapterId?: string }[] | null>}
 */
export async function extractFactsFromProse({ sceneText, sceneId, chapterId, storyId }) {
  if (!sceneText?.trim()) return []
  const userPrompt = EXTRACT_USER.replace('{{SCENE_TEXT}}', sceneText.slice(0, 8000))
  const raw = await completeWithAi({
    systemPrompt: EXTRACT_SYSTEM,
    userPrompt,
    tier: tierForContext(CONTEXTS.CONSISTENCY),
    maxTokens: 600,
  })
  try {
    const cleaned = (raw || '').replace(/```\w*\n?/g, '').trim()
    const json = JSON.parse(cleaned)
    const facts = []
    const chars = Array.isArray(json.characters) ? json.characters : []
    for (const c of chars) {
      const name = c?.name ?? ''
      const trait = c?.trait ?? c?.role ?? ''
      facts.push({
        factType: 'character',
        content:
          typeof name === 'string' ? (trait ? `${name}: ${trait}` : name) : JSON.stringify(c),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
        priority: 'medium',
      })
    }
    const locs = Array.isArray(json.locations) ? json.locations : []
    for (const loc of locs) {
      facts.push({
        factType: 'location',
        content: typeof loc === 'string' ? loc : JSON.stringify(loc),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
        priority: 'medium',
      })
    }
    const evts = Array.isArray(json.events) ? json.events : []
    for (const ev of evts) {
      facts.push({
        factType: 'event',
        content: typeof ev === 'string' ? ev : JSON.stringify(ev),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
        priority: 'medium',
      })
    }
    const threads = Array.isArray(json.open_threads) ? json.open_threads : []
    for (const thread of threads) {
      if (!thread) continue
      facts.push({
        factType: 'open_thread',
        content: typeof thread === 'string' ? thread : JSON.stringify(thread),
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
        priority: 'high',
        resolved: null,
      })
    }
    const charStates = Array.isArray(json.character_states) ? json.character_states : []
    for (const cs of charStates) {
      const name = cs?.name ?? ''
      const state = cs?.state ?? ''
      if (!name || !state) continue
      facts.push({
        factType: 'character_state',
        content: `${name}: ${state}`,
        sourceSceneId: sceneId,
        sourceChapterId: chapterId ?? null,
        priority: 'high',
      })
    }
    return facts
  } catch (_) {
    // Parse failed — return null so callers know NOT to replace existing facts with garbage
    return null
  }
}

/**
 * Extract and replace facts for a single scene. Fire-and-forget safe.
 * Skips silently if scene text is too short to be meaningful.
 *
 * @param {{ sceneId: string, chapterId?: string, storyId: string, sceneText: string }}
 * @returns {Promise<void>}
 */
export async function updateSceneFacts({ sceneId, chapterId, storyId, sceneText }) {
  if (!sceneText?.trim() || sceneText.trim().length < 100) return
  const facts = await extractFactsFromProse({ sceneText, sceneId, chapterId, storyId })
  if (facts === null) return // parse failed — preserve existing facts
  await replaceStoryFactsForScenes(storyId, [sceneId], facts)
}

/**
 * Update story facts by re-extracting from all scenes that have content.
 * Replaces facts whose sourceSceneId is in the set of processed scenes.
 * @param {string} storyId
 * @param {{ id: string, chapterId: string, content?: string }[]} scenes
 * @returns {Promise<{ updated: number }>}
 */
export async function updateStoryFactsFromScenes(storyId, scenes) {
  const withContent = scenes.filter((s) => (s.content || '').trim().length > 0)
  const allNewFacts = []
  const processedSceneIds = []
  for (const scene of withContent) {
    const extracted = await extractFactsFromProse({
      sceneText: (scene.content || '').trim(),
      sceneId: scene.id,
      chapterId: scene.chapterId,
      storyId,
    })
    // null means parse failed — skip this scene so existing facts are not clobbered
    if (extracted === null) continue
    processedSceneIds.push(scene.id)
    allNewFacts.push(...extracted)
  }
  await replaceStoryFactsForScenes(storyId, processedSceneIds, allNewFacts)
  return { updated: processedSceneIds.length }
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
  ])
  const factsLines = [
    ...storyFacts.map((f) => `[${f.factType}] ${f.content}`),
    ...characters.map(
      (c) => `Character: ${c.name || 'Unnamed'} - ${(c.oneSentence || '').slice(0, 120)}`
    ),
  ]
  const factsBlock = factsLines.length ? factsLines.join('\n') : '(No facts or characters yet.)'

  let textToCheck = ''
  if (sceneId) {
    const scene = await getScene(sceneId)
    textToCheck =
      (scene?.content || scene?.oneSentenceSummary || '').trim() || '(Scene has no content.)'
  } else {
    const scenes = await getScenes(storyId)
    const parts = scenes.map(
      (s) =>
        `Scene "${s.title || 'Untitled'}": ${(s.content || s.oneSentenceSummary || '').slice(0, 1500)}`
    )
    textToCheck = parts.join('\n\n') || '(No scene content.)'
  }

  const userPrompt = CHECK_USER.replace('{{FACTS}}', factsBlock.slice(0, 6000)).replace(
    '{{TEXT}}',
    textToCheck.slice(0, 4000)
  )
  const reply = await completeWithAi({
    systemPrompt: CHECK_SYSTEM,
    userPrompt,
    tier: tierForContext(CONTEXTS.CONSISTENCY),
    maxTokens: 500,
  })
  return (reply || '').trim()
}

/**
 * Lightweight background consistency check for one scene against high-priority facts only.
 * Designed to be fire-and-forget after each save. Returns an array of contradiction strings,
 * or an empty array if nothing found. Returns null on AI/parse error (caller can ignore).
 *
 * @param {{ sceneId: string, storyId: string }} opts
 * @returns {Promise<string[] | null>}
 */
export async function quickConsistencyCheck({ sceneId, storyId }) {
  const [scene, allFacts] = await Promise.all([getScene(sceneId), getStoryFacts(storyId)])
  const sceneText = (scene?.content || '').trim()
  if (!sceneText || sceneText.length < 100) return null

  const highPriorityFacts = allFacts.filter((f) => f.priority === 'high' && f.resolved !== true)
  if (!highPriorityFacts.length) return []

  const factsBlock = highPriorityFacts.map((f) => `[${f.factType}] ${f.content}`).join('\n')

  const userPrompt = QUICK_CHECK_USER.replace('{{FACTS}}', factsBlock.slice(0, 3000)).replace(
    '{{SCENE_TEXT}}',
    sceneText.slice(0, 2500)
  )

  const raw = await completeWithAi({
    systemPrompt: QUICK_CHECK_SYSTEM,
    userPrompt,
    tier: tierForContext(CONTEXTS.CONSISTENCY),
    maxTokens: 300,
  })

  try {
    const cleaned = (raw || '').replace(/```\w*\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((s) => typeof s === 'string' && s.trim())
  } catch (_) {
    return null
  }
}
