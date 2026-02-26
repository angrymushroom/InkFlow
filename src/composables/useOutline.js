import { ref, computed } from 'vue';
import { getChapters, getScenes, getCurrentStoryId } from '@/db';

const chapters = ref([]);
const scenes = ref([]);

export function useOutline() {
  const scenesByChapter = computed(() => {
    const map = new Map();
    for (const ch of chapters.value) {
      map.set(ch.id, scenes.value.filter((s) => s.chapterId === ch.id));
    }
    return map;
  });

  async function load() {
    try {
      const storyId = getCurrentStoryId();
      const [ch, sc] = await Promise.all([getChapters(storyId), getScenes(storyId)]);
      chapters.value = ch;
      scenes.value = sc;
    } catch (_) {
      chapters.value = [];
      scenes.value = [];
    }
  }

  function getScenesForChapter(chapterId) {
    return scenes.value.filter((s) => s.chapterId === chapterId);
  }

  return {
    chapters,
    scenes,
    scenesByChapter,
    load,
    getScenesForChapter,
  };
}
