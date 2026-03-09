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
      <!-- Total word count banner -->
      <div class="write-stats card">
        <div class="write-stat">
          <span class="write-stat-value">{{ totalWordCount.toLocaleString() }}</span>
          <span class="write-stat-label">{{ t('write.totalWords') }}</span>
        </div>
        <div class="write-stat">
          <span class="write-stat-value">{{ writtenSceneCount }}</span>
          <span class="write-stat-label">{{ t('write.scenesWritten') }}</span>
        </div>
        <div class="write-stat">
          <span class="write-stat-value">{{ scenes.length }}</span>
          <span class="write-stat-label">{{ t('write.scenesTotal') }}</span>
        </div>
      </div>

      <div v-if="generateMessage" class="generate-message card">
        <p>{{ generateMessage }}</p>
      </div>

      <div class="scene-list">
        <div v-for="ch in chapters" :key="ch.id" class="chapter-group">
          <div class="chapter-group-header">
            <h3 class="chapter-group-title">{{ ch.title || t('outline.untitledChapter') }}</h3>
            <span class="chapter-word-count">{{ chapterWordCount(ch.id).toLocaleString() }} {{ t('write.words') }}</span>
          </div>
          <div class="scene-links">
            <div v-for="scene in scenesByChapter(ch.id)" :key="scene.id" class="scene-link-wrap">
              <router-link :to="`/write/${scene.id}`" class="scene-link card">
                <div class="scene-link-main">
                  <span class="scene-link-title">{{ scene.title || t('outline.untitledScene') }}</span>
                  <span v-if="scene.oneSentenceSummary" class="scene-link-summary">{{ scene.oneSentenceSummary }}</span>
                </div>
                <span class="scene-link-wc" :class="{ 'scene-link-wc--empty': sceneWordCount(scene) === 0 }">
                  {{ sceneWordCount(scene) > 0 ? sceneWordCount(scene).toLocaleString() + ' ' + t('write.words') : t('write.notStarted') }}
                </span>
              </router-link>
              <button
                type="button"
                class="btn btn-ghost btn-sm scene-generate-from"
                :disabled="generatingFromHere"
                :title="t('write.generateFromHere')"
                @click.stop="onGenerateFromHere(scene)"
              >
                {{ t('write.generateFromHere') }}
              </button>
            </div>
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

const { t } = useI18n();
const { chapters, scenes, loadError, getScenesForChapter } = useOutline();
const generatingFromHere = ref(false);
const generateMessage = ref('');
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

function countScenesFrom(sceneId) {
  const list = scenes.value;
  const idx = list.findIndex((s) => s.id === sceneId);
  return idx < 0 ? 0 : list.length - idx;
}

async function onGenerateFromHere(scene) {
  const count = countScenesFrom(scene.id);
  if (count === 0) return;
  const msg = t('write.generateFromHereConfirm').replace(/\{\{count\}\}/g, String(count));
  if (!confirm(msg)) return;
  generatingFromHere.value = true;
  generateMessage.value = '';
  try {
    const storyId = getCurrentStoryId();
    const { generated, errors } = await generateFromScene(storyId, scene.id);
    if (errors.length > 0) {
      generateMessage.value = t('write.generateFromHereError');
    } else {
      generateMessage.value = t('write.generateFromHereDone').replace(/\{\{generated\}\}/g, String(generated));
    }
    setTimeout(() => { generateMessage.value = ''; }, 5000);
  } catch (e) {
    generateMessage.value = e?.message || t('write.generateFromHereError');
    setTimeout(() => { generateMessage.value = ''; }, 5000);
  } finally {
    generatingFromHere.value = false;
  }
}
</script>

<style scoped>
.write-stats {
  display: flex;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
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
.scene-link-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.scene-link-wrap .scene-link { flex: 1; }
.scene-generate-from { flex-shrink: 0; }
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
.scene-link-wc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  flex-shrink: 0;
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
