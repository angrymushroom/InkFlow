import { ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { draftOutlineFromSpine } from '@/services/outlineAi';
import { friendlyAiError } from '@/services/ai';
import { getCurrentStoryId, addChapter, addScene } from '@/db';

/**
 * Manages AI outline drafting: per-beat and full-outline draft flows.
 *
 * @param {{ story, beats, onAfterChange }}
 *   story         — ref to current story object
 *   beats         — computed ref to current template beat keys (string[])
 *   onAfterChange — async callback; called after successfully applying a draft
 */
export function useOutlineDraft({ story, beats, onAfterChange }) {
  const { error: toastError } = useToast();

  const draftOpen = ref(false);
  const drafting = ref(false);
  const draftData = ref(null);
  const draftScope = ref('all');

  async function draftForBeat(beat) {
    drafting.value = true;
    try {
      const storyId = story.value?.id || getCurrentStoryId();
      draftData.value = await draftOutlineFromSpine({ storyId, scope: beat });
      draftScope.value = beat;
      draftOpen.value = true;
    } catch (e) {
      toastError(friendlyAiError(e));
    } finally {
      drafting.value = false;
    }
  }

  async function draftAll() {
    drafting.value = true;
    try {
      const storyId = story.value?.id || getCurrentStoryId();
      draftData.value = await draftOutlineFromSpine({ storyId, scope: 'all' });
      draftScope.value = 'all';
      draftOpen.value = true;
    } catch (e) {
      toastError(friendlyAiError(e));
    } finally {
      drafting.value = false;
    }
  }

  async function applyDraft(payload) {
    try {
      const sections = payload?.sections || {};
      for (const beat of beats.value) {
        const chaptersList = Array.isArray(sections[beat]) ? sections[beat] : [];
        for (const ch of chaptersList) {
          const created = await addChapter({ title: ch.chapterTitle ?? '', summary: ch.chapterSummary ?? '', beat });
          for (const sc of (Array.isArray(ch.scenes) ? ch.scenes : [])) {
            await addScene({ chapterId: created.id, title: sc.title ?? '', oneSentenceSummary: sc.oneSentence ?? '', notes: sc.notes ?? '', povCharacterId: '' });
          }
        }
      }
      draftOpen.value = false;
      draftData.value = null;
      await onAfterChange();
    } catch (e) {
      toastError(friendlyAiError(e));
    }
  }

  return { draftOpen, drafting, draftData, draftScope, draftForBeat, draftAll, applyDraft };
}
