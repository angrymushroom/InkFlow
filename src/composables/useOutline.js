import { ref, computed } from 'vue';
import { getChapters, getScenes, getCurrentStoryId } from '@/db';

const chapters = ref([]);
const scenes = ref([]);
const loadError = ref('');

export function useOutline() {
  const scenesByChapter = computed(() => {
    const map = new Map();
    for (const ch of chapters.value) {
      map.set(ch.id, scenes.value.filter((s) => s.chapterId === ch.id));
    }
    return map;
  });

  async function load() {
    loadError.value = '';
    try {
      const storyId = getCurrentStoryId();
      const [ch, sc] = await Promise.all([getChapters(storyId), getScenes(storyId)]);
      chapters.value = ch;
      scenes.value = sc;
      // #region agent log
      fetch('http://127.0.0.1:7453/ingest/c807a8a1-88f8-4b0f-a487-d01b643f354a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'18ab8d'},body:JSON.stringify({sessionId:'18ab8d',location:'useOutline.js:load',message:'outline load done',data:{storyId,chaptersLen:ch?.length??0,scenesLen:sc?.length??0},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } catch (e) {
      loadError.value = e?.message || 'Failed to load outline.';
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
    loadError,
    getScenesForChapter,
  };
}
