<template>
  <div class="page">
    <h1 class="page-title">{{ t('write.title') }}</h1>
    <p class="page-subtitle">{{ t('write.subtitle') }}</p>

    <div v-if="!scenes.length" class="empty-state card">
      <p>{{ t('write.empty') }}</p>
      <router-link to="/outline" class="btn btn-primary" style="margin-top: var(--space-3);">{{ t('write.goToOutline') }}</router-link>
    </div>

    <div v-else class="scene-list">
      <div v-for="ch in chapters" :key="ch.id" class="chapter-group">
        <h3 class="chapter-group-title">{{ ch.title || t('outline.untitledChapter') }}</h3>
        <div class="scene-links">
          <router-link
            v-for="scene in scenesByChapter(ch.id)"
            :key="scene.id"
            :to="`/write/${scene.id}`"
            class="scene-link card"
          >
            <span class="scene-link-title">{{ scene.title || t('outline.untitledScene') }}</span>
            <span v-if="scene.oneSentenceSummary" class="scene-link-summary">{{ scene.oneSentenceSummary }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';

const { t } = useI18n();
const { chapters, scenes, getScenesForChapter } = useOutline();

function scenesByChapter(chapterId) {
  return getScenesForChapter(chapterId);
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
</style>
