import {
  getStoryById,
  saveStory,
  getCharacters,
  addCharacter,
  updateCharacter,
  getChapters,
  addChapter,
  updateChapter,
  reorderChapters,
  getScenes,
  addScene,
  updateScene,
  addIdea,
  getCurrentStoryId,
  getStoryFacts,
  getOpenThreads,
} from '@/db'
import { TEMPLATES, getTemplate, setSpineFieldPatch, getSpineFieldValue } from '@/data/templates'
import { useStoryStore } from '@/stores/story.js'
import { useOutlineStore } from '@/stores/outline.js'
import { useCharactersStore } from '@/stores/characters.js'
import { useIdeasStore } from '@/stores/ideas.js'
import { completeWithAi, tierForContext, CONTEXTS } from '@/services/ai'

const ACTION_RE = /<pip-action>([\s\S]*?)<\/pip-action>/g

/**
 * Extract <pip-action> tags from AI response text.
 * Returns cleaned text (tags removed) and parsed action objects.
 */
export function parseActions(text) {
  const actions = []
  const cleanText = text
    .replace(ACTION_RE, (_, json) => {
      try {
        actions.push(JSON.parse(json.trim()))
      } catch {
        /* ignore malformed */
      }
      return ''
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { cleanText, actions }
}

/** Human-readable label for an action chip. */
export function actionLabel(action) {
  if (action.type === 'update_spine') {
    const keys = Object.keys(action.fields || {})
    return `Update story spine${keys.length ? ` (${keys.join(', ')})` : ''}`
  }
  if (action.type === 'upsert_character') return `Character "${action.name}"`
  if (action.type === 'add_chapter') return `Add chapter "${action.title}"`
  if (action.type === 'update_chapter') return `Update chapter "${action.title_match}"`
  if (action.type === 'add_idea') return `Add idea "${action.title}"`
  if (action.type === 'add_scene')
    return `Add scene "${action.title}" → "${action.chapter_title_match}"`
  if (action.type === 'update_scene') return `Update scene "${action.title_match}"`
  if (action.type === 'recommend_template') return `Switch to ${action.template} template`
  return action.type
}

/**
 * Apply a single Pip action to the DB.
 * @param {{ raw: object, storyId: string }} actionObj
 * @returns {Promise<string>} result label
 */
export async function applySingleAction(actionObj) {
  const action = actionObj.raw
  const storyId = actionObj.storyId || getCurrentStoryId()

  if (action.type === 'update_spine' && action.fields && typeof action.fields === 'object') {
    const current = await getStoryById(storyId)
    if (!current) throw new Error('No story found')
    const tpl = getTemplate(current)
    const validKeys = tpl.spineFields.map((f) => f.key)
    let merged = { ...current }
    const updatedKeys = []
    for (const [key, val] of Object.entries(action.fields)) {
      if (!validKeys.includes(key)) continue
      const field = tpl.spineFields.find((f) => f.key === key)
      if (!field) continue
      const patch = setSpineFieldPatch(merged, field.prop, String(val))
      merged = { ...merged, ...patch }
      updatedKeys.push(key)
    }
    if (updatedKeys.length === 0) throw new Error('No valid spine fields to update')
    await saveStory(merged)
    useStoryStore().loadActiveStory()
    return `Story spine updated (${updatedKeys.join(', ')})`
  }

  if (action.type === 'recommend_template' && action.template) {
    const templateId = String(action.template)
    if (!TEMPLATES[templateId]) throw new Error(`Unknown template: "${templateId}"`)
    const current = await getStoryById(storyId)
    if (!current) throw new Error('No story found')
    await saveStory({
      ...current,
      template: templateId,
      templateFields: current.templateFields ?? {},
    })
    useStoryStore().loadActiveStory()
    return `Switched to ${templateId.replace(/_/g, ' ')} template`
  }

  if (action.type === 'upsert_character' && action.name) {
    const name = String(action.name).trim()
    const existing = await getCharacters(storyId)
    const match = existing.find((c) => c.name?.toLowerCase() === name.toLowerCase())
    const CHAR_KEYS = ['oneSentence', 'goal', 'motivation', 'conflict', 'epiphany']
    const fields = {}
    for (const key of CHAR_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key])
    }
    if (match) {
      await updateCharacter(match.id, { name, ...fields })
      useCharactersStore().load()
      return `Character "${name}" updated`
    } else {
      await addCharacter({ storyId, name, ...fields })
      useCharactersStore().load()
      return `Character "${name}" created`
    }
  }

  if (action.type === 'add_chapter' && action.title) {
    const title = String(action.title).trim()
    const fields = {}
    for (const key of ['beat', 'summary']) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key])
      else if (action[key] != null) fields[key] = String(action[key])
    }
    const newChapter = await addChapter({ storyId, title, ...fields })
    if (action.after_chapter_title) {
      const allChapters = await getChapters(storyId)
      const afterIdx = allChapters.findIndex(
        (c) =>
          c.id !== newChapter.id &&
          c.title?.toLowerCase() === String(action.after_chapter_title).toLowerCase()
      )
      if (afterIdx >= 0) {
        const withoutNew = allChapters.filter((c) => c.id !== newChapter.id)
        const reordered = [
          ...withoutNew.slice(0, afterIdx + 1),
          newChapter,
          ...withoutNew.slice(afterIdx + 1),
        ]
        await reorderChapters(
          storyId,
          reordered.map((c) => c.id)
        )
      }
    }
    useOutlineStore().load(storyId)
    return `Chapter "${title}" added`
  }

  if (action.type === 'update_chapter' && action.title_match) {
    const existing = await getChapters(storyId)
    const match = existing.find(
      (c) => c.title?.toLowerCase() === String(action.title_match).toLowerCase()
    )
    if (!match) throw new Error(`Chapter not found: "${action.title_match}"`)
    const fields = {}
    for (const key of ['title', 'beat', 'summary']) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key])
    }
    if (Object.keys(fields).length === 0) throw new Error('No fields to update')
    await updateChapter(match.id, fields)
    useOutlineStore().load(storyId)
    return `Chapter "${match.title}" updated`
  }

  if (action.type === 'add_scene' && action.title && action.chapter_title_match) {
    const chapters = await getChapters(storyId)
    const chapter = chapters.find(
      (c) => c.title?.toLowerCase() === String(action.chapter_title_match).toLowerCase()
    )
    if (!chapter) throw new Error(`Chapter not found: "${action.chapter_title_match}"`)
    const title = String(action.title).trim()
    const fields = {}
    for (const key of ['oneSentenceSummary', 'notes']) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key])
      else if (action[key] != null) fields[key] = String(action[key])
    }
    await addScene({ chapterId: chapter.id, title, ...fields })
    useOutlineStore().load(storyId)
    return `Scene "${title}" added to "${chapter.title}"`
  }

  if (action.type === 'update_scene' && action.title_match) {
    const allScenes = await getScenes(storyId)
    let match = null
    if (action.chapter_title_match) {
      const chapters = await getChapters(storyId)
      const chapter = chapters.find(
        (c) => c.title?.toLowerCase() === String(action.chapter_title_match).toLowerCase()
      )
      if (chapter) {
        match = allScenes.find(
          (s) =>
            s.chapterId === chapter.id &&
            s.title?.toLowerCase() === String(action.title_match).toLowerCase()
        )
      }
    }
    if (!match)
      match = allScenes.find(
        (s) => s.title?.toLowerCase() === String(action.title_match).toLowerCase()
      )
    if (!match) throw new Error(`Scene not found: "${action.title_match}"`)
    const fields = {}
    for (const key of ['title', 'oneSentenceSummary', 'notes']) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key])
    }
    if (Object.keys(fields).length === 0) throw new Error('No fields to update')
    await updateScene(match.id, fields)
    useOutlineStore().load(storyId)
    return `Scene "${match.title}" updated`
  }

  if (action.type === 'add_idea' && action.title) {
    const VALID_TYPES = [
      'plot',
      'subplot',
      'scene',
      'event',
      'character',
      'relationship',
      'faction',
      'world',
      'location',
      'culture',
      'item',
      'creature',
      'magic_system',
      'technology',
      'concept',
      'conflict',
      'mystery',
      'symbol',
      'prophecy',
      'other',
    ]
    const title = String(action.title).trim()
    const ideaType = VALID_TYPES.includes(action.idea_type) ? action.idea_type : 'plot'
    const body = action.body ? String(action.body) : ''
    await addIdea({ storyId, type: ideaType, title, body })
    useIdeasStore().load()
    return `Idea "${title}" added`
  }

  throw new Error(`Unknown action: ${action.type}`)
}

/**
 * Analyze the story outline for structural issues and return AI analysis.
 * @param {string} storyId
 * @returns {Promise<string>}
 */
export async function analyzeOutlineStructure(storyId) {
  const [story, chapters, scenes, storyFacts, openThreads] = await Promise.all([
    getStoryById(storyId),
    getChapters(storyId),
    getScenes(storyId),
    getStoryFacts(storyId),
    getOpenThreads(storyId),
  ])

  const lines = []

  if (story) {
    const tpl = getTemplate(story)
    const spineLines = tpl.spineFields
      .map((f) => {
        const val = getSpineFieldValue(story, f.prop)
        return val.trim() ? `${f.key}: ${val.slice(0, 300)}` : null
      })
      .filter(Boolean)
    if (spineLines.length) {
      lines.push('=== STORY SPINE ===')
      lines.push(...spineLines)
    }
  }

  if (chapters?.length) {
    lines.push('\n=== OUTLINE ===')
    const byChapter = new Map()
    for (const s of scenes || []) {
      const list = byChapter.get(s.chapterId) || []
      list.push(s)
      byChapter.set(s.chapterId, list)
    }
    for (const ch of chapters) {
      lines.push(`Chapter: ${ch.title || 'Untitled'}${ch.beat ? ` [${ch.beat}]` : ''}`)
      if (ch.summary) lines.push(`  Summary: ${ch.summary.slice(0, 200)}`)
      const scs = byChapter.get(ch.id) || []
      for (const sc of scs) {
        lines.push(`  Scene: ${sc.title || 'Untitled'}${sc.content?.trim() ? ' ✓' : ''}`)
        if (sc.oneSentenceSummary) lines.push(`    ${sc.oneSentenceSummary.slice(0, 120)}`)
      }
    }
  }

  if (storyFacts?.length) {
    lines.push('\n=== ESTABLISHED FACTS ===')
    storyFacts.slice(0, 10).forEach((f) => lines.push(`- [${f.factType}] ${f.content.slice(0, 120)}`))
  }

  if (openThreads?.length) {
    lines.push('\n=== OPEN THREADS ===')
    openThreads.forEach((t) => lines.push(`- ${t.content.slice(0, 120)}`))
  }

  if (lines.length === 0) return '📋 **Outline Analysis**\n\nNot enough outline data to analyze. Add chapters and scenes with summaries first.'

  const systemPrompt = 'You are an experienced story editor reviewing a novel outline. Analyze the structure for: plot holes, unresolved open threads, missing cause-effect logic, pacing issues, and character motivation gaps. Be specific and constructive. Reference actual chapter/scene titles. Aim for 3–5 focused, actionable observations.'
  const userPrompt = `Here is the current outline:\n\n${lines.join('\n')}\n\nProvide a structural analysis.`

  const result = await completeWithAi({
    systemPrompt,
    userPrompt,
    tier: tierForContext(CONTEXTS.OUTLINE_ANALYSIS),
    maxTokens: 1200,
  })

  return `📋 **Outline Analysis**\n\n${(result || '').trim() || 'No structural issues found.'}`
}
