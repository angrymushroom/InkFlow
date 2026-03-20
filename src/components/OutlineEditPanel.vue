<template>
  <Teleport to="body">
    <Transition name="ep">
      <div v-if="open" class="ep-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
        <div class="ep-panel" role="dialog" :aria-modal="true" :aria-label="panelTitle">
          <div class="ep-header">
            <h2 class="ep-title">{{ panelTitle }}</h2>
            <button type="button" class="ep-close btn btn-ghost btn-icon" :aria-label="t('ideas.cancel')" @click="$emit('close')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="ep-body">
            <!-- Chapter form -->
            <template v-if="type === 'chapter'">
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.sectionLabel') }}</label>
                <div class="ep-beat-grid">
                  <button
                    v-for="b in allBeats"
                    :key="b"
                    type="button"
                    class="ep-beat-btn"
                    :class="{ active: form.beat === (b || '') }"
                    @click="form.beat = (b || '')"
                  >
                    <span class="ep-beat-dot" :style="b ? `background:${beatColor(b)}` : 'background:var(--text-muted)'"></span>
                    {{ beatLabel(b) }}
                  </button>
                </div>
              </div>
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.chapterTitle') }}</label>
                <input ref="firstInputRef" v-model="form.title" type="text" :placeholder="t('outline.chapterTitlePlaceholder')" />
              </div>
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.summary') }}</label>
                <ResizableTextarea v-model="form.summary" :placeholder="t('outline.summaryPlaceholder')" :rows="2" />
                <AiExpandButton :current-value="form.summary" :field-name="t('outline.chapterSummary')" :extra-context="extraContext" @expanded="form.summary = $event" />
              </div>
            </template>

            <!-- Scene form -->
            <template v-else-if="type === 'scene'">
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.chapter') }}</label>
                <select v-model="form.chapterId">
                  <option value="" disabled>{{ t('outline.selectChapter') }}</option>
                  <option v-for="ch in chapters" :key="ch.id" :value="ch.id">{{ ch.title || t('ideas.untitled') }}</option>
                </select>
              </div>
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.sceneTitle') }}</label>
                <input ref="firstInputRef" v-model="form.title" type="text" :placeholder="t('outline.sceneTitlePlaceholder')" />
              </div>
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.oneSentenceSummary') }}</label>
                <ResizableTextarea v-model="form.oneSentenceSummary" :placeholder="t('outline.oneSentencePlaceholder')" :rows="1" :min-height="40" auto-expand />
                <AiExpandButton :current-value="form.oneSentenceSummary" :field-name="t('outline.sceneOneSentence')" :extra-context="extraContext" @expanded="form.oneSentenceSummary = $event" />
              </div>
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.povCharacter') }}</label>
                <select v-model="form.povCharacterId">
                  <option value="">—</option>
                  <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name || t('characters.unnamed') }}</option>
                </select>
              </div>
              <div class="ep-form-group">
                <label class="ep-label">{{ t('outline.notes') }}</label>
                <ResizableTextarea v-model="form.notes" :placeholder="t('outline.notesPlaceholder')" :rows="2" />
                <AiExpandButton :current-value="form.notes" :field-name="t('outline.sceneNotes')" :extra-context="extraContext" @expanded="form.notes = $event" />
              </div>
            </template>
          </div>

          <div class="ep-footer">
            <button type="button" class="btn btn-ghost" @click="$emit('close')">{{ t('ideas.cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="onSave">{{ isNew ? t('ideas.add') : t('ideas.save') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from '@/composables/useI18n';
import AiExpandButton from '@/components/AiExpandButton.vue';
import ResizableTextarea from '@/components/ResizableTextarea.vue';

const props = defineProps({
  open: Boolean,
  type: String, // 'chapter' | 'scene'
  initialData: { type: Object, default: null },
  chapters: { type: Array, default: () => [] },
  characters: { type: Array, default: () => [] },
  defaultBeat: { type: String, default: 'setup' },
  defaultChapterId: { type: String, default: '' },
  extraContext: { type: String, default: '' },
  // Array of { key: string, color: string } from templates config
  availableBeats: { type: Array, default: () => [
    { key: 'setup',     color: '#6366f1' },
    { key: 'disaster1', color: '#f97316' },
    { key: 'disaster2', color: '#ef4444' },
    { key: 'disaster3', color: '#a855f7' },
    { key: 'ending',    color: '#16a34a' },
  ]},
});

const emit = defineEmits(['close', 'save']);
const { t } = useI18n();
const firstInputRef = ref(null);

// All beat buttons: template beats + ungrouped (empty string)
const allBeats = computed(() => [...props.availableBeats.map((b) => b.key), '']);

function beatColor(b) {
  return props.availableBeats.find((x) => x.key === b)?.color ?? '#a1a1aa';
}
function beatLabel(b) {
  if (!b) return t.value('outline.section.ungrouped');
  return t.value(`outline.section.${b}`);
}

const isNew = computed(() => !props.initialData?.id);

const form = ref({});

function resetForm() {
  if (props.type === 'chapter') {
    const firstBeat = props.availableBeats[0]?.key ?? 'setup';
    form.value = {
      id: props.initialData?.id || null,
      title: props.initialData?.title ?? '',
      summary: props.initialData?.summary ?? '',
      beat: props.initialData?.beat ?? props.defaultBeat ?? firstBeat,
    };
  } else {
    form.value = {
      id: props.initialData?.id || null,
      chapterId: props.initialData?.chapterId ?? props.defaultChapterId ?? '',
      title: props.initialData?.title ?? '',
      oneSentenceSummary: props.initialData?.oneSentenceSummary ?? '',
      povCharacterId: props.initialData?.povCharacterId ?? '',
      notes: props.initialData?.notes ?? '',
    };
  }
}

watch(() => props.open, (v) => {
  if (v) {
    resetForm();
    nextTick(() => firstInputRef.value?.focus());
  }
});

watch(() => [props.initialData, props.type], () => {
  if (props.open) resetForm();
});

const panelTitle = computed(() => {
  if (props.type === 'chapter') {
    return isNew.value ? t.value('outline.newChapter') : t.value('outline.editChapter');
  }
  return isNew.value ? t.value('outline.newScene') : t.value('outline.editScene');
});

function onSave() {
  emit('save', { type: props.type, data: { ...form.value } });
}
</script>

<style scoped>
.ep-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.ep-panel {
  width: min(480px, 100%);
  height: 100%;
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
}

@media (max-width: 767px) {
  .ep-overlay {
    align-items: flex-end;
  }
  .ep-panel {
    width: 100%;
    height: 92dvh;
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  }
}

/* Transition */
.ep-enter-active, .ep-leave-active { transition: opacity 0.2s ease; }
.ep-enter-active .ep-panel, .ep-leave-active .ep-panel { transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
.ep-enter-from, .ep-leave-to { opacity: 0; }
.ep-enter-from .ep-panel { transform: translateX(100%); }
.ep-leave-to .ep-panel { transform: translateX(100%); }
@media (max-width: 767px) {
  .ep-enter-from .ep-panel { transform: translateY(100%); }
  .ep-leave-to .ep-panel { transform: translateY(100%); }
}

.ep-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.ep-title { margin: 0; font-size: 1.125rem; font-weight: 700; }
.ep-close { flex-shrink: 0; }

.ep-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ep-footer {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.ep-form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.ep-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.01em; }

/* Beat grid */
.ep-beat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}
.ep-beat-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  min-height: 36px;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
}
.ep-beat-btn:hover { border-color: var(--accent); background: var(--accent-subtle); }
.ep-beat-btn.active { border-color: var(--accent); background: var(--accent-subtle); color: var(--accent); font-weight: 600; }
.ep-beat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
