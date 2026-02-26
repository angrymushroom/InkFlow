<template>
  <div class="page">
    <h1 class="page-title">{{ t('story.title') }}</h1>
    <p class="page-subtitle">{{ t('story.subtitle') }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>
    <div class="card form-card">
      <div class="form-group">
        <label>{{ t('story.oneSentence') }}</label>
        <input
          v-model="story.oneSentence"
          type="text"
          :placeholder="t('story.oneSentencePlaceholder')"
        />
        <AiExpandButton
          :current-value="story.oneSentence"
          :field-name="t('story.fieldOneSentence')"
          @expanded="story.oneSentence = $event"
        />
      </div>
      <div class="form-group">
        <label>{{ t('story.setup') }}</label>
        <textarea v-model="story.setup" :placeholder="t('story.setupPlaceholder')" rows="3" />
        <AiExpandButton :current-value="story.setup" :field-name="t('story.fieldSetup')" @expanded="story.setup = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('story.disaster1') }}</label>
        <textarea v-model="story.disaster1" :placeholder="t('story.disaster1Placeholder')" rows="2" />
        <AiExpandButton :current-value="story.disaster1" :field-name="t('story.fieldDisaster1')" @expanded="story.disaster1 = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('story.disaster2') }}</label>
        <textarea v-model="story.disaster2" :placeholder="t('story.disaster2Placeholder')" rows="2" />
        <AiExpandButton :current-value="story.disaster2" :field-name="t('story.fieldDisaster2')" @expanded="story.disaster2 = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('story.disaster3') }}</label>
        <textarea v-model="story.disaster3" :placeholder="t('story.disaster3Placeholder')" rows="2" />
        <AiExpandButton :current-value="story.disaster3" :field-name="t('story.fieldDisaster3')" @expanded="story.disaster3 = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('story.ending') }}</label>
        <textarea v-model="story.ending" :placeholder="t('story.endingPlaceholder')" rows="2" />
        <AiExpandButton :current-value="story.ending" :field-name="t('story.fieldEnding')" @expanded="story.ending = $event" />
      </div>
      <div class="story-actions">
        <button class="btn btn-primary" @click="save">{{ t('story.saveStory') }}</button>
        <span v-if="savedHint" class="saved-hint">{{ t('story.saved') }}</span>
      </div>
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
    </div>

    <section class="story-danger-zone">
      <h3 class="story-danger-zone-title">{{ t('story.deleteStorySection') }}</h3>
      <p v-if="storyCount <= 1" class="story-danger-zone-hint">{{ t('story.cannotDeleteLastStory') }}</p>
      <button
        type="button"
        class="btn btn-ghost btn-danger"
        :disabled="storyCount <= 1"
        @click="showDeleteModal = true"
      >
        {{ t('story.deleteStory') }}
      </button>
    </section>

    <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
      <div class="modal-card">
        <h3 class="modal-title">{{ t('story.deleteStoryConfirmTitle') }}</h3>
        <p class="modal-body">{{ t('story.deleteStoryConfirmBody') }}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showDeleteModal = false">{{ t('ideas.cancel') }}</button>
          <button type="button" class="btn btn-danger" :disabled="deleteInProgress" @click="confirmDeleteStory">
            {{ t('story.deleteStoryConfirmButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getStory, saveStory, getStories, deleteStory } from '@/db';
import { useI18n } from '@/composables/useI18n';
import AiExpandButton from '@/components/AiExpandButton.vue';

const { t } = useI18n();
const router = useRouter();

const storyCount = ref(1);
const showDeleteModal = ref(false);
const deleteInProgress = ref(false);

const story = ref({
  id: '',
  oneSentence: '',
  setup: '',
  disaster1: '',
  disaster2: '',
  disaster3: '',
  ending: '',
});
const lastSavedJson = ref('');
const savedHint = ref(false);
const saveError = ref('');
const loadError = ref('');
const saveTimeout = ref(null);
const beforeUnloadHandler = ref(null);

function storySnapshot() {
  return JSON.stringify({
    id: story.value.id ?? '',
    oneSentence: story.value.oneSentence ?? '',
    setup: story.value.setup ?? '',
    disaster1: story.value.disaster1 ?? '',
    disaster2: story.value.disaster2 ?? '',
    disaster3: story.value.disaster3 ?? '',
    ending: story.value.ending ?? '',
  });
}

function isDirty() {
  return lastSavedJson.value !== storySnapshot();
}

function setBeforeUnload() {
  if (beforeUnloadHandler.value) return;
  beforeUnloadHandler.value = (e) => {
    if (isDirty()) e.preventDefault();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler.value);
}
function clearBeforeUnload() {
  if (beforeUnloadHandler.value) {
    window.removeEventListener('beforeunload', beforeUnloadHandler.value);
    beforeUnloadHandler.value = null;
  }
}

async function load() {
  loadError.value = '';
  try {
    const [s, list] = await Promise.all([getStory(), getStories()]);
    storyCount.value = list?.length ?? 0;
    if (s) {
      story.value = {
        id: s.id ?? 'story',
        oneSentence: s.oneSentence ?? '',
        setup: s.setup ?? '',
        disaster1: s.disaster1 ?? '',
        disaster2: s.disaster2 ?? '',
        disaster3: s.disaster3 ?? '',
        ending: s.ending ?? '',
      };
    }
    lastSavedJson.value = storySnapshot();
  } catch (e) {
    loadError.value = e?.message || t('story.saveError');
  }
}

async function confirmDeleteStory() {
  if (deleteInProgress.value || !story.value?.id) return;
  deleteInProgress.value = true;
  try {
    const { switchedToId } = await deleteStory(story.value.id);
    showDeleteModal.value = false;
    window.dispatchEvent(new CustomEvent('inkflow-story-deleted', { detail: { switchedToId } }));
    if (switchedToId) {
      router.push('/story');
    }
  } catch (e) {
    saveError.value = e?.message || t('story.saveError');
  } finally {
    deleteInProgress.value = false;
  }
}

async function save() {
  saveError.value = '';
  try {
    await saveStory(story.value);
    lastSavedJson.value = storySnapshot();
    if (!isDirty()) clearBeforeUnload();
    savedHint.value = true;
    setTimeout(() => { savedHint.value = false; }, 2000);
    window.dispatchEvent(new CustomEvent('inkflow-story-saved'));
  } catch (e) {
    saveError.value = e?.message || t('story.saveError');
    setBeforeUnload();
  }
}

async function autoSave() {
  if (!isDirty()) return;
  try {
    await saveStory(story.value);
    lastSavedJson.value = storySnapshot();
    if (!isDirty()) clearBeforeUnload();
    savedHint.value = true;
    setTimeout(() => { savedHint.value = false; }, 2000);
  } catch (e) {
    saveError.value = e?.message || t('story.saveError');
    setBeforeUnload();
  }
}

onMounted(async () => {
  await load();
  window.addEventListener('inkflow-story-switched', load);
  watch(story, () => {
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
    saveTimeout.value = setTimeout(() => {
      autoSave();
      saveTimeout.value = null;
    }, 1800);
    if (isDirty()) setBeforeUnload();
  }, { deep: true });
});

onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', load);
  if (saveTimeout.value) clearTimeout(saveTimeout.value);
  clearBeforeUnload();
});
</script>

<style scoped>
.form-card {
  max-width: 100%;
}
.form-group {
  margin-bottom: var(--space-4);
}
.story-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.saved-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
}
.save-error {
  margin-top: var(--space-2);
  font-size: 0.875rem;
  color: var(--danger);
}
.story-danger-zone {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}
.story-danger-zone-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.story-danger-zone-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.btn-danger {
  color: var(--danger);
}
.btn-danger:hover:not(:disabled) {
  background: var(--danger);
  color: var(--bg);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-4);
  box-sizing: border-box;
}
.modal-card {
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
  max-width: 28rem;
  width: 100%;
  box-shadow: var(--shadow-md), 0 0 0 1px rgba(0, 0, 0, 0.05);
}
.modal-title {
  margin: 0 0 var(--space-2);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}
.modal-body {
  margin: 0 0 var(--space-5);
  font-size: 0.9375rem;
  color: var(--text-muted);
  line-height: 1.6;
}
.modal-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
