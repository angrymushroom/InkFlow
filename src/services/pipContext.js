import { getStoryById, getIdeas, getCharacters, getChapters, getScenes } from '@/db'
import { getTemplate, getSpineFieldValue, getValidBeatKeys } from '@/data/templates'

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + '…' : s || ''
}

/**
 * Load all story context for Pip's system prompt.
 *
 * @param {string} storyId
 * @returns {Promise<{
 *   storyObj: object|null,
 *   title: string,
 *   context: string,
 *   hasContent: boolean,
 *   welcomeMessage: string,
 * }>}
 */
export async function loadPipContext(storyId) {
  const [story, ideas, characters, chapters, scenes] = await Promise.all([
    getStoryById(storyId),
    getIdeas(storyId),
    getCharacters(storyId),
    getChapters(storyId),
    getScenes(storyId),
  ])

  if (!story)
    return {
      storyObj: null,
      title: 'Story companion',
      context: '',
      hasContent: false,
      welcomeMessage: '',
    }

  const title = truncate(story.title || 'Untitled story', 28)
  const lines = []
  let hasContent = false

  // Template-aware spine
  const tpl = getTemplate(story)
  const spineFields = tpl.spineFields
    .map((f) => [f.key, getSpineFieldValue(story, f.prop)])
    .filter(([, v]) => v?.trim())

  if (spineFields.length) {
    lines.push(`=== STORY SPINE (Template: ${story.template ?? 'snowflake'}) ===`)
    for (const [key, val] of spineFields) {
      lines.push(`${key}: ${truncate(val, 300)}`)
    }
    hasContent = true
  }

  if (characters?.length) {
    lines.push('\n=== CHARACTERS ===')
    for (const c of characters.slice(0, 10)) {
      const parts = [`- ${c.name || 'Unnamed'}`]
      if (c.oneSentence) parts.push(truncate(c.oneSentence, 120))
      if (c.goal) parts.push(`Goal: ${truncate(c.goal, 80)}`)
      if (c.epiphany) parts.push(`Epiphany: ${truncate(c.epiphany, 80)}`)
      lines.push(parts.join(' | '))
    }
    hasContent = true
  }

  if (ideas?.length) {
    lines.push('\n=== IDEAS ===')
    for (const idea of ideas.slice(0, 15)) {
      lines.push(`- [${idea.type}] ${idea.title || 'Untitled'}: ${truncate(idea.body, 120)}`)
    }
    hasContent = true
  }

  if (chapters?.length) {
    lines.push('\n=== OUTLINE ===')
    const scenesByChapter = new Map()
    for (const sc of scenes || []) {
      const list = scenesByChapter.get(sc.chapterId) || []
      list.push(sc)
      scenesByChapter.set(sc.chapterId, list)
    }
    for (const ch of chapters.slice(0, 20)) {
      const beat = ch.beat ? ` [${ch.beat}]` : ''
      lines.push(`Chapter: ${truncate(ch.title || 'Untitled', 60)}${beat}`)
      if (ch.summary) lines.push(`  Summary: ${truncate(ch.summary, 200)}`)
      const scs = scenesByChapter.get(ch.id) || []
      for (const sc of scs.slice(0, 6)) {
        const written = sc.prose?.trim() ? ' ✓' : ''
        lines.push(`  Scene: ${truncate(sc.title || 'Untitled', 60)}${written}`)
        if (sc.oneSentenceSummary) lines.push(`    ${truncate(sc.oneSentenceSummary, 100)}`)
      }
    }
    hasContent = true
  }

  // Template meta for Pip's action instructions
  const validBeats = getValidBeatKeys(story)
  const spineFieldKeys = tpl.spineFields.map((f) => f.key)
  lines.push(
    `\n=== TEMPLATE INFO ===`,
    `Active template: ${story.template ?? 'snowflake'}`,
    `Valid beat values for add_chapter/update_chapter: ${validBeats.join(', ')}`,
    `Spine field names for update_spine: ${spineFieldKeys.join(', ')}`
  )

  const context = lines.join('\n')

  // Build welcome message
  let welcomeMessage = ''
  if (hasContent) {
    const spineCount = spineFields.length
    const charCount = characters?.length || 0
    const chapterCount = chapters?.length || 0
    const writtenScenes = (scenes || []).filter((s) => s.prose?.trim()).length
    const totalScenes = (scenes || []).length

    const parts = []
    if (spineCount >= 3) parts.push('a solid story spine')
    else if (spineCount > 0) parts.push('a story spine in progress')
    if (charCount > 0) parts.push(`${charCount} character${charCount > 1 ? 's' : ''}`)
    if (chapterCount > 0) parts.push(`${chapterCount} chapter${chapterCount > 1 ? 's' : ''}`)
    if (writtenScenes > 0) parts.push(`${writtenScenes}/${totalScenes} scenes written`)

    const summary = parts.length ? `I can see you have ${parts.join(', ')}. ` : ''
    welcomeMessage = `Hi! I'm Pip 🦦 — I've read your story. ${summary}What would you like to work on?`
  }

  return { storyObj: story, title, context, hasContent, welcomeMessage }
}
