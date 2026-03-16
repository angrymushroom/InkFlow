<template>
  <div class="page">
    <h1 class="page-title">{{ t('write.title') }}</h1>
    <p class="page-subtitle">{{ t('write.subtitle') }}</p>

    <div v-if="loadError" class="load-error card">
      <p>{{ loadError }}</p>
      <router-link to="/settings" class="btn btn-ghost btn-sm" style="margin-top: var(--space-2);">{{ t('nav.settings') }}</router-link>
    </div>

    <div v-else-if="!scenes.length" class="empty-state card">
      <p>{{ t('write.empty') }}</p>
      <router-link to="/outline" class="btn btn-primary" style="margin-top: var(--space-3);">{{ t('write.goToOutline') }}</router-link>
    </div>

    <template v-else>
      <!-- Stats -->
      <div class="write-stats card">
        <div class="write-stat">
          <span class="write-stat-value">{{ totalWordCount.toLocaleString() }}</span>
          <span class="write-stat-label">{{ t('write.totalWords') }}</span>
        </div>
        <div class="write-stat">
          <span class="write-stat-value">{{ writtenSceneCount }} / {{ scenes.length }}</span>
          <span class="write-stat-label">{{ t('write.scenesWritten') }}</span>
        </div>
        <div class="write-stat write-stat--bar">
          <div class="write-progress-bar">
            <div class="write-progress-fill" :style="{ width: completionPercent + '%' }"></div>
          </div>
          <span class="write-stat-label">{{ completionPercent }}%</span>
        </div>
      </div>

      <!-- Generate action card -->
      <div class="generate-card card">
        <!-- All scenes written state -->
        <template v-if="allWritten && !generating">
          <div class="generate-row">
            <div class="generate-info">
              <span class="generate-title">{{ t('write.generateAllDone') }}</span>
              <span class="generate-hint">{{ t('write.generateAllDoneHint') }}</span>
            </div>
            <button type="button" class="btn btn-ghost" @click="onGenerateAll">
              {{ t('write.generateAll') }}
            </button>
          </div>
        </template>

        <!-- Continue from checkpoint state -->
        <template v-else-if="!generating">
          <div class="generate-row">
            <div class="generate-info">
              <span class="generate-title">✨ {{ t('write.generateContinue') }}</span>
              <span class="generate-hint">{{ continuHint }}</span>
            </div>
            <button type="button" class="btn btn-primary" @click="onGenerateContinue">
              {{ t('write.generateContinue') }}
            </button>
          </div>
        </template>

        <!-- Generating state -->
        <template v-else>
          <div class="generate-row generate-row--active">
            <div class="generate-info">
              <span class="generate-title">{{ t('write.generating') }}</span>
              <span class="generate-hint">{{ progressLabel }}</span>
            </div>
          </div>
          <div class="generate-progress">
            <div class="generate-progress-track">
              <div class="generate-progress-fill" :style="{ width: generateProgressPercent + '%' }"></div>
            </div>
          </div>
        </template>

        <!-- Result message -->
        <div
          v-if="resultMessage && !generating"
          class="generate-result"
          :class="resultHasErrors ? 'generate-result--warn' : 'generate-result--ok'"
        >
          {{ resultMessage }}
        </div>
      </div>

      <!-- Scene list -->
      <div class="scene-list">
        <div v-for="ch in chapters" :key="ch.id" class="chapter-group">
          <div class="chapter-group-header">
            <h3 class="chapter-group-title">{{ ch.title || t('outline.untitledChapter') }}</h3>
            <span class="chapter-word-count">{{ chapterWordCount(ch.id).toLocaleString() }} {{ t('write.words') }}</span>
          </div>
          <div class="scene-links">
            <router-link
              v-for="scene in scenesByChapter(ch.id)"
              :key="scene.id"
              :to="`/write/${scene.id}`"
              class="scene-link card"
              :class="{ 'scene-link--checkpoint': scene.id === checkpointSceneId }"
            >
              <div class="scene-link-main">
                <span class="scene-link-title">{{ scene.title || t('outline.untitledScene') }}</span>
                <span v-if="scene.oneSentenceSummary" class="scene-link-summary">{{ scene.oneSentenceSummary }}</span>
              </div>
              <div class="scene-link-right">
                <span v-if="scene.id === checkpointSceneId && !allWritten" class="scene-link-checkpoint-badge">▶</span>
                <span class="scene-link-wc" :class="{ 'scene-link-wc--empty': sceneWordCount(scene) === 0 }">
                  {{ sceneWordCount(scene) > 0 ? sceneWordCount(scene).toLocaleString() + ' ' + t('write.words') : t('write.notStarted') }}
                </span>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import { getCurrentStoryId, getScenes } from '@/db';
import { countWords } from '@/utils/wordCount';
import { generateFromScene } from '@/services/generation';
import { friendlyAiError } from '@/services/ai';

const { t } = useI18n();
const { chapters, scenes, loadError, getScenesForChapter } = useOutline();

const generating = ref(false);
const resultMessage = ref('');
const resultHasErrors = ref(false);
const progressCurrent = ref(0);
const progressTotal = ref(0);
const progressName = ref('');
const allScenes = ref([]);

onMounted(async () => {
  try {
    allScenes.value = await getScenes(getCurrentStoryId());
  } catch (_) {}
});

function scenesByChapter(chapterId) {
  return getScenesForChapter(chapterId);
}

function sceneWordCount(scene) {
  const full = allScenes.value.find((s) => s.id === scene.id);
  return countWords(full?.content || '');
}

function chapterWordCount(chapterId) {
  return scenesByChapter(chapterId).reduce((sum, s) => sum + sceneWordCount(s), 0);
}

const totalWordCount = computed(() =>
  (scenes.value || []).reduce((sum, s) => sum + sceneWordCount(s), 0)
);

const writtenSceneCount = computed(() =>
  (scenes.value || []).filter((s) => sceneWordCount(s) > 0).length
);

const completionPercent = computed(() => {
  const total = scenes.value?.length || 0;
  if (!total) return 0;
  return Math.round((writtenSceneCount.value / total) * 100);
});

const allWritten = computed(() =>
  scenes.value?.length > 0 && writtenSceneCount.value === scenes.value.length
);

// The first unwritten scene — where generation will start
const checkpointScene = computed(() => {
  return (scenes.value || []).find((s) => sceneWordCount(s) === 0) || null;
});

const checkpointSceneId = computed(() => checkpointScene.value?.id ?? null);

const continuHint = computed(() => {
  if (!checkpointScene.value) return '';
  const name = checkpointScene.value.title || t.value('outline.untitledScene');
  return t.value('write.generateContinueHint').replace('{{name}}', name);
});

const progressLabel = computed(() =>
  t.value('write.generatingProgress')
    .replace('{{current}}', String(progressCurrent.value))
    .replace('{{total}}', String(progressTotal.value))
    .replace('{{name}}', progressName.value)
);

const generateProgressPercent = computed(() => {
  if (!progressTotal.value) return 0;
  return Math.round(((progressCurrent.value - 1) / progressTotal.value) * 100);
});

function onProgress({ current, total, sceneName }) {
  progressCurrent.value = current;
  progressTotal.value = total;
  progressName.value = sceneName;
}

async function runGeneration(fromSceneId) {
  generating.value = true;
  resultMessage.value = '';
  resultHasErrors.value = false;
  progressCurrent.value = 0;
  progressTotal.value = 0;
  try {
    const storyId = getCurrentStoryId();
    const { generated, errors } = await generateFromScene(storyId, fromSceneId, { onProgress });
    allScenes.value = await getScenes(storyId);
    if (errors.length > 0) {
      resultHasErrors.value = true;
      resultMessage.value = t.value('write.generatePartial')
        .replace('{{generated}}', String(generated))
        .replace('{{errors}}', String(errors.length));
    } else {
      resultMessage.value = t.value('write.generateDone').replace('{{generated}}', String(generated));
    }
    setTimeout(() => { resultMessage.value = ''; }, 6000);
  } catch (e) {
    resultHasErrors.value = true;
    resultMessage.value = friendlyAiError(e);
    setTimeout(() => { resultMessage.value = ''; }, 6000);
  } finally {
    generating.value = false;
    progressCurrent.value = 0;
  }
}

async function onGenerateContinue() {
  const scene = checkpointScene.value;
  if (!scene) return;
  const remaining = (scenes.value || []).filter((s) => sceneWordCount(s) === 0).length;
  const name = scene.title || t.value('outline.untitledScene');
  const msg = t.value('write.generateConfirm')
    .replace('{{count}}', String(remaining))
    .replace('{{name}}', name);
  if (!confirm(msg)) return;
  await runGeneration(scene.id);
}

async function onGenerateAll() {
  const list = scenes.value || [];
  if (!list.length) return;
  const msg = t.value('write.generateAllConfirm').replace('{{count}}', String(list.length));
  if (!confirm(msg)) return;
  await runGeneration(list[0].id);
}
</script>

<style scoped>
.write-stats {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-4);
  padding: var(--space-4) var(--space-5);
}
.write-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.write-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}
.write-stat-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
}
.write-stat--bar {
  flex: 1;
  gap: var(--space-1);
}
.write-progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}
.write-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* Generate action card */
.generate-card {
  margin-bottom: var(--space-5);
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.generate-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
.generate-row--active {
  opacity: 0.85;
}
.generate-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.generate-title {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text);
}
.generate-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
  line-height: 1.4;
}
.generate-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.generate-progress-track {
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}
.generate-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.generate-result {
  font-size: 0.875rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
}
.generate-result--ok {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.generate-result--warn {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
}

/* Scene list */
.scene-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.chapter-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.chapter-group-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0;
}
.chapter-word-count {
  font-size: 0.8125rem;
  color: var(--text-muted);
}
.scene-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.scene-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}
.scene-link:hover {
  background: var(--bg);
  border-color: var(--accent);
  text-decoration: none;
}
.scene-link--checkpoint {
  border-color: var(--accent);
}
.scene-link-main { flex: 1; min-width: 0; }
.scene-link-title { font-weight: 500; display: block; }
.scene-link-summary {
  display: block;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.scene-link-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.scene-link-checkpoint-badge {
  font-size: 0.6875rem;
  color: var(--accent);
}
.scene-link-wc {
  font-size: 0.8125rem;
  color: var(--text-muted);
}
.scene-link-wc--empty {
  color: var(--border);
  font-style: italic;
}
.load-error {
  font-size: 0.9375rem;
  color: var(--danger);
}
.load-error p { margin: 0; }
</style>
