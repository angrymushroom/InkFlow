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

    <div v-else class="scene-list">
      <div v-if="generateMessage" class="generate-message card">
        <p>{{ generateMessage }}</p>
      </div>
      <div v-for="ch in chapters" :key="ch.id" class="chapter-group">
        <h3 class="chapter-group-title">{{ ch.title || t('outline.untitledChapter') }}</h3>
        <div class="scene-links">
          <div v-for="scene in scenesByChapter(ch.id)" :key="scene.id" class="scene-link-wrap">
            <router-link :to="`/write/${scene.id}`" class="scene-link card">
              <span class="scene-link-title">{{ scene.title || t('outline.untitledScene') }}</span>
              <span v-if="scene.oneSentenceSummary" class="scene-link-summary">{{ scene.oneSentenceSummary }}</span>
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
  </div>
</template>


<script setup>
import { ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import { getCurrentStoryId } from '@/db';
import { generateFromScene } from '@/services/generation';

const { t } = useI18n();
const { chapters, scenes, loadError, getScenesForChapter } = useOutline();
const generatingFromHere = ref(false);
const generateMessage = ref('');

function scenesByChapter(chapterId) {
  return getScenesForChapter(chapterId);
}

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
.scene-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.chapter-group-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
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
.scene-link-wrap .scene-link {
  flex: 1;
}
.scene-generate-from {
  flex-shrink: 0;
}
.scene-link {
  display: block;
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
.scene-link-title {
  font-weight: 500;
}
.scene-link-summary {
  display: block;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: var(--space-1);
}
.load-error {
  font-size: 0.9375rem;
  color: var(--danger);
}
.load-error p {
  margin: 0;
}
</style>
