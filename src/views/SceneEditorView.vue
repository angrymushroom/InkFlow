<template>
  <div class="page scene-editor-page">
    <div v-if="loading" class="empty-state">{{ t('scene.loading') }}</div>
    <div v-else-if="!scene" class="empty-state card">
      <p>{{ t('scene.notFound') }}</p>
      <router-link to="/write" class="btn btn-primary" style="margin-top: var(--space-3);">{{ t('scene.backToWrite') }}</router-link>
    </div>
    <div v-else>
      <router-link to="/write" class="btn btn-ghost btn-sm" style="margin-bottom: var(--space-4);">← {{ t('scene.backToWrite') }}</router-link>
      <div class="scene-meta card">
        <h1 class="scene-meta-title">{{ scene.title || t('outline.untitledScene') }}</h1>
        <p v-if="scene.oneSentenceSummary" class="scene-meta-summary">{{ scene.oneSentenceSummary }}</p>
        <p v-if="povName" class="scene-meta-pov">POV: {{ povName }}</p>
        <p v-if="scene.notes" class="scene-meta-notes">{{ scene.notes }}</p>
      </div>
      <div class="form-group prose-wrap">
        <label>{{ t('scene.prose') }}</label>
        <div v-if="selection.active" class="selection-toolbar">
          <span class="selection-toolbar-label">{{ t('writeQuick.capture') }}</span>
          <button type="button" class="btn btn-ghost btn-sm" @click="openPopover('idea')">{{ t('writeQuick.saveAsIdea') }}</button>
          <button type="button" class="btn btn-ghost btn-sm" @click="openPopover('character')">{{ t('writeQuick.addToCharacter') }}</button>
          <button type="button" class="btn btn-ghost btn-sm" @click="openPopover('outline')">{{ t('writeQuick.addToOutline') }}</button>
          <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" @click="clearSelection">×</button>
        </div>
        <div v-if="popover === 'idea'" class="quick-popover">
          <div class="quick-popover-row">
            <label>{{ t('ideas.titleLabel') }}</label>
            <input v-model="ideaForm.title" type="text" :placeholder="t('ideas.shortTitle')" class="quick-input" />
          </div>
          <div class="quick-popover-row">
            <label>{{ t('ideas.typeLabel') }}</label>
            <select v-model="ideaForm.type" class="quick-select idea-type-select" @change="onIdeaTypeChange">
              <optgroup :label="t('ideas.typeGroupSuggested')">
                <option v-for="item in builtInTypes" :key="item.slug" :value="item.slug">{{ t('ideas.' + item.slug) }}</option>
              </optgroup>
              <optgroup v-if="customTypes.length" :label="t('ideas.typeGroupCustom')">
                <option v-for="ct in customTypes" :key="ct.id" :value="ct.name">{{ ct.name }}</option>
              </optgroup>
              <option value="__add_custom__">{{ t('ideas.addCustomType') }}</option>
            </select>
          </div>
          <div class="quick-popover-row">
            <label>{{ t('ideas.bodyLabel') }} ({{ t('writeQuick.optional') }})</label>
            <input v-model="ideaForm.body" type="text" :placeholder="t('ideas.bodyPlaceholder')" class="quick-input" />
          </div>
          <div class="quick-popover-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="popover = null">{{ t('ideas.cancel') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="saveAsIdea">{{ t('ideas.add') }}</button>
          </div>
        </div>
        <div v-if="popover === 'character'" class="quick-popover">
          <div class="quick-popover-row">
            <label>{{ t('writeQuick.characterAction') }}</label>
            <select v-model="characterAction" class="quick-select">
              <option value="new">{{ t('writeQuick.newCharacter') }}</option>
              <option value="existing">{{ t('writeQuick.existingCharacter') }}</option>
            </select>
          </div>
          <div v-if="characterAction === 'new'" class="quick-popover-row">
            <label>{{ t('characters.name') }}</label>
            <input v-model="characterForm.name" type="text" :placeholder="t('characters.namePlaceholder')" class="quick-input" />
          </div>
          <div v-else class="quick-popover-row">
            <label>{{ t('writeQuick.pickCharacter') }}</label>
            <select v-model="characterForm.existingId" class="quick-select">
              <option value="">{{ t('writeQuick.pickCharacter') }}</option>
              <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name || t('characters.unnamed') }}</option>
            </select>
          </div>
          <div class="quick-popover-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="popover = null">{{ t('ideas.cancel') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="saveAsCharacter">{{ t('ideas.add') }}</button>
          </div>
        </div>
        <div v-if="popover === 'outline'" class="quick-popover">
          <div class="quick-popover-row">
            <label>{{ t('writeQuick.outlineAction') }}</label>
            <select v-model="outlineAction" class="quick-select">
              <option value="scene">{{ t('writeQuick.newScene') }}</option>
              <option value="chapter">{{ t('writeQuick.newChapter') }}</option>
              <option value="note">{{ t('writeQuick.noteForScene') }}</option>
            </select>
          </div>
          <div v-if="outlineAction !== 'note'" class="quick-popover-row">
            <label>{{ outlineAction === 'scene' ? t('outline.sceneTitle') : t('outline.chapterTitle') }}</label>
            <input v-model="outlineForm.title" type="text" :placeholder="outlineAction === 'scene' ? t('outline.sceneTitlePlaceholder') : t('outline.chapterTitlePlaceholder')" class="quick-input" />
          </div>
          <div v-if="outlineAction === 'chapter'" class="quick-popover-row">
            <label>{{ t('outline.summary') }} ({{ t('writeQuick.optional') }})</label>
            <input v-model="outlineForm.summary" type="text" :placeholder="t('outline.summaryPlaceholder')" class="quick-input" />
          </div>
          <div class="quick-popover-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="popover = null">{{ t('ideas.cancel') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="saveToOutline">{{ t('ideas.add') }}</button>
          </div>
        </div>
        <ResizableTextarea
          ref="proseTextareaRef"
          v-model="content"
          :placeholder="t('scene.prosePlaceholder')"
          :rows="20"
          input-class="prose-textarea"
          :min-height="400"
          @blur="save"
          @mouseup="onProseMouseUp"
        />
      </div>
      <div class="scene-actions">
        <button class="btn btn-primary" @click="save">{{ t('scene.save') }}</button>
        <span v-if="savedHint" class="saved-hint">{{ t('story.saved') }}</span>
      </div>
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
      <p v-if="quickToast" class="quick-toast">{{ quickToast }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { getScene, getCharacters, getChapters, updateScene, addIdea, addCharacter, addChapter, addScene } from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useIdeaTypes } from '@/composables/useIdeaTypes';
import ResizableTextarea from '@/components/ResizableTextarea.vue';

const { t } = useI18n();
const { builtInTypes, customTypes, addCustomType } = useIdeaTypes();

const route = useRoute();
const sceneId = computed(() => route.params.sceneId);
const scene = ref(null);
const content = ref('');
const loading = ref(true);
const characters = ref([]);
const chapters = ref([]);
const lastSavedContent = ref('');
const savedHint = ref(false);
const saveError = ref('');
const saveTimeout = ref(null);
const beforeUnloadHandler = ref(null);

const proseTextareaRef = ref(null);
const selection = ref({ active: false, text: '', start: 0, end: 0 });
const popover = ref(null);
const quickToast = ref('');
const characterAction = ref('new');
const outlineAction = ref('scene');
const ideaForm = ref({ title: '', body: '', type: 'scene' });
const characterForm = ref({ name: '', existingId: '' });
const outlineForm = ref({ title: '', summary: '' });

const povName = computed(() => {
  if (!scene.value?.povCharacterId) return '';
  const c = characters.value.find((x) => x.id === scene.value.povCharacterId);
  return c?.name ?? '';
});

function isDirty() {
  return scene.value && (content.value !== lastSavedContent.value);
}

function setBeforeUnload() {
  if (beforeUnloadHandler.value) return;
  beforeUnloadHandler.value = (e) => {
    if (isDirty()) e.preventDefault();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler.value);
}
function clearBeforeUnload() {
  if (beforeUnloadHandler.value) {
    window.removeEventListener('beforeunload', beforeUnloadHandler.value);
    beforeUnloadHandler.value = null;
  }
}

function onProseMouseUp() {
  const el = proseTextareaRef.value?.inputRef?.value ?? proseTextareaRef.value;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = (content.value || '').slice(start, end).trim();
  if (text.length > 0) {
    selection.value = { active: true, text, start, end };
    popover.value = null;
    const snippet = text.length > 40 ? text.slice(0, 40) + '…' : text;
    ideaForm.value = { title: snippet, body: '', type: 'scene' };
    characterForm.value = { name: text.length > 30 ? text.slice(0, 30) + '…' : text, existingId: '' };
    outlineForm.value = { title: text.length > 50 ? text.slice(0, 50) + '…' : text, summary: '' };
  } else {
    selection.value = { active: false, text: '', start: 0, end: 0 };
    popover.value = null;
  }
}

function clearSelection() {
  selection.value = { active: false, text: '', start: 0, end: 0 };
  popover.value = null;
  const input = proseTextareaRef.value?.inputRef?.value ?? proseTextareaRef.value;
  input?.focus();
}

function openPopover(which) {
  popover.value = which;
  if (which === 'character') characterAction.value = 'new';
  if (which === 'outline') outlineAction.value = 'scene';
}

async function onIdeaTypeChange() {
  if (ideaForm.value.type !== '__add_custom__') return;
  const name = window.prompt(t.value('ideas.addCustomType'));
  if (!name?.trim()) {
    ideaForm.value.type = 'scene';
    return;
  }
  const newName = await addCustomType(name);
  if (newName) ideaForm.value.type = newName;
  else ideaForm.value.type = 'scene';
}

function showQuickToast(msg) {
  quickToast.value = msg;
  setTimeout(() => { quickToast.value = ''; }, 2500);
}

async function saveAsIdea() {
  try {
    const type = ideaForm.value.type && ideaForm.value.type !== '__add_custom__' ? ideaForm.value.type : 'scene';
    await addIdea({
      title: ideaForm.value.title || selection.value.text,
      body: ideaForm.value.body || '',
      type,
    });
    showQuickToast(t.value('writeQuick.ideaSaved'));
    await nextTick();
    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'));
    clearSelection();
  } catch (e) {
    saveError.value = e?.message || t.value('story.saveError');
  }
}

async function saveAsCharacter() {
  try {
    if (characterAction.value === 'new') {
      await addCharacter({ name: characterForm.value.name || selection.value.text });
      showQuickToast(t.value('writeQuick.characterSaved'));
      await nextTick();
      window.dispatchEvent(new CustomEvent('inkflow-characters-changed'));
    } else {
      if (characterForm.value.existingId) {
        const c = characters.value.find((x) => x.id === characterForm.value.existingId);
        const name = c?.name || t.value('characters.unnamed');
        showQuickToast(t.value('writeQuick.linkedToCharacter').replace('{name}', name));
      }
    }
    clearSelection();
  } catch (e) {
    saveError.value = e?.message || t.value('story.saveError');
  }
}

async function saveToOutline() {
  try {
    if (outlineAction.value === 'scene' && scene.value?.chapterId) {
      await addScene({
        chapterId: scene.value.chapterId,
        title: outlineForm.value.title || selection.value.text,
        oneSentenceSummary: outlineForm.value.summary || '',
      });
      showQuickToast(t.value('writeQuick.sceneSaved'));
      window.dispatchEvent(new CustomEvent('inkflow-outline-changed'));
    } else if (outlineAction.value === 'chapter') {
      await addChapter({ title: outlineForm.value.title || selection.value.text, summary: outlineForm.value.summary || '' });
      showQuickToast(t.value('writeQuick.chapterSaved'));
      window.dispatchEvent(new CustomEvent('inkflow-outline-changed'));
    } else if (outlineAction.value === 'note' && scene.value) {
      const newNote = (scene.value.notes || '') + (scene.value.notes ? '\n' : '') + selection.value.text;
      await updateScene(scene.value.id, { notes: newNote });
      scene.value = { ...scene.value, notes: newNote };
      showQuickToast(t.value('writeQuick.noteSaved'));
    }
    clearSelection();
  } catch (e) {
    saveError.value = e?.message || t.value('story.saveError');
  }
}

async function load() {
  loading.value = true;
  const [s, chars] = await Promise.all([
    getScene(sceneId.value),
    getCharacters(),
  ]);
  characters.value = chars;
  if (s) {
    scene.value = s;
    content.value = s.content ?? '';
    lastSavedContent.value = content.value;
  } else {
    scene.value = null;
  }
  loading.value = false;
}

async function save() {
  if (!scene.value) return;
  saveError.value = '';
  try {
    await updateScene(scene.value.id, { content: content.value });
    lastSavedContent.value = content.value;
    clearBeforeUnload();
    savedHint.value = true;
    setTimeout(() => { savedHint.value = false; }, 2000);
  } catch (e) {
    saveError.value = e?.message || t.value('story.saveError');
    setBeforeUnload();
  }
}

async function autoSave() {
  if (!scene.value || !isDirty()) return;
  try {
    await updateScene(scene.value.id, { content: content.value });
    lastSavedContent.value = content.value;
    clearBeforeUnload();
    savedHint.value = true;
    setTimeout(() => { savedHint.value = false; }, 2000);
  } catch (e) {
    saveError.value = e?.message || t.value('story.saveError');
    setBeforeUnload();
  }
}

onMounted(() => {
  load();
  watch(content, () => {
    if (!scene.value) return;
    if (saveTimeout.value) clearTimeout(saveTimeout.value);
    if (isDirty()) setBeforeUnload();
    saveTimeout.value = setTimeout(() => {
      autoSave();
      saveTimeout.value = null;
    }, 1800);
  });
  watch(sceneId, load);
});

onUnmounted(() => {
  if (saveTimeout.value) clearTimeout(saveTimeout.value);
  clearBeforeUnload();
});
</script>

<style scoped>
.scene-editor-page {
  max-width: 800px;
}
.scene-meta {
  margin-bottom: var(--space-5);
}
.scene-meta-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
}
.scene-meta-summary {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.scene-meta-pov,
.scene-meta-notes {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}
.prose-wrap {
  position: relative;
}
.selection-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.selection-toolbar-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-right: var(--space-1);
}
.quick-popover {
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.quick-popover-row {
  margin-bottom: var(--space-2);
}
.quick-popover-row label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: var(--space-1);
}
.quick-input,
.quick-select {
  width: 100%;
  max-width: 320px;
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
}
.quick-popover-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.quick-toast {
  margin-top: var(--space-2);
  font-size: 0.875rem;
  color: var(--accent);
}
.prose-textarea {
  min-height: 400px;
  max-height: 85vh;
  width: 100%;
  max-width: 100%;
  resize: both;
  font-size: 1rem;
  line-height: 1.6;
}
.scene-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.saved-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
}
.save-error {
  margin-top: var(--space-2);
  font-size: 0.875rem;
  color: var(--danger);
}
</style>
