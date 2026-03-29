import { ref, computed } from 'vue'
import { getChapters, getScenes, getCurrentStoryId } from '@/db'

const chapters = ref([])
const scenes = ref([])
const loadError = ref('')

export function useOutline() {
  const scenesByChapter = computed(() => {
    const map = new Map()
    for (const ch of chapters.value) {
      map.set(
        ch.id,
        scenes.value.filter((s) => s.chapterId === ch.id)
      )
    }
    return map
  })

  async function load() {
    loadError.value = ''
    try {
      const storyId = getCurrentStoryId()
      const [ch, sc] = await Promise.all([getChapters(storyId), getScenes(storyId)])
      chapters.value = ch
      scenes.value = sc
    } catch (e) {
      loadError.value = e?.message || 'Failed to load outline.'
      chapters.value = []
      scenes.value = []
    }
  }

  function getScenesForChapter(chapterId) {
    return scenes.value.filter((s) => s.chapterId === chapterId)
  }

  return {
    chapters,
    scenes,
    scenesByChapter,
    load,
    loadError,
    getScenesForChapter,
  }
}
