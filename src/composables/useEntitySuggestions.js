import { ref } from 'vue'
import { addIdea } from '@/db'
import { useToast } from '@/composables/useToast'

// Module-level singleton — all components share the same state
const pending = ref([]) // [{ name, type, description, selected }]
const isExpanded = ref(false)
const lockedStoryId = ref(null)

export function useEntitySuggestions() {
  /**
   * Set new suggestions. Replaces any existing pending suggestions.
   * @param {Array<{ name: string, type: string, description: string }>} entities
   * @param {string} storyId
   */
  function setPending(entities, storyId) {
    if (!entities?.length) return
    // Guard: discard if storyId changed mid-session (prevent cross-story pollution)
    if (lockedStoryId.value && lockedStoryId.value !== storyId) {
      pending.value = []
      isExpanded.value = false
    }
    lockedStoryId.value = storyId
    pending.value = entities.map((e) => ({ ...e, selected: true }))
    isExpanded.value = false
  }

  function dismiss() {
    pending.value = []
    isExpanded.value = false
  }

  function toggleItem(index) {
    if (pending.value[index]) {
      pending.value[index].selected = !pending.value[index].selected
    }
  }

  function toggleExpanded() {
    isExpanded.value = !isExpanded.value
  }

  function selectAll() {
    pending.value.forEach((e) => (e.selected = true))
  }

  /**
   * Save all selected suggestions as ideas, then dismiss the banner.
   * @param {Function} t  - i18n translator (t.value in script setup)
   */
  async function saveSelected(t) {
    const toSave = pending.value.filter((e) => e.selected)
    if (!toSave.length) return

    const storyId = lockedStoryId.value
    for (const entity of toSave) {
      await addIdea({
        storyId,
        title: entity.name,
        body: entity.description,
        type: entity.type,
      })
    }

    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'))

    const { success } = useToast()
    const count = toSave.length
    const msg =
      count === 1 ? t('entitySuggestion.savedOne') : t('entitySuggestion.saved', { count })
    success(msg)

    dismiss()
  }

  return {
    pending,
    isExpanded,
    setPending,
    dismiss,
    toggleItem,
    toggleExpanded,
    selectAll,
    saveSelected,
  }
}
