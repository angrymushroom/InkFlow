<template>
  <div class="page">
    <h1 class="page-title">{{ t('outline.title') }}</h1>
    <p class="page-subtitle">{{ t('outline.subtitle') }}</p>

    <div v-if="showChapterForm" class="card form-card">
      <h2 class="form-title">{{ editingChapterId ? t('outline.editChapter') : t('outline.newChapter') }}</h2>
      <div class="form-group">
        <label>{{ t('outline.chapterTitle') }}</label>
        <input v-model="chapterForm.title" type="text" :placeholder="t('outline.chapterTitlePlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ t('outline.summary') }}</label>
        <textarea v-model="chapterForm.summary" :placeholder="t('outline.summaryPlaceholder')" rows="2" />
        <AiExpandButton :current-value="chapterForm.summary" :field-name="t('outline.chapterSummary')" @expanded="chapterForm.summary = $event" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" @click="cancelChapterForm">{{ t('ideas.cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="saveChapter">{{ editingChapterId ? t('ideas.save') : t('ideas.add') }}</button>
      </div>
    </div>

    <div v-if="showSceneForm" class="card form-card">
      <h2 class="form-title">{{ editingSceneId ? t('outline.editScene') : t('outline.newScene') }}</h2>
      <div class="form-group">
        <label>{{ t('outline.chapter') }}</label>
        <select v-model="sceneForm.chapterId" required>
          <option value="">{{ t('outline.selectChapter') }}</option>
          <option v-for="ch in chapters" :key="ch.id" :value="ch.id">{{ ch.title || t('ideas.untitled') }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ t('outline.sceneTitle') }}</label>
        <input v-model="sceneForm.title" type="text" :placeholder="t('outline.sceneTitlePlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ t('outline.oneSentenceSummary') }}</label>
        <input v-model="sceneForm.oneSentenceSummary" type="text" :placeholder="t('outline.oneSentencePlaceholder')" />
        <AiExpandButton :current-value="sceneForm.oneSentenceSummary" :field-name="t('outline.sceneOneSentence')" @expanded="sceneForm.oneSentenceSummary = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('outline.povCharacter') }}</label>
        <select v-model="sceneForm.povCharacterId">
          <option value="">—</option>
          <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name || t('characters.unnamed') }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ t('outline.notes') }}</label>
        <textarea v-model="sceneForm.notes" :placeholder="t('outline.notesPlaceholder')" rows="2" />
        <AiExpandButton :current-value="sceneForm.notes" :field-name="t('outline.sceneNotes')" @expanded="sceneForm.notes = $event" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" @click="cancelSceneForm">{{ t('ideas.cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="saveScene">{{ editingSceneId ? t('ideas.save') : t('ideas.add') }}</button>
      </div>
    </div>

    <div class="outline-actions">
      <button type="button" class="btn btn-primary" @click="openNewChapter">+ {{ t('outline.newChapter') }}</button>
      <button type="button" class="btn btn-ghost" @click="openNewScene" :disabled="!chapters.length">+ {{ t('outline.newScene') }}</button>
    </div>

    <div v-if="!chapters.length && !showChapterForm" class="empty-state card">
      <p>{{ t('outline.empty') }}</p>
    </div>

    <div v-else class="outline-list">
      <div v-for="ch in chapters" :key="ch.id" class="card chapter-card">
        <div class="chapter-header">
          <h3 class="chapter-title chapter-title-link" @click="goToWrite">
            {{ ch.title || t('outline.untitledChapter') }}
          </h3>
          <div class="chapter-actions">
            <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="editChapter(ch)" :title="t('ideas.edit')">✏️</button>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="addSceneToChapter(ch.id)" :title="t('outline.addScene')" :disabled="addingSceneForChapter === ch.id">➕</button>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="removeChapter(ch.id)" :title="t('ideas.delete')">🗑️</button>
          </div>
        </div>
        <p v-if="ch.summary" class="chapter-summary">{{ ch.summary }}</p>
        <div class="scenes">
          <div
            v-for="scene in scenesByChapter(ch.id)"
            :key="scene.id"
            class="scene-card"
            @click="goToScene(scene.id)"
          >
            <div class="scene-card-main">
              <span class="scene-card-title">{{ scene.title || t('outline.untitledScene') }}</span>
              <span v-if="scene.oneSentenceSummary" class="scene-card-summary">{{ scene.oneSentenceSummary }}</span>
            </div>
            <div class="scene-card-actions" @click.stop>
              <router-link :to="`/write/${scene.id}`" class="btn btn-primary btn-sm">{{ t('outline.writeScene') }}</router-link>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" @click="editScene(scene)" :title="t('ideas.edit')">✏️</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" @click="removeScene(scene.id)" :title="t('ideas.delete')">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  getCharacters,
  addChapter,
  updateChapter,
  deleteChapter,
  addScene,
  updateScene,
  deleteScene,
} from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import AiExpandButton from '@/components/AiExpandButton.vue';

const { t } = useI18n();
const router = useRouter();
const { chapters, scenes, load, getScenesForChapter } = useOutline();

const characters = ref([]);
const showChapterForm = ref(false);
const showSceneForm = ref(false);
const editingChapterId = ref(null);
const editingSceneId = ref(null);
const addingSceneForChapter = ref(null);
const chapterForm = ref({ title: '', summary: '' });
const sceneForm = ref({
  chapterId: '',
  title: '',
  oneSentenceSummary: '',
  povCharacterId: '',
  notes: '',
});

function scenesByChapter(chapterId) {
  return getScenesForChapter(chapterId);
}

async function loadCharacters() {
  characters.value = await getCharacters();
}

async function loadAll() {
  await load();
  await loadCharacters();
}

function openNewChapter() {
  editingChapterId.value = null;
  chapterForm.value = { title: '', summary: '' };
  showChapterForm.value = true;
  showSceneForm.value = false;
}

function editChapter(ch) {
  editingChapterId.value = ch.id;
  chapterForm.value = { title: ch.title ?? '', summary: ch.summary ?? '' };
  showChapterForm.value = true;
  showSceneForm.value = false;
}

function cancelChapterForm() {
  showChapterForm.value = false;
  editingChapterId.value = null;
}

async function saveChapter() {
  if (editingChapterId.value) {
    await updateChapter(editingChapterId.value, chapterForm.value);
  } else {
    await addChapter(chapterForm.value);
  }
  await loadAll();
  cancelChapterForm();
}

async function removeChapter(id) {
  if (!confirm(t.value('outline.confirmChapter'))) return;
  await deleteChapter(id);
  await loadAll();
}

function goToWrite() {
  router.push('/write');
}

function goToScene(sceneId) {
  router.push(`/write/${sceneId}`);
}

function openNewScene() {
  editingSceneId.value = null;
  sceneForm.value = {
    chapterId: chapters.value[0]?.id ?? '',
    title: '',
    oneSentenceSummary: '',
    povCharacterId: '',
    notes: '',
  };
  showSceneForm.value = true;
  showChapterForm.value = false;
}

async function addSceneToChapter(chapterId) {
  if (!chapterId) return;
  addingSceneForChapter.value = chapterId;
  try {
    await addScene({
      chapterId,
      title: '',
      oneSentenceSummary: '',
      povCharacterId: '',
      notes: '',
    });
    await loadAll();
  } finally {
    addingSceneForChapter.value = null;
  }
}

function editScene(scene) {
  editingSceneId.value = scene.id;
  sceneForm.value = {
    chapterId: scene.chapterId,
    title: scene.title ?? '',
    oneSentenceSummary: scene.oneSentenceSummary ?? '',
    povCharacterId: scene.povCharacterId ?? '',
    notes: scene.notes ?? '',
  };
  showSceneForm.value = true;
  showChapterForm.value = false;
}

function cancelSceneForm() {
  showSceneForm.value = false;
  editingSceneId.value = null;
}

async function saveScene() {
  if (!sceneForm.value.chapterId) return;
  if (editingSceneId.value) {
    await updateScene(editingSceneId.value, sceneForm.value);
  } else {
    await addScene(sceneForm.value);
  }
  await loadAll();
  cancelSceneForm();
}

async function removeScene(id) {
  if (!confirm(t.value('outline.confirmScene'))) return;
  await deleteScene(id);
  await loadAll();
}

onMounted(loadAll);
</script>

<style scoped>
.form-card {
  margin-bottom: var(--space-5);
}
.form-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-4);
}
.form-group {
  margin-bottom: var(--space-4);
}
.form-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.outline-actions {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}
.outline-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.chapter-card {
  padding: var(--space-4);
}
.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
}
.chapter-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}
.chapter-summary {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
}
.chapter-actions {
  display: flex;
  gap: var(--space-1);
}
.scenes {
  margin-top: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}
.chapter-title-link {
  cursor: pointer;
  transition: color 0.15s;
}
.chapter-title-link:hover {
  color: var(--accent);
}
.scene-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.scene-card:hover {
  background: var(--bg-elevated);
  border-color: var(--accent);
  box-shadow: var(--shadow);
}
.scene-card-main {
  flex: 1;
  min-width: 0;
}
.scene-card-title {
  font-weight: 600;
  font-size: 1rem;
  display: block;
}
.scene-card-summary {
  display: block;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: var(--space-1);
}
.scene-card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}
.scene-card-actions .btn-sm {
  white-space: nowrap;
}
</style>
