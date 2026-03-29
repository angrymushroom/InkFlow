import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { getSpineTextForBeat } from '@/data/templates'
import {
  addChapter,
  updateChapter,
  deleteChapter,
  addScene,
  updateScene,
  deleteScene,
  getCurrentStoryId,
} from '@/db'
import { extractNewEntities } from '@/services/entityExtraction'
import { useEntitySuggestions } from '@/composables/useEntitySuggestions'

/**
 * Manages the slide-in edit panel (chapters + scenes) and delete confirmation modals.
 *
 * @param {{ chapters, beats, story, collapsedBeats, getScenesForChapter, onAfterChange }}
 *   chapters  — ref to chapters array
 *   beats     — computed ref to current template beat keys
 *   story     — ref to current story object
 *   collapsedBeats — reactive map of beat → collapsed state
 *   getScenesForChapter — function(chapterId) → scene[]
 *   onAfterChange — async callback; called after every successful CRUD operation
 */
export function useOutlinePanel({
  chapters,
  beats,
  story,
  collapsedBeats,
  getScenesForChapter,
  onAfterChange,
}) {
  const { t } = useI18n()

  const panelOpen = ref(false)
  const panelType = ref('chapter')
  const panelData = ref(null)
  const panelDefaultBeat = ref('setup')
  const panelDefaultChapterId = ref('')
  const panelExtraContext = ref('')
  const saveError = ref('')

  const deleteChapterModal = ref({ open: false, chapter: null })
  const deleteSceneModal = ref({ open: false, scene: null })

  function buildChapterContext(beat) {
    if (!beat || beat === 'ungrouped') return ''
    const label = t.value(`outline.section.${beat}`)
    const spine = getSpineTextForBeat(story.value, beat)
    let out = `${t.value('outline.aiExtraContextChapterPrefix', { section: label })}\n${spine || t.value('outline.spineNotFilled')}`
    const lines = (chapters.value || []).map((c, i) => {
      const title = (c.title || '').trim() || t.value('outline.untitledChapter')
      const sum = (c.summary || '').trim().slice(0, 80)
      return `${i + 1}. ${title}${sum ? ` — ${sum}` : ''}`
    })
    if (lines.length) out += `\n\nExisting chapters:\n${lines.join('\n')}`
    return out
  }

  function buildSceneContext(chapterId) {
    const ch = (chapters.value || []).find((c) => c.id === chapterId)
    const beat = ch?.beat || 'setup'
    const label = t.value(`outline.section.${beat}`)
    const spine = getSpineTextForBeat(story.value, beat)
    let out = `${t.value('outline.aiExtraContextScenePrefix', { section: label })}\n${spine || t.value('outline.spineNotFilled')}`
    if (ch?.summary?.trim()) out += `\n\nChapter summary:\n${ch.summary.trim()}`
    const existingScenes = getScenesForChapter(chapterId)
    if (existingScenes.length) {
      const lines = existingScenes.map((s, i) => {
        const title = (s.title || '').trim() || t.value('outline.untitledScene')
        const one = (s.oneSentenceSummary || '').trim().slice(0, 80)
        return `${i + 1}. ${title}${one ? ` — ${one}` : ''}`
      })
      out += `\n\nScenes in this chapter:\n${lines.join('\n')}`
    }
    return out
  }

  function openNewChapterPanel(beat = null) {
    const b = beat || beats.value[0] || 'setup'
    if (collapsedBeats[b]) collapsedBeats[b] = false
    panelType.value = 'chapter'
    panelData.value = null
    panelDefaultBeat.value = b
    panelExtraContext.value = buildChapterContext(b)
    panelOpen.value = true
  }

  function openEditChapterPanel(ch) {
    panelType.value = 'chapter'
    panelData.value = { ...ch }
    panelDefaultBeat.value = ch.beat || beats.value[0] || 'setup'
    panelExtraContext.value = buildChapterContext(ch.beat || beats.value[0] || 'setup')
    panelOpen.value = true
  }

  function openAddScenePanel(chapterId) {
    panelType.value = 'scene'
    panelData.value = null
    panelDefaultChapterId.value = chapterId || ''
    panelExtraContext.value = buildSceneContext(chapterId)
    panelOpen.value = true
  }

  function openEditScenePanel(scene) {
    panelType.value = 'scene'
    panelData.value = { ...scene }
    panelDefaultChapterId.value = scene.chapterId || ''
    panelExtraContext.value = buildSceneContext(scene.chapterId)
    panelOpen.value = true
  }

  async function onPanelSave({ type, data }) {
    saveError.value = ''
    try {
      if (type === 'chapter') {
        if (data.id) {
          await updateChapter(data.id, {
            title: data.title,
            summary: data.summary,
            beat: data.beat || null,
          })
        } else {
          await addChapter({ title: data.title, summary: data.summary, beat: data.beat || null })
        }
      } else {
        if (data.id) {
          await updateScene(data.id, {
            chapterId: data.chapterId,
            title: data.title,
            oneSentenceSummary: data.oneSentenceSummary,
            povCharacterId: data.povCharacterId,
            notes: data.notes,
          })
        } else {
          if (!data.chapterId) return
          await addScene({
            chapterId: data.chapterId,
            title: data.title,
            oneSentenceSummary: data.oneSentenceSummary,
            povCharacterId: data.povCharacterId,
            notes: data.notes,
          })
        }
        // Scan outline text for new entities (fire-and-forget)
        const scanText = [data.oneSentenceSummary, data.notes].filter(Boolean).join(' ')
        if (scanText.trim()) {
          const storyId = getCurrentStoryId()
          const { setPending } = useEntitySuggestions()
          extractNewEntities({ sceneText: scanText, storyId })
            .then((found) => {
              if (found.length) setPending(found, storyId)
            })
            .catch(() => {})
        }
      }
      panelOpen.value = false
      await onAfterChange()
    } catch (e) {
      saveError.value = e?.message || t.value('common.saveErrorGeneric')
    }
  }

  function confirmDeleteChapter(ch) {
    deleteChapterModal.value = { open: true, chapter: ch }
  }
  async function doDeleteChapter() {
    const ch = deleteChapterModal.value.chapter
    if (!ch) return
    deleteChapterModal.value.open = false
    saveError.value = ''
    try {
      await deleteChapter(ch.id)
      await onAfterChange()
    } catch (e) {
      saveError.value = e?.message || t.value('common.saveErrorGeneric')
    }
  }

  function confirmDeleteScene(scene) {
    deleteSceneModal.value = { open: true, scene }
  }
  async function doDeleteScene() {
    const scene = deleteSceneModal.value.scene
    if (!scene) return
    deleteSceneModal.value.open = false
    saveError.value = ''
    try {
      await deleteScene(scene.id)
      await onAfterChange()
    } catch (e) {
      saveError.value = e?.message || t.value('common.saveErrorGeneric')
    }
  }

  return {
    panelOpen,
    panelType,
    panelData,
    panelDefaultBeat,
    panelDefaultChapterId,
    panelExtraContext,
    saveError,
    deleteChapterModal,
    deleteSceneModal,
    openNewChapterPanel,
    openEditChapterPanel,
    openAddScenePanel,
    openEditScenePanel,
    onPanelSave,
    confirmDeleteChapter,
    doDeleteChapter,
    confirmDeleteScene,
    doDeleteScene,
  }
}
