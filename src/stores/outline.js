import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getChapters,
  getScenes,
  addChapter,
  updateChapter,
  deleteChapter,
  addScene,
  updateScene,
  deleteScene,
  reorderChapters,
  reorderScenesInChapter,
} from '@/db/index.js'
import { useStoryStore } from './story.js'

export const useOutlineStore = defineStore('outline', () => {
  const chapters = ref([])
  const scenes = ref([])

  const scenesByChapter = computed(() => {
    const map = {}
    for (const s of scenes.value) {
      if (!map[s.chapterId]) map[s.chapterId] = []
      map[s.chapterId].push(s)
    }
    return map
  })

  async function load(explicitStoryId) {
    const storyId = explicitStoryId ?? useStoryStore().activeStoryId
    if (!storyId) {
      chapters.value = []
      scenes.value = []
      return
    }
    chapters.value = await getChapters(storyId)
    scenes.value = await getScenes(storyId)
  }

  async function addChapterAction(data) {
    await addChapter(data)
    await load()
  }

  async function updateChapterAction(id, data) {
    await updateChapter(id, data)
    await load()
  }

  async function deleteChapterAction(id) {
    await deleteChapter(id)
    await load()
  }

  async function addSceneAction(data) {
    await addScene(data)
    await load()
  }

  async function updateSceneAction(id, data) {
    await updateScene(id, data)
    await load()
  }

  async function deleteSceneAction(id) {
    await deleteScene(id)
    await load()
  }

  async function reorderChaptersAction(storyId, ids) {
    await reorderChapters(storyId, ids)
    await load()
  }

  async function reorderScenesAction(chapterId, ids) {
    await reorderScenesInChapter(chapterId, ids)
    await load()
  }

  return {
    chapters,
    scenes,
    scenesByChapter,
    load,
    addChapterAction,
    updateChapterAction,
    deleteChapterAction,
    addSceneAction,
    updateSceneAction,
    deleteSceneAction,
    reorderChaptersAction,
    reorderScenesAction,
  }
})
