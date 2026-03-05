<template>
  <div v-if="open" class="outline-draft-overlay" @click.self="onClose">
    <div class="outline-draft-card card">
      <header class="outline-draft-header">
        <div>
          <h2 class="outline-draft-title">{{ t('outline.aiDraftTitle') }}</h2>
          <p class="outline-draft-hint">{{ t('outline.aiDraftHint') }}</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" @click="onClose">
          {{ t('ideas.cancel') }}
        </button>
      </header>

      <div class="outline-draft-body">
        <section
          v-for="beat in beats"
          :key="beat"
          class="outline-draft-section"
        >
          <h3 class="outline-draft-section-title">
            {{ t(`outline.section.${beat}`) }}
          </h3>
          <div v-if="!sectionChapters(beat).length" class="outline-draft-empty">
            {{ t('outline.aiDraftEmptySection') }}
          </div>
          <div v-else class="outline-draft-chapter-list">
            <div
              v-for="(ch, ci) in sectionChapters(beat)"
              :key="`${beat}-${ci}`"
              class="outline-draft-chapter"
            >
              <label class="outline-draft-label">
                {{ t('outline.chapterTitle') }}
                <input
                  v-model="local.sections[beat][ci].chapterTitle"
                  type="text"
                />
              </label>
              <label class="outline-draft-label">
                {{ t('outline.summary') }}
                <textarea
                  v-model="local.sections[beat][ci].chapterSummary"
                  rows="2"
                />
              </label>
              <div class="outline-draft-scenes">
                <h4 class="outline-draft-scenes-title">
                  {{ t('outline.aiDraftScenesLabel') }}
                </h4>
                <div
                  v-for="(sc, si) in ch.scenes || []"
                  :key="`${beat}-${ci}-scene-${si}`"
                  class="outline-draft-scene"
                >
                  <label class="outline-draft-label">
                    {{ t('outline.sceneTitle') }}
                    <input
                      v-model="local.sections[beat][ci].scenes[si].title"
                      type="text"
                    />
                  </label>
                  <label class="outline-draft-label">
                    {{ t('outline.oneSentenceSummary') }}
                    <textarea
                      v-model="local.sections[beat][ci].scenes[si].oneSentence"
                      rows="2"
                    />
                  </label>
                  <label class="outline-draft-label">
                    {{ t('outline.notes') }}
                    <textarea
                      v-model="local.sections[beat][ci].scenes[si].notes"
                      rows="2"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="outline-draft-footer">
        <button type="button" class="btn btn-ghost" @click="onClose">
          {{ t('ideas.cancel') }}
        </button>
        <button type="button" class="btn btn-primary" @click="onApply">
          {{ t('outline.aiDraftApply') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';

const props = defineProps({
  open: { type: Boolean, default: false },
  draft: {
    type: Object,
    default: () => ({ sections: {} }),
  },
  beats: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close', 'apply']);
const { t } = useI18n();

const local = reactive({
  sections: {},
});

function resetLocal(from) {
  const src = from && typeof from === 'object' ? from : { sections: {} };
  const sections = src.sections || {};
  const next = {};
  for (const key of Object.keys(sections)) {
    const arr = Array.isArray(sections[key]) ? sections[key] : [];
    next[key] = arr.map((ch) => ({
      chapterTitle: ch.chapterTitle ?? '',
      chapterSummary: ch.chapterSummary ?? '',
      scenes: Array.isArray(ch.scenes)
        ? ch.scenes.map((sc) => ({
            title: sc.title ?? '',
            oneSentence: sc.oneSentence ?? '',
            notes: sc.notes ?? '',
          }))
        : [],
    }));
  }
  local.sections = next;
}

watch(
  () => props.draft,
  (val) => {
    resetLocal(val);
  },
  { immediate: true, deep: false }
);

const sectionChapters = (beat) =>
  (local.sections && local.sections[beat]) || [];

function onClose() {
  emit('close');
}

function onApply() {
  const payload = {
    sections: {},
  };
  for (const key of Object.keys(local.sections || {})) {
    payload.sections[key] = local.sections[key].map((ch) => ({
      chapterTitle: ch.chapterTitle ?? '',
      chapterSummary: ch.chapterSummary ?? '',
      scenes: (ch.scenes || []).map((sc) => ({
        title: sc.title ?? '',
        oneSentence: sc.oneSentence ?? '',
        notes: sc.notes ?? '',
      })),
    }));
  }
  emit('apply', payload);
}
</script>

<style scoped>
.outline-draft-overlay {
  position: fixed;
  inset: 0;
  z-index: 220;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.45);
}
.outline-draft-card {
  max-width: 960px;
  width: 100%;
  max-height: min(90vh, 720px);
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
}
.outline-draft-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}
.outline-draft-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}
.outline-draft-hint {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: 0.9375rem;
}
.outline-draft-body {
  flex: 1;
  overflow: auto;
  padding-right: var(--space-2);
}
.outline-draft-section {
  padding: var(--space-3) 0;
  border-top: 1px solid var(--border);
}
.outline-draft-section:first-of-type {
  border-top: none;
}
.outline-draft-section-title {
  margin: 0 0 var(--space-2);
  font-size: 1rem;
  font-weight: 600;
}
.outline-draft-empty {
  color: var(--text-muted);
  font-size: 0.875rem;
}
.outline-draft-chapter-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.outline-draft-chapter {
  padding: var(--space-3);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.outline-draft-label {
  display: block;
  font-size: 0.875rem;
  margin-bottom: var(--space-2);
}
.outline-draft-label > input,
.outline-draft-label > textarea {
  margin-top: var(--space-1);
  width: 100%;
  font-size: 0.875rem;
}
.outline-draft-scenes {
  margin-top: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-2);
}
.outline-draft-scenes-title {
  margin: 0 0 var(--space-2);
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.outline-draft-scene {
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border);
  margin-bottom: var(--space-2);
}
.outline-draft-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>

