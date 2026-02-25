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
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { getStory, saveStory } from '@/db';
import { useI18n } from '@/composables/useI18n';
import AiExpandButton from '@/components/AiExpandButton.vue';

const { t } = useI18n();

const story = ref({
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
    const s = await getStory();
    if (s) {
      story.value = {
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

async function save() {
  saveError.value = '';
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
</style>
