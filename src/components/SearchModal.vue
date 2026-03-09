<template>
  <Teleport to="body">
    <div v-if="modelValue" class="search-backdrop" @click.self="close">
      <div class="search-card" role="dialog" aria-modal="true" aria-label="Search">
        <div class="search-input-wrap">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="search-input"
            :placeholder="t('search.placeholder')"
            @keydown.escape="close"
            @keydown.down.prevent="moveDown"
            @keydown.up.prevent="moveUp"
            @keydown.enter.prevent="openActive"
          />
          <kbd class="search-esc" @click="close">Esc</kbd>
        </div>

        <div class="search-results" ref="resultsRef">
          <div v-if="query.length < 2" class="search-hint">{{ t('search.typeToSearch') }}</div>
          <div v-else-if="!results.length" class="search-hint">{{ t('search.noResults') }}</div>
          <template v-else>
            <div
              v-for="(r, i) in results"
              :key="r.id"
              class="search-result"
              :class="{ active: activeIndex === i }"
              @click="open(r)"
              @mouseover="activeIndex = i"
            >
              <span class="search-result-type">{{ r.typeLabel }}</span>
              <div class="search-result-body">
                <span class="search-result-title">{{ r.title }}</span>
                <span v-if="r.excerpt" class="search-result-excerpt">{{ r.excerpt }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { getIdeas, getCharacters, getChapters, getScenes, getCurrentStoryId } from '@/db';

const props = defineProps({ modelValue: { type: Boolean, required: true } });
const emit = defineEmits(['update:modelValue']);

const { t } = useI18n();
const router = useRouter();

const query = ref('');
const activeIndex = ref(0);
const inputRef = ref(null);
const resultsRef = ref(null);

// All searchable items, loaded once when modal opens
const allItems = ref([]);

async function loadAll() {
  const storyId = getCurrentStoryId();
  const [ideas, chars, chapters, scenes] = await Promise.all([
    getIdeas(storyId),
    getCharacters(storyId),
    getChapters(storyId),
    getScenes(storyId),
  ]);
  allItems.value = [
    ...ideas.map((i) => ({ id: 'idea-' + i.id, type: 'idea', route: '/ideas', title: i.title || t.value('ideas.untitled'), excerpt: i.body || '' })),
    ...chars.map((c) => ({ id: 'char-' + c.id, type: 'character', route: '/characters', title: c.name || t.value('characters.unnamed'), excerpt: c.oneSentence || '' })),
    ...chapters.map((c) => ({ id: 'ch-' + c.id, type: 'chapter', route: '/outline', title: c.title || t.value('outline.untitledChapter'), excerpt: c.summary || '' })),
    ...scenes.map((s) => ({ id: 'sc-' + s.id, type: 'scene', route: `/write/${s.id}`, title: s.title || t.value('outline.untitledScene'), excerpt: s.oneSentenceSummary || s.content?.slice(0, 80) || '' })),
  ];
}

watch(() => props.modelValue, async (open) => {
  if (open) {
    query.value = '';
    activeIndex.value = 0;
    await loadAll();
    await nextTick();
    inputRef.value?.focus();
  }
});

const typeLabels = computed(() => ({
  idea: t.value('search.typeIdea'),
  character: t.value('search.typeCharacter'),
  chapter: t.value('search.typeChapter'),
  scene: t.value('search.typeScene'),
}));

const results = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (q.length < 2) return [];
  return allItems.value
    .filter((item) => {
      return item.title.toLowerCase().includes(q) || item.excerpt.toLowerCase().includes(q);
    })
    .slice(0, 20)
    .map((item) => ({
      ...item,
      typeLabel: typeLabels.value[item.type] || item.type,
      excerpt: item.excerpt ? highlight(item.excerpt, q) : '',
    }));
});

watch(results, () => { activeIndex.value = 0; });

function highlight(text, q) {
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text.slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + q.length + 60);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

function close() {
  emit('update:modelValue', false);
}

function open(r) {
  router.push(r.route);
  close();
}

function openActive() {
  if (results.value[activeIndex.value]) open(results.value[activeIndex.value]);
}

function moveDown() {
  activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1);
  scrollActive();
}

function moveUp() {
  activeIndex.value = Math.max(activeIndex.value - 1, 0);
  scrollActive();
}

function scrollActive() {
  nextTick(() => {
    const el = resultsRef.value?.querySelector('.search-result.active');
    el?.scrollIntoView({ block: 'nearest' });
  });
}
</script>

<style scoped>
.search-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 2000;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
  box-sizing: border-box;
}
.search-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 100%;
  max-width: 560px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1rem;
  outline: none;
  color: var(--text);
  padding: 0;
  min-height: unset;
  width: auto;
  box-shadow: none;
}
.search-input:focus { border-color: transparent; box-shadow: none; }
.search-esc {
  font-size: 0.75rem;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  flex-shrink: 0;
}
.search-results {
  max-height: 400px;
  overflow-y: auto;
}
.search-hint {
  padding: var(--space-4) var(--space-5);
  font-size: 0.9375rem;
  color: var(--text-muted);
  text-align: center;
}
.search-result {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background 0.1s;
}
.search-result:hover,
.search-result.active { background: var(--bg); }
.search-result-type {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  flex-shrink: 0;
  width: 72px;
  padding-top: 2px;
}
.search-result-body { flex: 1; min-width: 0; }
.search-result-title {
  display: block;
  font-weight: 500;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-result-excerpt {
  display: block;
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
