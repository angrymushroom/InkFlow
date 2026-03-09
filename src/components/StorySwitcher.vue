<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Switch story">
        <div class="modal-header">
          <h3 class="modal-title">{{ t('sidebar.story') }}</h3>
          <button type="button" class="modal-close" @click="$emit('update:modelValue', false)">×</button>
        </div>

        <div class="story-list">
          <button
            v-for="s in stories"
            :key="s.id"
            type="button"
            class="story-item"
            :class="{ active: currentStoryId === s.id }"
            @click="select(s.id)"
          >
            <div class="story-item-main">
              <span class="story-item-title">{{ s.oneSentence || t('sidebar.untitledStory') }}</span>
              <span class="story-item-meta">
                {{ wordCounts[s.id] != null ? wordCounts[s.id].toLocaleString() + ' ' + t('write.words') : '…' }}
                <span v-if="s.updatedAt" class="story-item-date"> · {{ formatDate(s.updatedAt) }}</span>
              </span>
            </div>
            <span v-if="currentStoryId === s.id" class="story-item-badge">{{ t('storySwitcher.current') }}</span>
          </button>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-primary btn-sm" @click="newStory">
            + {{ t('sidebar.newStory') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { getScenes } from '@/db';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  stories: { type: Array, default: () => [] },
  currentStoryId: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'select', 'new']);
const { t } = useI18n();

const wordCounts = ref({});

async function loadWordCounts() {
  const counts = {};
  for (const s of props.stories) {
    try {
      const scenes = await getScenes(s.id);
      counts[s.id] = scenes.reduce((sum, sc) => {
        const text = (sc.content || '').trim();
        return sum + (text ? text.split(/\s+/).length : 0);
      }, 0);
    } catch {
      counts[s.id] = 0;
    }
  }
  wordCounts.value = counts;
}

watch(() => props.modelValue, (open) => {
  if (open) loadWordCounts();
});

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function select(id) {
  emit('select', id);
  emit('update:modelValue', false);
}

function newStory() {
  emit('new');
  emit('update:modelValue', false);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
  box-sizing: border-box;
}
.modal-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-1);
}
.modal-close:hover { color: var(--text); }
.story-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}
.story-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  padding: var(--space-3) var(--space-5);
  cursor: pointer;
  font: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.story-item:hover { background: var(--bg); }
.story-item.active {
  background: rgba(37, 99, 235, 0.06);
  border-left-color: var(--accent);
}
.story-item-main { flex: 1; min-width: 0; }
.story-item-title {
  display: block;
  font-weight: 500;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text);
}
.story-item-meta {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 2px;
}
.story-item-date { color: var(--text-muted); }
.story-item-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}
.modal-footer {
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
</style>
