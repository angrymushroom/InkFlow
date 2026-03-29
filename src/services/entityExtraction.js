import { getIdeas } from '@/db'
import { completeWithAi, CONTEXTS, tierForContext } from '@/services/ai'

const EXTRACT_SYSTEM =
  'You are a story entity extractor for a novel writing tool. ' +
  'Given a passage of fiction and a list of already-known entity names, ' +
  'identify NEW named entities that appear in the text but are NOT in the known list. ' +
  'Reply with valid JSON only — no markdown, no preamble, no explanation.'

const EXTRACT_USER = `Known entities (do NOT re-suggest these):
{{KNOWN}}

Fiction text:
{{TEXT}}

Identify new named entities — proper nouns, named places, named items, named groups, named concepts — that appear in the text but are NOT in the known list.

Rules:
- Skip generic nouns like "door", "table", "man", "sword" — only named, specific things
- Skip pronouns and vague references ("he", "the city", "the forest")
- Only return entities NOT already in the known list (case-insensitive match counts as known)
- "description" must be ONE short sentence based only on what the text reveals
- "type" must be exactly one of: character / location / world / magic_system / symbol / mystery / other

Return JSON: {"entities":[{"name":string,"type":string,"description":string}]}
If nothing new found, return: {"entities":[]}

JSON:`

/**
 * Extract new entity suggestions from a piece of text.
 * Compares against existing ideas to avoid re-suggesting known items.
 *
 * @param {{ sceneText: string, storyId: string }} opts
 * @returns {Promise<Array<{ name: string, type: string, description: string }>>}
 */
export async function extractNewEntities({ sceneText, storyId }) {
  if (!sceneText?.trim() || sceneText.trim().length < 30) return []

  const ideas = await getIdeas(storyId)
  const knownNames = ideas.map((i) => (i.title || '').trim()).filter(Boolean)
  const knownBlock = knownNames.length ? knownNames.join(', ') : '(none yet)'

  const userPrompt = EXTRACT_USER.replace('{{KNOWN}}', knownBlock.slice(0, 2000)).replace(
    '{{TEXT}}',
    sceneText.slice(0, 6000)
  )

  let raw
  try {
    raw = await completeWithAi({
      systemPrompt: EXTRACT_SYSTEM,
      userPrompt,
      tier: tierForContext(CONTEXTS.CONSISTENCY),
      maxTokens: 500,
    })
  } catch {
    return []
  }

  try {
    const cleaned = (raw || '').replace(/```\w*\n?/g, '').trim()
    const json = JSON.parse(cleaned)
    const entities = Array.isArray(json?.entities) ? json.entities : []

    const VALID_TYPES = new Set([
      'character',
      'location',
      'world',
      'magic_system',
      'symbol',
      'mystery',
      'other',
    ])

    const lowerKnown = knownNames.map((k) => k.toLowerCase())

    return entities
      .filter((e) => typeof e?.name === 'string' && e.name.trim().length > 0)
      .map((e) => ({
        name: e.name.trim(),
        type: VALID_TYPES.has(e.type) ? e.type : 'other',
        description: typeof e.description === 'string' ? e.description.trim() : '',
      }))
      .filter((e) => !lowerKnown.includes(e.name.toLowerCase()))
      .slice(0, 8)
  } catch {
    return []
  }
}
