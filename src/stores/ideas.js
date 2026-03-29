import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getIdeas, addIdea, updateIdea, deleteIdea } from '@/db/index.js'
import { useStoryStore } from './story.js'

export const useIdeasStore = defineStore('ideas', () => {
  const ideas = ref([])

  async function load(typeFilter) {
    const storyStore = useStoryStore()
    const storyId = storyStore.activeStoryId
    if (!storyId) {
      ideas.value = []
      return
    }
    ideas.value = await getIdeas(storyId)
  }

  async function addIdeaAction(data) {
    await addIdea(data)
    await load()
  }

  async function updateIdeaAction(id, data) {
    await updateIdea(id, data)
    await load()
  }

  async function deleteIdeaAction(id) {
    await deleteIdea(id)
    await load()
  }

  return { ideas, load, addIdeaAction, updateIdeaAction, deleteIdeaAction }
})
