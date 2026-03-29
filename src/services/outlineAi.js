import { getStoryById, getIdeas, getCharacters, getChapters, getScenes } from '@/db'
import { completeWithAi, TIERS, CONTEXTS, tierForContext, getLanguageRule } from '@/services/ai'
import { getTemplate, buildSpineSummary } from '@/data/templates'

const STORAGE_LOCALE = 'inkflow_locale'

function getSettingsLocale() {
  try {
    return localStorage.getItem(STORAGE_LOCALE) || 'en'
  } catch {
    return 'en'
  }
}

const CJK_RE = /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/g
const LATIN_WORD_RE = /[a-zA-ZÀ-ÿ]+/g

/**
 * Detect the dominant writing language from actual user content.
 * Falls back to the Settings locale when content is absent or ambiguous.
 */
function detectContentLocale(story, ideas, characters, settingsLocale) {
  const tpl = getTemplate(story)
  // Collect all spine text regardless of template
  const spineText = tpl.spineFields
    .map((f) => {
      if (f.prop.startsWith('templateFields.')) {
        const key = f.prop.slice('templateFields.'.length)
        return story?.templateFields?.[key] || ''
      }
      return story?.[f.prop] || ''
    })
    .join(' ')

  const sample = [
    spineText,
    ...(ideas || []).map((i) => `${i.title || ''} ${i.body || ''}`),
    ...(characters || []).map((c) =>
      [c.name, c.oneSentence, c.goal, c.motivation, c.conflict, c.epiphany]
        .filter(Boolean)
        .join(' ')
    ),
  ]
    .filter(Boolean)
    .join(' ')

  const cjkWords = (sample.match(CJK_RE) || []).length
  const latinWords = (sample.match(LATIN_WORD_RE) || []).length

  if (cjkWords > 0 && cjkWords >= latinWords) return 'zh'
  return settingsLocale || 'en'
}

function stripCodeFences(s) {
  return (s || '')
    .replace(/```[\s\S]*?\n/g, '```')
    .replace(/```/g, '')
    .trim()
}

function extractJsonObject(s) {
  const text = (s || '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text
}

export function parseOutlineDraftJson(raw) {
  const base = extractJsonObject(stripCodeFences(raw))
  try {
    return JSON.parse(base)
  } catch {
    const fixed = base.replace(/,\s*([}\]])/g, '$1')
    return JSON.parse(fixed)
  }
}

// Snowflake beats exported for backwards compatibility with tests and other consumers.
export const OUTLINE_BEATS = Object.freeze([
  'setup',
  'disaster1',
  'disaster2',
  'disaster3',
  'ending',
])

export function validateOutlineDraft(draft, beatsOrScope = 'all', scope = 'all') {
  // Backwards-compat: old signature was (draft, scope) where scope was a string.
  let beats, actualScope
  if (typeof beatsOrScope === 'string') {
    beats = OUTLINE_BEATS
    actualScope = beatsOrScope
  } else {
    beats = beatsOrScope
    actualScope = scope
  }

  if (!draft || typeof draft !== 'object') throw new Error('AI draft is not an object.')
  if (!draft.sections || typeof draft.sections !== 'object')
    throw new Error('AI draft JSON must include "sections".')

  for (const b of beats) {
    const v = draft.sections[b]
    if (v == null) continue
    if (!Array.isArray(v)) throw new Error(`AI draft sections.${b} must be an array.`)
    for (const ch of v) {
      if (!ch || typeof ch !== 'object')
        throw new Error(`AI draft sections.${b} contains an invalid chapter.`)
      if (ch.chapterTitle != null && typeof ch.chapterTitle !== 'string')
        throw new Error(`AI draft chapterTitle must be a string (section ${b}).`)
      if (ch.chapterSummary != null && typeof ch.chapterSummary !== 'string')
        throw new Error(`AI draft chapterSummary must be a string (section ${b}).`)
      if (ch.scenes != null && !Array.isArray(ch.scenes))
        throw new Error(`AI draft scenes must be an array (section ${b}).`)
      if (Array.isArray(ch.scenes)) {
        for (const sc of ch.scenes) {
          if (!sc || typeof sc !== 'object')
            throw new Error(`AI draft has an invalid scene (section ${b}).`)
          if (sc.title != null && typeof sc.title !== 'string')
            throw new Error(`AI draft scene title must be a string (section ${b}).`)
          if (sc.oneSentence != null && typeof sc.oneSentence !== 'string')
            throw new Error(`AI draft scene oneSentence must be a string (section ${b}).`)
          if (sc.notes != null && typeof sc.notes !== 'string')
            throw new Error(`AI draft scene notes must be a string (section ${b}).`)
        }
      }
    }
  }

  if (actualScope !== 'all' && !beats.includes(actualScope)) {
    throw new Error(`Invalid scope. Must be "all" or one of: ${beats.join(', ')}.`)
  }

  return true
}

function buildExistingOutlineBlurb(chapters, scenes) {
  if (!chapters?.length) return '(No chapters yet)'
  const scenesByChapter = new Map()
  for (const sc of scenes || []) {
    const list = scenesByChapter.get(sc.chapterId) || []
    list.push(sc)
    scenesByChapter.set(sc.chapterId, list)
  }
  const lines = []
  for (const ch of chapters) {
    const beat = ch.beat || 'ungrouped'
    const chTitle = (ch.title || 'Untitled').slice(0, 80)
    const chSummary = (ch.summary || '').slice(0, 180)
    lines.push(`- [${beat}] ${chTitle}${chSummary ? ` — ${chSummary}` : ''}`)
    const scs = scenesByChapter.get(ch.id) || []
    for (const sc of scs) {
      const st = (sc.title || 'Untitled scene').slice(0, 80)
      const one = (sc.oneSentenceSummary || '').slice(0, 140)
      lines.push(`  - Scene: ${st}${one ? ` — ${one}` : ''}`)
    }
  }
  return lines.join('\n')
}

function buildDraftPrompt({ story, ideas, characters, existingOutline, beats, scope, locale }) {
  const langRule = getLanguageRule(locale || 'en')
  const tpl = getTemplate(story)
  const spineSummary = buildSpineSummary(story)

  const charsBlurb = characters?.length
    ? characters
        .map((c) => {
          const lines = [`- ${c.name || 'Unnamed'}: ${(c.oneSentence || '').slice(0, 180)}`]
          if (c.goal?.trim()) lines.push(`  Goal: ${c.goal.slice(0, 140)}`)
          if (c.motivation?.trim()) lines.push(`  Motivation: ${c.motivation.slice(0, 140)}`)
          if (c.conflict?.trim()) lines.push(`  Conflict: ${c.conflict.slice(0, 140)}`)
          if (c.epiphany?.trim()) lines.push(`  Epiphany: ${c.epiphany.slice(0, 140)}`)
          return lines.join('\n')
        })
        .join('\n\n')
    : '(No characters yet)'

  const ideasBlurb = ideas?.length
    ? ideas
        .map((i) => `- [${i.type}] ${i.title || 'Untitled'}: ${(i.body || '').slice(0, 400)}`)
        .join('\n')
    : '(No idea cards yet)'

  // Build per-beat descriptions from template config
  const beatDescriptions = beats
    .map((beatKey) => {
      const beatCfg = tpl.beats.find((b) => b.key === beatKey)
      const spineField = tpl.spineFields.find((f) => f.key === beatCfg?.spineRef)
      let spineVal = ''
      if (spineField) {
        if (spineField.prop.startsWith('templateFields.')) {
          const k = spineField.prop.slice('templateFields.'.length)
          spineVal = story?.templateFields?.[k] || ''
        } else {
          spineVal = story?.[spineField.prop] || ''
        }
      }
      return `  ${beatKey}: ${spineVal || '(Not filled)'}`
    })
    .join('\n')

  let scopeInstruction
  if (scope === 'all') {
    scopeInstruction =
      `Draft chapters and scenes for ALL ${beats.length} sections: ${beats.join(', ')}.\n` +
      'Ensure each section flows logically into the next, forming a complete arc. ' +
      'Aim for 2–4 chapters per section with 2–4 scenes each.'
  } else {
    const spineForSection = (() => {
      const beatCfg = tpl.beats.find((b) => b.key === scope)
      const spineField = tpl.spineFields.find((f) => f.key === beatCfg?.spineRef)
      if (!spineField) return '(Not filled)'
      if (spineField.prop.startsWith('templateFields.')) {
        const k = spineField.prop.slice('templateFields.'.length)
        return story?.templateFields?.[k] || '(Not filled)'
      }
      return story?.[spineField.prop] || '(Not filled)'
    })()

    scopeInstruction =
      `Your task: draft chapters and scenes ONLY for the "${scope}" section.\n` +
      `This section's spine text: "${spineForSection}"\n` +
      `The full spine above gives you the complete narrative context — do NOT draft content for any other section.\n` +
      `Return empty arrays [] for all other sections in the JSON.\n` +
      `Aim for 2–4 chapters with 2–4 scenes each, each scene advancing this specific beat.`
  }

  // Build the JSON schema example dynamically
  const firstBeat = beats[0] || 'setup'
  const restBeats = beats.slice(1)
  const jsonSchema =
    `{\n  "sections": {\n` +
    `    "${firstBeat}": [\n` +
    `      { "chapterTitle": "...", "chapterSummary": "...", "scenes": [\n` +
    `        { "title": "...", "oneSentence": "...", "notes": "..." }\n` +
    `      ]}\n` +
    `    ]` +
    (restBeats.length ? `,\n` + restBeats.map((b) => `    "${b}": []`).join(',\n') : '') +
    `\n  }\n}`

  const systemPrompt =
    `You are an expert fiction story outliner. ` +
    `The writer is using the ${tpl.id} template: ${tpl.aiDescription} ` +
    'First read the full story spine to understand the complete narrative arc. ' +
    'Then generate a structural outline: chapter summaries describe what happens and why it matters (2–3 sentences). ' +
    'Scene one-sentences describe one complete dramatic beat (who does what, what changes). ' +
    'Scene notes give specific writing guidance: POV hints, key dialogue beats, or turning-point details. ' +
    'Stay consistent with all characters, ideas, and the spine. ' +
    'Return VALID JSON only — no markdown, no code fences, no text outside the JSON object. ' +
    langRule

  const userPrompt =
    `=== FULL STORY SPINE (Template: ${tpl.id}) ===\n${spineSummary}\n\n` +
    `=== BEAT SECTIONS OVERVIEW ===\n${beatDescriptions}\n\n` +
    `=== CHARACTERS ===\n${charsBlurb}\n\n` +
    `=== IDEA CARDS ===\n${ideasBlurb}\n\n` +
    `=== EXISTING OUTLINE (complement gaps; do not duplicate) ===\n${existingOutline}\n\n` +
    `=== YOUR TASK ===\n${scopeInstruction}\n\n` +
    `Output this exact JSON schema (all text values must be in the required language):\n${jsonSchema}\n`

  return { systemPrompt, userPrompt }
}

/**
 * Draft a structured outline from a story spine.
 * Template-aware: uses the story's current writing template to determine beats and prompts.
 *
 * @param {{ storyId: string, scope?: 'all'|string }} opts
 * @returns {Promise<{ sections: Record<string, any[]> }>}
 */
export async function draftOutlineFromSpine({ storyId, scope = 'all' }) {
  const [story, ideas, characters, chapters, scenes] = await Promise.all([
    getStoryById(storyId),
    getIdeas(storyId),
    getCharacters(storyId),
    getChapters(storyId),
    getScenes(storyId),
  ])
  if (!story) throw new Error('Story not found.')

  const tpl = getTemplate(story)
  const beats = tpl.beats.map((b) => b.key)

  const locale = detectContentLocale(story, ideas, characters, getSettingsLocale())
  const existingOutline = buildExistingOutlineBlurb(chapters, scenes)
  const { systemPrompt, userPrompt } = buildDraftPrompt({
    story,
    ideas,
    characters,
    existingOutline,
    beats,
    scope,
    locale,
  })

  const tier =
    scope === 'all'
      ? tierForContext(CONTEXTS.OUTLINE_DRAFT_FULL)
      : tierForContext(CONTEXTS.OUTLINE_DRAFT_SECTION)
  const maxTokens = scope === 'all' ? 4000 : 2000

  const raw = await completeWithAi({ systemPrompt, userPrompt, tier, maxTokens })

  let draft
  try {
    draft = parseOutlineDraftJson(raw)
  } catch (e) {
    throw new Error(
      'AI returned invalid JSON. Try again or switch to a stronger model in Settings → AI.'
    )
  }
  validateOutlineDraft(draft, beats, scope)

  // Normalize missing sections to empty arrays
  const normalized = { sections: {} }
  for (const b of beats) {
    normalized.sections[b] = Array.isArray(draft.sections?.[b]) ? draft.sections[b] : []
  }
  return normalized
}
