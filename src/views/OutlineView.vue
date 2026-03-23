<template>
  <div class="page">
    <h1 class="page-title">{{ t('outline.title') }}</h1>
    <p class="page-subtitle">{{ t('outline.subtitle') }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>

    <!-- One-sentence story reference (read-only) -->
    <div v-if="story" class="outline-spine-ref card">
      <span class="outline-spine-ref-label">{{ t('outline.spineRefLabel') }}</span>
      <p class="outline-spine-ref-text">{{ story.oneSentence || t('outline.spineNotFilled') }}</p>
      <router-link to="/story" class="outline-spine-ref-link">{{ t('outline.editInStory') }}</router-link>
    </div>

    <!-- Top-level actions -->
    <div class="outline-actions">
      <button type="button" class="btn btn-primary" @click="openNewChapterPanel()">
        + {{ t('outline.newChapter') }}
      </button>
      <button type="button" class="btn btn-ghost" @click="draftAll" :disabled="drafting">
        {{ drafting ? t('outline.aiDrafting') : t('outline.aiDraftAll') }}
      </button>
    </div>

    <p v-if="!chapters.length" class="outline-empty-hint">{{ t('outline.empty') }}</p>

    <!-- Beat sections (unified loop including ungrouped) -->
    <div class="outline-sections">
      <section
        v-for="beat in allBeatSections"
        :key="beat"
        class="card outline-section"
        :class="{ 'outline-section--ungrouped': beat === 'ungrouped', 'outline-section--empty': !chaptersForBeat(beat).length }"
      >
        <!-- Section header -->
        <button type="button" class="outline-section-header" @click="toggleBeat(beat)">
          <div class="outline-section-titleblock">
            <div class="outline-section-title-row">
              <span v-if="beat !== 'ungrouped'" class="outline-beat-badge" :style="`background:${beatColor(beat)}`"></span>
              <h2 class="outline-section-title">{{ t(`outline.section.${beat}`) }}</h2>
              <span class="outline-section-count">{{ chaptersForBeat(beat).length }}</span>
            </div>
            <p class="outline-section-tip">{{ t(`outline.sectionTip.${beat}`) }}</p>
          </div>
          <div class="outline-section-header-right">
            <div v-if="beat !== 'ungrouped'" class="outline-section-actions" @click.stop>
              <button type="button" class="btn btn-primary btn-sm" @click="openNewChapterPanel(beat)">
                + {{ t('outline.newChapter') }}
              </button>
              <button type="button" class="btn btn-ghost btn-sm" @click="draftForBeat(beat)" :disabled="drafting">
                {{ t('outline.aiDraftSection') }}
              </button>
            </div>
            <span class="outline-section-chevron" :class="{ collapsed: collapsedBeats[beat] }">▾</span>
          </div>
        </button>

        <div v-show="!collapsedBeats[beat]" class="outline-section-body">
          <!-- Story spine reference for this beat (read-only) -->
          <div v-if="beat !== 'ungrouped' && spineTextForBeat(beat)" class="outline-beat-spine">
            <span class="outline-beat-spine-label">{{ t('outline.spineRefLabel') }}</span>
            <p class="outline-beat-spine-text">{{ spineTextForBeat(beat) }}</p>
          </div>

          <div v-if="!chaptersForBeat(beat).length" class="outline-section-empty">
            {{ t('outline.noChaptersInSection') }}
          </div>

          <!-- Chapter list (sortable) -->
          <div class="outline-chapter-list" :data-sortable-chapter-list="beat">
            <div
              v-for="ch in chaptersForBeat(beat)"
              :key="ch.id"
              :id="'chapter-' + ch.id"
              class="outline-chapter"
            >
              <!-- Chapter row -->
              <div class="outline-chapter-row">
                <span class="chapter-drag-handle" aria-label="Reorder chapter" title="Drag to reorder">≡</span>

                <!-- Title + scene dots (tap to expand/collapse) -->
                <button type="button" class="outline-chapter-toggle" @click="toggleChapter(ch.id)">
                  <div class="outline-chapter-info">
                    <span class="outline-chapter-title">{{ ch.title || t('outline.untitledChapter') }}</span>
                    <span v-if="ch.summary" class="outline-chapter-summary">{{ ch.summary }}</span>
                  </div>
                  <div class="outline-chapter-progress">
                    <span
                      v-for="(written, i) in sceneDotsForChapter(ch.id)"
                      :key="i"
                      class="scene-dot"
                      :class="{ 'scene-dot--written': written }"
                      :title="written ? t('outline.sceneWrittenAria') : t('outline.sceneEmptyAria')"
                    ></span>
                    <span v-if="scenesByChapter(ch.id).length > 8" class="scene-dots-more">+{{ scenesByChapter(ch.id).length - 8 }}</span>
                  </div>
                  <span class="outline-chapter-chevron" :class="{ collapsed: collapsedChapters[ch.id] }">▾</span>
                </button>

                <!-- Chapter actions -->
                <div class="outline-chapter-actions">
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" :title="t('ideas.edit')" @click.stop="openEditChapterPanel(ch)">✏️</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" :title="t('outline.addScene')" @click.stop="openAddScenePanel(ch.id, beat)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" :title="t('ideas.delete')" @click.stop="confirmDeleteChapter(ch)">🗑️</button>
                </div>
              </div>

              <!-- Scene list (expandable) -->
              <div
                v-show="!collapsedChapters[ch.id]"
                class="outline-scenes"
                :data-sortable-scene-list="ch.id"
                :data-chapter-id="ch.id"
              >
                <div
                  v-for="scene in scenesByChapter(ch.id)"
                  :key="scene.id"
                  :id="'scene-' + scene.id"
                  class="outline-scene-row"
                >
                  <span class="scene-drag-handle" aria-label="Reorder scene" title="Drag to reorder">≡</span>
                  <span
                    class="scene-status-indicator"
                    :class="{ 'scene-status-indicator--written': isSceneWritten(scene) }"
                    :title="isSceneWritten(scene) ? t('outline.sceneWrittenAria') : t('outline.sceneEmptyAria')"
                  ></span>
                  <div class="outline-scene-info">
                    <span class="outline-scene-title">{{ scene.title || t('outline.untitledScene') }}</span>
                    <span v-if="scene.oneSentenceSummary" class="outline-scene-summary">{{ scene.oneSentenceSummary }}</span>
                  </div>
                  <div class="outline-scene-actions">
                    <router-link :to="`/write/${scene.id}`" class="btn btn-primary btn-sm">{{ t('outline.writeScene') }}</router-link>
                    <button type="button" class="btn btn-ghost btn-sm btn-icon" :title="t('ideas.edit')" @click.stop="openEditScenePanel(scene)">✏️</button>
                    <button type="button" class="btn btn-ghost btn-sm btn-icon" :title="t('ideas.delete')" @click.stop="confirmDeleteScene(scene)">🗑️</button>
                  </div>
                </div>

                <!-- Empty chapter: invite to add first scene -->
                <div v-if="!scenesByChapter(ch.id).length" class="outline-scenes-empty">
                  <button type="button" class="btn btn-ghost btn-sm" @click="openAddScenePanel(ch.id, beat)">
                    + {{ t('outline.addFirstScene') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Edit panel (chapter or scene) -->
    <OutlineEditPanel
      :open="panelOpen"
      :type="panelType"
      :initial-data="panelData"
      :chapters="chapters"
      :characters="characters"
      :default-beat="panelDefaultBeat"
      :default-chapter-id="panelDefaultChapterId"
      :extra-context="panelExtraContext"
      :available-beats="templateConfig.beats"
      @close="panelOpen = false"
      @save="onPanelSave"
    />

    <!-- AI draft modal -->
    <OutlineDraftModal
      :open="draftOpen"
      :draft="draftData"
      :beats="beats"
      :scope="draftScope"
      @close="draftOpen = false"
      @apply="applyDraft"
    />
    <!-- beats is a computed array here, passed reactively -->

    <!-- Delete modals -->
    <ConfirmModal
      v-model="deleteChapterModal.open"
      :title="t('outline.confirmChapter')"
      :confirm-label="t('ideas.delete')"
      :cancel-label="t('ideas.cancel')"
      :danger="true"
      @confirm="doDeleteChapter"
    />
    <ConfirmModal
      v-model="deleteSceneModal.open"
      :title="t('outline.confirmScene')"
      :confirm-label="t('ideas.delete')"
      :cancel-label="t('ideas.cancel')"
      :danger="true"
      @confirm="doDeleteScene"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick, reactive } from 'vue';
import Sortable from 'sortablejs';
import {
  getCharacters,
  getStory,
  getCurrentStoryId,
  reorderChapters,
  reorderScenesInChapter,
} from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import { useOutlinePanel } from '@/composables/useOutlinePanel';
import { useOutlineDraft } from '@/composables/useOutlineDraft';
import ConfirmModal from '@/components/ConfirmModal.vue';
import OutlineEditPanel from '@/components/OutlineEditPanel.vue';
import OutlineDraftModal from '@/components/OutlineDraftModal.vue';
import { getTemplate, getSpineTextForBeat, getBeatColor } from '@/data/templates';

const { t } = useI18n();
const { chapters, load, loadError, getScenesForChapter } = useOutline();

const characters = ref([]);
const story = ref(null);

// Template-driven beats — recomputed whenever the story changes
const templateConfig = computed(() => getTemplate(story.value));
const beats = computed(() => templateConfig.value.beats.map((b) => b.key));
const beatOrder = computed(() => [...beats.value, 'ungrouped']);
const allBeatSections = computed(() => [...beats.value, 'ungrouped']);

function beatColor(b) { return getBeatColor(story.value, b); }

const sortableInstances = [];

// Beat section collapse (persisted)
const COLLAPSE_KEY = 'inkflow_outline_collapsed';
function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); } catch { return {}; }
}
const collapsedBeats = reactive(loadCollapsed());
function toggleBeat(b) {
  collapsedBeats[b] = !collapsedBeats[b];
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify({ ...collapsedBeats })); } catch {}
}

// Chapter collapse (session only)
const collapsedChapters = reactive({});
function toggleChapter(chId) { collapsedChapters[chId] = !collapsedChapters[chId]; }

function chaptersForBeat(beat) {
  if (beat === 'ungrouped') return (chapters.value || []).filter((c) => !c.beat || !beats.value.includes(c.beat));
  return (chapters.value || []).filter((c) => c.beat === beat);
}
function scenesByChapter(chapterId) { return getScenesForChapter(chapterId); }
function isSceneWritten(scene) { return !!(scene.content?.trim()); }
function sceneDotsForChapter(chapterId) { return scenesByChapter(chapterId).slice(0, 8).map((s) => isSceneWritten(s)); }
function spineTextForBeat(beat) { return getSpineTextForBeat(story.value, beat); }

// --- Data loading ---
async function loadAll() {
  await load();
  const [chars, s] = await Promise.all([getCharacters(), getStory()]);
  characters.value = chars;
  story.value = s;
}

// --- After-change hook: reload data, notify, re-init sortables ---
async function onAfterChange() {
  await loadAll();
  window.dispatchEvent(new CustomEvent('inkflow-outline-changed'));
  await nextTick();
  initSortables();
}

// --- Edit panel + delete modals (via composable) ---
const {
  panelOpen, panelType, panelData, panelDefaultBeat, panelDefaultChapterId, panelExtraContext,
  saveError,
  deleteChapterModal, deleteSceneModal,
  openNewChapterPanel, openEditChapterPanel, openAddScenePanel, openEditScenePanel,
  onPanelSave, confirmDeleteChapter, doDeleteChapter, confirmDeleteScene, doDeleteScene,
} = useOutlinePanel({ chapters, beats, story, collapsedBeats, getScenesForChapter, onAfterChange });

// --- AI outline draft (via composable) ---
const { draftOpen, drafting, draftData, draftScope, draftForBeat, draftAll, applyDraft } =
  useOutlineDraft({ story, beats, onAfterChange });

// --- Sidebar focus ---
function onSidebarFocus(e) {
  const { chapterId, sceneId } = e.detail || {};
  if (sceneId) {
    document.getElementById('scene-' + sceneId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (chapterId) {
    document.getElementById('chapter-' + chapterId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// --- Sortable drag & drop ---
function initSortables() {
  sortableInstances.forEach((s) => s.destroy());
  sortableInstances.length = 0;

  document.querySelectorAll('[data-sortable-chapter-list]').forEach((el) => {
    const beat = el.getAttribute('data-sortable-chapter-list');
    const sortable = Sortable.create(el, {
      handle: '.chapter-drag-handle',
      animation: 150,
      onEnd() {
        const ids = [...el.querySelectorAll('[id^="chapter-"]')].map((node) => node.id.replace('chapter-', ''));
        if (ids.length === 0) return;
        const byBeat = {};
        for (const ch of chapters.value) {
          const b = ch.beat && beatOrder.value.includes(ch.beat) ? ch.beat : 'ungrouped';
          if (!byBeat[b]) byBeat[b] = [];
          byBeat[b].push(ch);
        }
        byBeat[beat] = ids.map((id) => chapters.value.find((c) => c.id === id)).filter(Boolean);
        const fullOrder = beatOrder.value.flatMap((b) => (byBeat[b] || []).map((c) => c.id));
        reorderChapters(getCurrentStoryId(), fullOrder).then(() => onAfterChange());
      },
    });
    sortableInstances.push(sortable);
  });

  document.querySelectorAll('[data-sortable-scene-list]').forEach((el) => {
    const chapterId = el.getAttribute('data-chapter-id');
    if (!chapterId) return;
    const sortable = Sortable.create(el, {
      handle: '.scene-drag-handle',
      animation: 150,
      onEnd() {
        const ids = [...el.querySelectorAll('[id^="scene-"]')].map((node) => node.id.replace('scene-', ''));
        if (ids.length === 0) return;
        reorderScenesInChapter(chapterId, ids).then(() => onAfterChange());
      },
    });
    sortableInstances.push(sortable);
  });
}

async function onStorySwitched() {
  await loadAll();
  await nextTick();
  initSortables();
}

onMounted(async () => {
  await loadAll();
  window.addEventListener('inkflow-story-switched', onStorySwitched);
  window.addEventListener('inkflow-sidebar-focus', onSidebarFocus);
  await nextTick();
  initSortables();
});
onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', onStorySwitched);
  window.removeEventListener('inkflow-sidebar-focus', onSidebarFocus);
  sortableInstances.forEach((s) => s.destroy());
  sortableInstances.length = 0;
});
</script>

<style scoped>
.save-error { margin-bottom: var(--space-2); font-size: 0.875rem; color: var(--danger); }

/* One-sentence reference */
.outline-spine-ref {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--accent-subtle);
  border: 1px solid rgba(99, 102, 241, 0.18);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.outline-spine-ref-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.outline-spine-ref-text { margin: 0; font-size: 0.9375rem; color: var(--text); line-height: 1.5; }
.outline-spine-ref-link { font-size: 0.8125rem; color: var(--accent); align-self: flex-start; }

/* Actions bar */
.outline-actions { display: flex; gap: var(--space-2); margin-bottom: var(--space-5); flex-wrap: wrap; }
.outline-empty-hint { color: var(--text-muted); font-size: 0.9375rem; margin: 0 0 var(--space-4); }

/* Sections */
.outline-sections { display: flex; flex-direction: column; gap: var(--space-4); }
.outline-section { padding: 0; overflow: hidden; }
.outline-section--ungrouped { border-color: rgba(220, 38, 38, 0.25); }

/* Section header */
.outline-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}
.outline-section-header:hover { background: rgba(0,0,0,0.02); }
.outline-section-titleblock { flex: 1; min-width: 0; }
.outline-section-title-row { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
.outline-beat-badge { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.outline-section-title { margin: 0; font-size: 1.0625rem; font-weight: 700; }
.outline-section-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 1px 7px;
  line-height: 1.6;
}
.outline-section-tip { margin: 0; color: var(--text-muted); font-size: 0.875rem; line-height: 1.4; }
.outline-section-header-right { display: flex; align-items: flex-start; gap: var(--space-3); flex-shrink: 0; }
.outline-section-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end; }
.outline-section-chevron { font-size: 1.125rem; color: var(--text-muted); transition: transform 0.2s ease; line-height: 1.5; }
.outline-section-chevron.collapsed { transform: rotate(-90deg); }

/* Section body */
.outline-section-body { padding: 0 var(--space-4) var(--space-4); }
.outline-section-empty { padding: var(--space-3) 0 var(--space-1); color: var(--text-muted); font-size: 0.875rem; }

/* Beat spine reference (read-only, inside section) */
.outline-beat-spine {
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-3);
  background: var(--bg);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.outline-beat-spine-label { font-size: 0.6875rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.outline-beat-spine-text { margin: 0; font-size: 0.875rem; color: var(--text-muted); line-height: 1.5; }

/* Chapter list */
.outline-chapter-list { display: flex; flex-direction: column; gap: var(--space-3); }

.outline-chapter {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.outline-chapter:hover { box-shadow: var(--shadow); }

.outline-chapter-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  min-height: 52px;
}

.chapter-drag-handle {
  cursor: grab;
  color: var(--text-muted);
  padding: var(--space-1);
  font-size: 1rem;
  line-height: 1;
  user-select: none;
  flex-shrink: 0;
}
.chapter-drag-handle:active { cursor: grabbing; }

.outline-chapter-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  padding: 0;
  min-width: 0;
}

.outline-chapter-info { flex: 1; min-width: 0; }
.outline-chapter-title { font-weight: 600; font-size: 0.9375rem; display: block; }
.outline-chapter-summary { display: block; font-size: 0.8125rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

/* Scene progress dots in chapter header */
.outline-chapter-progress { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
.scene-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.scene-dot--written { background: var(--accent); border-color: var(--accent); }
.scene-dots-more { font-size: 0.6875rem; color: var(--text-muted); }

.outline-chapter-chevron { font-size: 0.875rem; color: var(--text-muted); transition: transform 0.2s ease; flex-shrink: 0; }
.outline-chapter-chevron.collapsed { transform: rotate(-90deg); }

.outline-chapter-actions { display: flex; gap: var(--space-1); align-items: center; flex-shrink: 0; }

/* Scene list */
.outline-scenes {
  border-top: 1px solid var(--border);
  padding: var(--space-2) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.outline-scene-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
  border-radius: var(--radius-sm);
  transition: background 0.12s;
}
.outline-scene-row:hover { background: var(--accent-subtle); }

.scene-drag-handle {
  flex-shrink: 0;
  cursor: grab;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1;
  user-select: none;
  padding: 2px;
}
.scene-drag-handle:active { cursor: grabbing; }

/* Scene written/empty indicator */
.scene-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: transparent;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
}
.scene-status-indicator--written { background: var(--success); border-color: var(--success); }

.outline-scene-info { flex: 1; min-width: 0; }
.outline-scene-title { font-size: 0.875rem; font-weight: 500; display: block; }
.outline-scene-summary { display: block; font-size: 0.8125rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }

.outline-scene-actions { display: flex; align-items: center; gap: var(--space-1); flex-shrink: 0; }
.outline-scene-actions .btn-sm { white-space: nowrap; }

.outline-scenes-empty { padding: var(--space-1) var(--space-2) var(--space-2); }

/* Mobile adjustments */
@media (max-width: 480px) {
  .outline-chapter-summary { display: none; }
  .outline-scene-summary { display: none; }
  .outline-section-actions { display: none; }
}
</style>
