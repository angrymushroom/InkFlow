/**
 * Novel Ingestion Pipeline
 *
 * 4-layer pipeline to extract structure from raw novel text:
 *   Layer 1: Chapter detection (regex-first, AI fallback)
 *   Layer 2: Per-chapter analysis (characters, scenes, summary) — up to 5 concurrent LIGHT calls
 *   Layer 3: Global merge (character dedup + structure/template detection)
 *   Layer 4: Deferred (extractFactsFromProse, generateSceneSummary triggered on first open)
 */

import { completeWithAi, TIERS } from './ai.js'
import { TEMPLATES } from '@/data/templates.js'

// ─── Layer 1: Chapter Detection ───────────────────────────────────────────────

const CHAPTER_PATTERNS = [
  // English: Chapter 1 / Chapter I / CHAPTER ONE
  /^(Chapter|CHAPTER)\s+(\d+|[IVXLCDM]+|[Oo]ne|[Tt]wo|[Tt]hree|[Ff]our|[Ff]ive|[Ss]ix|[Ss]even|[Ee]ight|[Nn]ine|[Tt]en|[Ee]leven|[Tt]welve)[^\n]*/gm,
  // Chinese: 第一章 / 第1节 / 第十回
  /^第[零一二三四五六七八九十百千\d]+[章节回篇][^\n]*/gm,
  // Act / Part: Act I / Part 1 / ACT TWO
  /^(Part|PART|ACT|Act|PART|SCENE|Scene)\s+\S[^\n]*/gm,
  // All-caps standalone title line (e.g. "PROLOGUE", "EPILOGUE", min 3 chars)
  /^[A-Z][A-Z\s]{2,30}$/gm,
  // Scene/section separators: ---, ***, * * *
  /^[ \t]*(\*\s*){2,}\*[ \t]*$|^[ \t]*-{3,}[ \t]*$|^[ \t]*—{3,}[ \t]*$/gm,
]

/**
 * Detect chapter boundaries using regex patterns.
 * Returns array of { title, startIndex } sorted by position.
 */
function detectChaptersWithRegex(text) {
  const matches = []
  const seen = new Set()

  for (const pattern of CHAPTER_PATTERNS) {
    pattern.lastIndex = 0
    let m
    while ((m = pattern.exec(text)) !== null) {
      if (!seen.has(m.index)) {
        seen.add(m.index)
        matches.push({ title: m[0].trim(), startIndex: m.index })
      }
    }
  }

  return matches.sort((a, b) => a.startIndex - b.startIndex)
}

/**
 * Layer 1: Split text into chapters.
 * Tries regex first; falls back to a single LIGHT AI call if fewer than 2 found.
 *
 * @param {string} text - Full novel text
 * @returns {Promise<Array<{ title: string, content: string }>>}
 */
export async function detectChapters(text) {
  const regexMatches = detectChaptersWithRegex(text)

  if (regexMatches.length >= 2) {
    return buildChaptersFromBoundaries(text, regexMatches)
  }

  // AI fallback: send first 10k chars, ask for boundaries
  try {
    const sample = text.slice(0, 10000)
    const response = await completeWithAi({
      systemPrompt:
        'You are a text structure analyzer. Identify chapter or section boundaries in the provided novel excerpt. Return ONLY a JSON array of objects with "title" (string) and "startIndex" (number, char position in the text). If no clear boundaries exist, return an empty array [].',
      userPrompt: `Find all chapter/section boundaries in this text:\n\n${sample}\n\nReturn JSON array only, no other text.`,
      tier: TIERS.LIGHT,
      maxTokens: 300,
    })
    const boundaries = parseJsonSafe(response, [])
    if (Array.isArray(boundaries) && boundaries.length >= 2) {
      return buildChaptersFromBoundaries(text, boundaries)
    }
  } catch {
    // AI failed — treat entire text as single chapter
  }

  // Fallback: single chapter
  return [{ title: 'Chapter 1', content: text.trim() }]
}

function buildChaptersFromBoundaries(text, boundaries) {
  const chapters = []
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i].startIndex
    const end = i + 1 < boundaries.length ? boundaries[i + 1].startIndex : text.length
    const content = text.slice(start, end).trim()
    if (content.length > 50) {
      chapters.push({ title: boundaries[i].title || `Chapter ${i + 1}`, content })
    }
  }

  // If text before first boundary is substantial, prepend as prologue
  if (boundaries.length > 0 && boundaries[0].startIndex > 200) {
    const prologueContent = text.slice(0, boundaries[0].startIndex).trim()
    if (prologueContent.length > 100) {
      chapters.unshift({ title: 'Prologue', content: prologueContent })
    }
  }

  return chapters.length > 0 ? chapters : [{ title: 'Chapter 1', content: text.trim() }]
}

// ─── Layer 2: Per-Chapter Analysis ───────────────────────────────────────────

const SCENE_SEPARATOR_RE = /^[ \t]*(\*\s*){2,}\*[ \t]*$|^[ \t]*-{3,}[ \t]*$|^[ \t]*—{3,}[ \t]*$/gm

/**
 * Analyze a single chapter for scenes, characters, and a summary.
 * Input is truncated to 4k chars to keep costs low.
 *
 * @param {string} title - Chapter title
 * @param {string} content - Chapter text
 * @param {number} index - Chapter index (for fallback naming)
 * @returns {Promise<{ scenes: string[], characters: {name:string,role:string}[], chapterSummary: string }>}
 */
async function analyzeChapter(title, content, index) {
  const sample = content.slice(0, 4000)

  // Detect scene separators via regex first
  const regexScenes = splitScenesWithRegex(content)

  try {
    const response = await completeWithAi({
      systemPrompt:
        'You are a literary analysis assistant. Analyze this chapter excerpt and return ONLY valid JSON — no markdown, no explanation.',
      userPrompt: `Analyze this chapter and return JSON with this exact shape:
{
  "characters": [{ "name": "string", "role": "protagonist|supporting|antagonist|minor" }],
  "chapterSummary": "2-3 sentence summary of this chapter"
}

Chapter title: ${title}
Chapter text:
${sample}

Return ONLY the JSON object.`,
      tier: TIERS.LIGHT,
      maxTokens: 400,
    })

    const parsed = parseJsonSafe(response, null)
    if (parsed && typeof parsed === 'object') {
      return {
        scenes: regexScenes,
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        chapterSummary: parsed.chapterSummary || '',
      }
    }
  } catch {
    // AI failed — return minimal structure
  }

  return {
    scenes: regexScenes,
    characters: [],
    chapterSummary: `Chapter ${index + 1}: ${title}`,
  }
}

function splitScenesWithRegex(content) {
  SCENE_SEPARATOR_RE.lastIndex = 0
  const scenes = []
  let lastEnd = 0
  let m
  while ((m = SCENE_SEPARATOR_RE.exec(content)) !== null) {
    const scene = content.slice(lastEnd, m.index).trim()
    if (scene.length > 50) scenes.push(scene)
    lastEnd = m.index + m[0].length
  }
  const remainder = content.slice(lastEnd).trim()
  if (remainder.length > 50) scenes.push(remainder)
  return scenes.length > 0 ? scenes : [content.trim()]
}

/**
 * Layer 2: Analyze all chapters in parallel (max 5 concurrent).
 *
 * @param {Array<{ title: string, content: string }>} chapters
 * @returns {Promise<Array<{ title, content, scenes, characters, chapterSummary }>>}
 */
export async function analyzeChapters(chapters) {
  const CONCURRENCY = 5
  const results = []

  for (let i = 0; i < chapters.length; i += CONCURRENCY) {
    const batch = chapters.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((ch, batchIdx) => analyzeChapter(ch.title, ch.content, i + batchIdx))
    )
    results.push(
      ...batchResults.map((r, batchIdx) => ({
        title: batch[batchIdx].title,
        content: batch[batchIdx].content,
        scenes: r.scenes,
        characters: r.characters,
        chapterSummary: r.chapterSummary,
      }))
    )
  }

  return results
}

// ─── Layer 3a: Character Deduplication ───────────────────────────────────────

/**
 * Merge raw character lists from all chapters into a deduplicated canonical list.
 * Max 20 characters returned.
 *
 * @param {Array<{name:string,role:string}[]>} charLists - One list per chapter
 * @returns {Promise<Array<{ canonicalName: string, aliases: string[], oneSentence: string, role: string }>>}
 */
export async function mergeCharacters(charLists) {
  const allChars = charLists.flat()
  if (allChars.length === 0) return []

  // Deduplicate by lowercased name before sending to AI
  const uniqueMap = new Map()
  for (const c of allChars) {
    const key = (c.name || '').toLowerCase().trim()
    if (key && !uniqueMap.has(key)) uniqueMap.set(key, c)
  }
  const uniqueChars = [...uniqueMap.values()].slice(0, 60)

  if (uniqueChars.length <= 1) {
    return uniqueChars.map((c) => ({
      canonicalName: c.name,
      aliases: [],
      oneSentence: '',
      role: c.role || 'supporting',
    }))
  }

  const charInput = uniqueChars.map((c) => `${c.name} (${c.role || 'unknown'})`).join('\n')

  try {
    const response = await completeWithAi({
      systemPrompt:
        'You are a literary analysis assistant. Merge character aliases and return ONLY valid JSON — no markdown, no explanation.',
      userPrompt: `These characters were extracted from a novel. Merge aliases (e.g. "Elizabeth" and "Elizabeth Bennet" are the same person). Return a JSON array (max 20) with this shape:
[{ "canonicalName": "Full Name", "aliases": ["Alias1"], "oneSentence": "brief description", "role": "protagonist|antagonist|supporting|minor" }]

Characters:
${charInput}

Return ONLY the JSON array.`,
      tier: TIERS.LIGHT,
      maxTokens: 400,
    })

    const parsed = parseJsonSafe(response, null)
    if (Array.isArray(parsed)) return parsed.slice(0, 20)
  } catch {
    // Fall through to basic dedup
  }

  // Fallback: return unique chars as-is
  return uniqueChars.slice(0, 20).map((c) => ({
    canonicalName: c.name,
    aliases: [],
    oneSentence: '',
    role: c.role || 'supporting',
  }))
}

// ─── Layer 3b: Template / Structure Detection ─────────────────────────────────

const TEMPLATE_DESCRIPTIONS = Object.entries(TEMPLATES)
  .map(([id, t]) => `${id}: ${t.aiDescription}`)
  .join('\n\n')

/**
 * Detect which writing template best matches the novel structure.
 * Returns templateId, confidence (0-1), and partially filled spine fields.
 *
 * @param {string[]} chapterSummaries
 * @param {string} novelTitle
 * @returns {Promise<{ templateId: string, confidence: number, spine: Record<string,string> }>}
 */
export async function detectTemplate(chapterSummaries, novelTitle = '') {
  const summaryText = chapterSummaries
    .slice(0, 20)
    .map((s, i) => `Ch${i + 1}: ${s}`)
    .join('\n')

  try {
    const response = await completeWithAi({
      systemPrompt:
        'You are a narrative structure analyst. Identify which writing template best matches the novel and fill in spine fields. Return ONLY valid JSON — no markdown.',
      userPrompt: `Novel: "${novelTitle || 'Unknown'}"

Chapter summaries:
${summaryText}

Available templates:
${TEMPLATE_DESCRIPTIONS}

Return JSON with this shape (fill spine fields based on the summaries):
{
  "templateId": "one of: snowflake|save_the_cat|story_circle|hero_journey|kishotenketsu",
  "confidence": 0.0-1.0,
  "spine": { "field1": "value", "field2": "value" }
}

The spine keys must match the template's spineFields keys. Return ONLY the JSON.`,
      tier: TIERS.LIGHT,
      maxTokens: 400,
    })

    const parsed = parseJsonSafe(response, null)
    if (
      parsed &&
      typeof parsed.templateId === 'string' &&
      TEMPLATES[parsed.templateId] &&
      typeof parsed.confidence === 'number'
    ) {
      return {
        templateId: parsed.templateId,
        confidence: Math.min(1, Math.max(0, parsed.confidence)),
        spine: parsed.spine || {},
      }
    }
  } catch {
    // Fall through to default
  }

  return { templateId: 'snowflake', confidence: 0.3, spine: {} }
}

// ─── Full Pipeline ─────────────────────────────────────────────────────────────

/**
 * Run the full ingestion pipeline on raw novel text.
 *
 * @param {string} text - Raw novel text
 * @param {string} [title] - Optional title hint
 * @param {function} [onProgress] - Called with (step: string, pct: number)
 * @returns {Promise<IngestionResult>}
 *
 * @typedef {Object} IngestionResult
 * @property {Array<{ title:string, content:string, scenes:string[], chapterSummary:string }>} chapters
 * @property {Array<{ canonicalName:string, aliases:string[], oneSentence:string, role:string }>} characters
 * @property {string} templateId
 * @property {number} templateConfidence
 * @property {Record<string,string>} spine
 * @property {boolean} lowConfidence - true if templateConfidence < 0.6
 */
export async function runIngestionPipeline(text, title = '', onProgress = () => {}) {
  onProgress('detecting_chapters', 10)
  const chapters = await detectChapters(text)

  onProgress('analyzing_chapters', 30)
  const analyzedChapters = await analyzeChapters(chapters)

  onProgress('merging_characters', 70)
  const charLists = analyzedChapters.map((ch) => ch.characters)
  const characters = await mergeCharacters(charLists)

  onProgress('detecting_structure', 85)
  const summaries = analyzedChapters.map((ch) => ch.chapterSummary)
  const { templateId, confidence, spine } = await detectTemplate(summaries, title)

  onProgress('done', 100)

  return {
    chapters: analyzedChapters,
    characters,
    templateId,
    templateConfidence: confidence,
    spine,
    lowConfidence: confidence < 0.6,
  }
}

// ─── DB Write ─────────────────────────────────────────────────────────────────

/**
 * Write ingestion results into the DB for the given story.
 * Clears existing chapters/scenes/characters for the story first.
 *
 * @param {string} storyId
 * @param {IngestionResult} result
 * @param {string} storyTitle
 */
export async function writeIngestionToDb(storyId, result, storyTitle) {
  const {
    addChapter,
    addScene,
    addCharacter,
    saveStory,
    deleteChapter,
    getChapters,
    deleteCharacter,
    getCharacters,
  } = await import('@/db/index.js')
  const { TEMPLATES } = await import('@/data/templates.js')

  // Clear existing chapters/characters
  const existingChapters = await getChapters(storyId)
  for (const ch of existingChapters) await deleteChapter(ch.id)
  const existingChars = await getCharacters(storyId)
  for (const c of existingChars) await deleteCharacter(c.id)

  // Write template + spine to story
  const tpl = TEMPLATES[result.templateId] ?? TEMPLATES.snowflake
  const templateFields = {}
  const directFields = {}

  for (const field of tpl.spineFields) {
    const spineValue = result.spine[field.key] || ''
    if (field.prop.startsWith('templateFields.')) {
      const k = field.prop.slice('templateFields.'.length)
      templateFields[k] = spineValue
    } else {
      directFields[field.prop] = spineValue
    }
  }

  await saveStory({
    id: storyId,
    title: storyTitle || undefined,
    template: result.templateId,
    templateFields,
    ...directFields,
  })

  // Write characters
  for (const char of result.characters) {
    await addCharacter({
      storyId,
      name: char.canonicalName,
      oneSentence: char.oneSentence || '',
      role: char.role || '',
      _aiGenerated: true,
    })
  }

  // Write chapters + scenes
  const beatKeys = tpl.beats.map((b) => b.key)
  const chapterCount = result.chapters.length
  for (let i = 0; i < chapterCount; i++) {
    const ch = result.chapters[i]
    // Distribute chapters evenly across beats
    const beatIndex = Math.floor((i / chapterCount) * beatKeys.length)
    const beat = beatKeys[beatIndex] || beatKeys[0] || null

    const chapter = await addChapter({
      storyId,
      title: ch.title,
      order: i,
      beat,
      aiSummary: ch.chapterSummary || '',
      _aiGenerated: true,
    })

    for (let j = 0; j < ch.scenes.length; j++) {
      await addScene({
        chapterId: chapter.id,
        title: `Scene ${j + 1}`,
        content: ch.scenes[j],
        order: j,
        beat,
        _aiGenerated: true,
      })
    }
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseJsonSafe(text, fallback) {
  if (!text) return fallback
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    return JSON.parse(cleaned)
  } catch {
    // Try extracting JSON object/array with regex
    const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[1])
      } catch {
        return fallback
      }
    }
    return fallback
  }
}
