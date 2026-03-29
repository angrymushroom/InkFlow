import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getStories,
  getStoryById,
  saveStory,
  createStory,
  deleteStory,
  getCurrentStoryId,
  setCurrentStoryId,
} from '@/db/index.js'

export const useStoryStore = defineStore('story', () => {
  const stories = ref([])
  const activeStory = ref(null)

  const activeStoryId = computed(() => activeStory.value?.id ?? null)

  async function loadStories() {
    stories.value = await getStories()
  }

  async function loadActiveStory() {
    const id = getCurrentStoryId()
    activeStory.value = id ? ((await getStoryById(id)) ?? null) : null
  }

  async function switchStory(id) {
    setCurrentStoryId(id)
    await loadActiveStory()
  }

  async function save(data) {
    activeStory.value = await saveStory(data)
    await loadStories()
  }

  async function create(overrides) {
    const story = await createStory(overrides)
    await loadStories()
    await switchStory(story.id)
    return story
  }

  async function remove(id) {
    const result = await deleteStory(id)
    await loadStories()
    if (result.switchedToId) {
      await switchStory(result.switchedToId)
    } else {
      activeStory.value = null
    }
    return result
  }

  return {
    stories,
    activeStory,
    activeStoryId,
    loadStories,
    loadActiveStory,
    switchStory,
    save,
    create,
    remove,
  }
})
