<template>
  <div class="page scene-editor-page">
    <div v-if="loading" class="empty-state">{{ t('scene.loading') }}</div>
    <div v-else-if="!scene" class="empty-state card">
      <p>{{ t('scene.notFound') }}</p>
      <router-link to="/write" class="btn btn-primary" style="margin-top: var(--space-3);">{{ t('scene.backToWrite') }}</router-link>
    </div>
    <div v-else>
      <router-link to="/write" class="btn btn-ghost btn-sm" style="margin-bottom: var(--space-4);">← {{ t('scene.backToWrite') }}</router-link>
      <div class="scene-meta card">
        <h1 class="scene-meta-title">{{ scene.title || t('outline.untitledScene') }}</h1>
        <p v-if="scene.oneSentenceSummary" class="scene-meta-summary">{{ scene.oneSentenceSummary }}</p>
        <p v-if="povName" class="scene-meta-pov">POV: {{ povName }}</p>
        <p v-if="scene.notes" class="scene-meta-notes">{{ scene.notes }}</p>
      </div>
      <div class="form-group">
        <label>{{ t('scene.prose') }}</label>
        <textarea
          v-model="content"
          :placeholder="t('scene.prosePlaceholder')"
          rows="20"
          class="prose-textarea"
          @blur="save"
        />
      </div>
      <div class="scene-actions">
        <button class="btn btn-primary" @click="save">{{ t('scene.save') }}</button>
        <span v-if="savedHint" class="saved-hint">{{ t('story.saved') }}</span>
      </div>
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getScene, getCharacters, updateScene } from '@/db';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

const route = useRoute();
const sceneId = computed(() => route.params.sceneId);
const scene = ref(null);
const content = ref('');
const loading = ref(true);
const characters = ref([]);
const lastSavedContent = ref('');
const savedHint = ref(false);
const saveError = ref('');
const saveTimeout = ref(null);
const beforeUnloadHandler = ref(null);

const povName = computed(() => {
  if (!scene.value?.povCharacterId) return '';
  const c = characters.value.find((x) => x.id === scene.value.povCharacterId);
  return c?.name ?? '';
});

function isDirty() {
  return scene.value && (content.value !== lastSavedContent.value);
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
  loading.value = true;
  const [s, chars] = await Promise.all([
    getScene(sceneId.value),
    getCharacters(),
  ]);
  characters.value = chars;
  if (s) {
    scene.value = s;
    content.value = s.content ?? '';
    lastSavedContent.value = content.value;
  } else {
    scene.value = null;
  }
  loading.value = false;
}

async function save() {
  if (!scene.value) return;
  saveError.value = '';
  try {
    await updateScene(scene.value.id, { content: content.value });
    lastSavedContent.value = content.value;
    clearBeforeUnload();
    savedHint.value = true;
    setTimeout(() => { savedHint.value = false; }, 2000);
  } catch (e) {
    saveError.value = e?.message || t('story.saveError');
    setBeforeUnload();
  }
}

async function autoSave() {
  if (!scene.value || !isDirty()) return;
  try {
    await updateScene(scene.value.id, { content: content.value });
    lastSavedContent.value = content.value;
    clearBeforeUnload();
    savedHint.value = true;
    setTimeout(() => { savedHint.value = false; }, 2000);
  } catch (e) {
    saveError.value = e?.message || t('story.saveError');
    setBeforeUnload();
  }
}

onMounted(() => {
  load();
  watch(content, () => {
    if (!scene.value) return;
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
    if (isDirty()) setBeforeUnload();
    saveTimeout.value = setTimeout(() => {
      autoSave();
      saveTimeout.value = null;
    }, 1800);
  });
  watch(sceneId, load);
});

onUnmounted(() => {
  if (saveTimeout.value) clearTimeout(saveTimeout.value);
  clearBeforeUnload();
});
</script>

<style scoped>
.scene-editor-page {
  max-width: 800px;
}
.scene-meta {
  margin-bottom: var(--space-5);
}
.scene-meta-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
}
.scene-meta-summary {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.scene-meta-pov,
.scene-meta-notes {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}
.prose-textarea {
  min-height: 400px;
  font-size: 1rem;
  line-height: 1.6;
}
.scene-actions {
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
