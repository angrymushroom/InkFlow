<template>
  <div class="page">
    <h1 class="page-title">{{ t('entities.title') }}</h1>
    <p class="page-subtitle">{{ t('entities.subtitle') }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>

    <div class="entities-toolbar">
      <label class="filter-label">{{ t('entities.filterByType') }}</label>
      <select v-model="selectedType" class="entity-type-select" @change="onTypeChange">
        <option value="characters">{{ t('entities.typeCharacters') }}</option>
        <optgroup :label="t('ideas.typeGroupSuggested')">
          <option v-for="item in builtInTypes" :key="item.slug" :value="item.slug">{{ t('ideas.' + item.slug) }}</option>
        </optgroup>
        <optgroup v-if="customTypes.length" :label="t('ideas.typeGroupCustom')">
          <option v-for="ct in customTypes" :key="ct.id" :value="ct.name">{{ ct.name }}</option>
        </optgroup>
      </select>
    </div>

    <!-- Character form -->
    <div v-if="showForm && editingKind === 'character'" class="card form-card">
      <h2 class="form-title">{{ editingId ? t('characters.editCharacter') : t('characters.newCharacter') }}</h2>
      <div class="form-group">
        <label>{{ t('characters.name') }}</label>
        <input v-model="charForm.name" type="text" :placeholder="t('characters.namePlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.oneSentence') }}</label>
        <input v-model="charForm.oneSentence" type="text" :placeholder="t('characters.oneSentencePlaceholder')" />
        <AiExpandButton :current-value="charForm.oneSentence" :field-name="t('characters.fieldOneSentence')" @expanded="charForm.oneSentence = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.goal') }}</label>
        <input v-model="charForm.goal" type="text" :placeholder="t('characters.goalPlaceholder')" />
        <AiExpandButton :current-value="charForm.goal" :field-name="t('characters.fieldGoal')" @expanded="charForm.goal = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.motivation') }}</label>
        <ResizableTextarea v-model="charForm.motivation" :placeholder="t('characters.motivationPlaceholder')" :rows="2" />
        <AiExpandButton :current-value="charForm.motivation" :field-name="t('characters.fieldMotivation')" @expanded="charForm.motivation = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.conflict') }}</label>
        <ResizableTextarea v-model="charForm.conflict" :placeholder="t('characters.conflictPlaceholder')" :rows="2" />
        <AiExpandButton :current-value="charForm.conflict" :field-name="t('characters.fieldConflict')" @expanded="charForm.conflict = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.epiphany') }}</label>
        <ResizableTextarea v-model="charForm.epiphany" :placeholder="t('characters.epiphanyPlaceholder')" :rows="2" />
        <AiExpandButton :current-value="charForm.epiphany" :field-name="t('characters.fieldEpiphany')" @expanded="charForm.epiphany = $event" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" @click="cancelForm">{{ t('ideas.cancel') }}</button>
        <button class="btn btn-primary" @click="saveCharacter">{{ editingId ? t('ideas.save') : t('ideas.add') }}</button>
      </div>
    </div>

    <!-- Idea form -->
    <div v-if="showForm && editingKind === 'idea'" class="card form-card">
      <h2 class="form-title">{{ editingId ? t('ideas.editIdea') : t('ideas.newIdea') }}</h2>
      <div class="form-group">
        <label>{{ t('ideas.titleLabel') }}</label>
        <input v-model="ideaForm.title" type="text" :placeholder="t('ideas.shortTitle')" />
      </div>
      <div class="form-group">
        <label>{{ t('ideas.bodyLabel') }}</label>
        <ResizableTextarea v-model="ideaForm.body" :placeholder="t('ideas.bodyPlaceholder')" :rows="4" />
        <AiExpandButton :current-value="ideaForm.body" :field-name="t('ideas.ideaBody')" @expanded="ideaForm.body = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('ideas.typeLabel') }}</label>
        <select v-model="ideaForm.type" class="idea-type-select" @change="onIdeaTypeChange">
          <optgroup :label="t('ideas.typeGroupSuggested')">
            <option v-for="item in builtInTypes" :key="item.slug" :value="item.slug">{{ t('ideas.' + item.slug) }}</option>
          </optgroup>
          <optgroup v-if="customTypes.length" :label="t('ideas.typeGroupCustom')">
            <option v-for="ct in customTypes" :key="ct.id" :value="ct.name">{{ ct.name }}</option>
          </optgroup>
          <option value="__add_custom__">{{ t('ideas.addCustomType') }}</option>
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" @click="cancelForm">{{ t('ideas.cancel') }}</button>
        <button class="btn btn-primary" @click="saveIdea">{{ editingId ? t('ideas.save') : t('ideas.add') }}</button>
      </div>
    </div>

    <button v-if="!showForm" class="btn btn-primary" @click="openAdd">{{ addButtonLabel }}</button>

    <div v-if="!filteredEntities.length && !showForm" class="empty-state card">
      <p>{{ emptyMessage }}</p>
    </div>

    <div v-else-if="!showForm" class="entity-list">
      <template v-if="selectedType === 'characters'">
        <div v-for="char in characters" :key="char.id" class="card char-card">
          <div class="char-header">
            <h3 class="char-name">{{ char.name || t('characters.unnamed') }}</h3>
            <div class="char-actions">
              <button class="btn btn-ghost btn-sm btn-icon" @click="editCharacter(char)" :title="t('ideas.edit')">✏️</button>
              <button class="btn btn-ghost btn-sm btn-icon" @click="removeCharacter(char.id)" :title="t('ideas.delete')">🗑️</button>
            </div>
          </div>
          <p v-if="char.oneSentence" class="char-one-sentence">{{ char.oneSentence }}</p>
          <dl v-if="char.goal || char.motivation || char.conflict || char.epiphany" class="char-dl">
            <template v-if="char.goal">
              <dt>{{ t('characters.goal') }}</dt>
              <dd>{{ char.goal }}</dd>
            </template>
            <template v-if="char.motivation">
              <dt>{{ t('characters.motivation') }}</dt>
              <dd>{{ char.motivation }}</dd>
            </template>
            <template v-if="char.conflict">
              <dt>{{ t('characters.conflict') }}</dt>
              <dd>{{ char.conflict }}</dd>
            </template>
            <template v-if="char.epiphany">
              <dt>{{ t('characters.epiphany') }}</dt>
              <dd>{{ char.epiphany }}</dd>
            </template>
          </dl>
        </div>
      </template>
      <template v-else>
        <div v-for="idea in filteredIdeas" :key="idea.id" class="card idea-card">
          <div class="idea-header">
            <span class="idea-type">{{ getIdeaTypeLabel(idea.type, t) }}</span>
            <div class="idea-actions">
              <button class="btn btn-ghost btn-sm btn-icon" @click="editIdea(idea)" :title="t('ideas.edit')">✏️</button>
              <button class="btn btn-ghost btn-sm btn-icon" @click="removeIdea(idea.id)" :title="t('ideas.delete')">🗑️</button>
            </div>
          </div>
          <h3 class="idea-title">{{ idea.title || t('ideas.untitled') }}</h3>
          <p v-if="idea.body" class="idea-body">{{ idea.body }}</p>
        </div>
      </template>
    </div>

    <div v-if="showCustomTypeModal" class="modal-backdrop" @click.self="closeCustomTypeModal">
      <div class="modal-card">
        <h3 class="modal-title">{{ t('ideas.customTypeModalTitle') }}</h3>
        <div class="form-group">
          <input v-model="customTypeName" type="text" :placeholder="t('ideas.customTypeModalPlaceholder')" class="modal-input" @keydown.enter="saveCustomType" />
        </div>
        <p v-if="customTypeError" class="save-error">{{ customTypeError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeCustomTypeModal">{{ t('ideas.cancel') }}</button>
          <button type="button" class="btn btn-primary" @click="saveCustomType">{{ t('ideas.customTypeModalSave') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getIdeas, getCharacters, addIdea, updateIdea, deleteIdea, addCharacter, updateCharacter, deleteCharacter, getCurrentStoryId } from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useIdeaTypes } from '@/composables/useIdeaTypes';
import AiExpandButton from '@/components/AiExpandButton.vue';
import ResizableTextarea from '@/components/ResizableTextarea.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { builtInTypes, customTypes, addCustomType, getIdeaTypeLabel, isBuiltInType } = useIdeaTypes();

const ideas = ref([]);
const characters = ref([]);
const selectedType = ref('characters');
const showForm = ref(false);
const editingId = ref(null);
const editingKind = ref('character');
const loadError = ref('');
const saveError = ref('');
const showCustomTypeModal = ref(false);
const customTypeName = ref('');
const customTypeError = ref('');

const charForm = ref({
  name: '',
  oneSentence: '',
  goal: '',
  motivation: '',
  conflict: '',
  epiphany: '',
});
const ideaForm = ref({ title: '', body: '', type: 'plot' });

const filteredIdeas = computed(() =>
  ideas.value.filter((i) => (i.type || 'plot') === selectedType.value)
);
const filteredEntities = computed(() => {
  if (selectedType.value === 'characters') return characters.value;
  return filteredIdeas.value;
});
const addButtonLabel = computed(() => {
  if (selectedType.value === 'characters') return `+ ${t('entities.addCharacter')}`;
  const label = isBuiltInType(selectedType.value) ? t('ideas.' + selectedType.value) : selectedType.value;
  return `+ ${t('entities.addEntity')}`.replace('{type}', label);
});
const emptyMessage = computed(() => {
  if (selectedType.value === 'characters') return t('characters.empty');
  return t('entities.emptyFilter');
});

function onTypeChange() {
  router.replace({ path: '/entities', query: { ...route.query, type: selectedType.value } });
  cancelForm();
}

watch(
  () => route.query.type,
  (type) => {
    if (type && type !== selectedType.value) selectedType.value = type;
  },
  { immediate: true }
);

function onIdeaTypeChange() {
  if (ideaForm.value.type !== '__add_custom__') return;
  customTypeName.value = '';
  customTypeError.value = '';
  showCustomTypeModal.value = true;
}

function closeCustomTypeModal() {
  showCustomTypeModal.value = false;
  ideaForm.value.type = selectedType.value && selectedType.value !== 'characters' ? selectedType.value : 'plot';
  customTypeName.value = '';
  customTypeError.value = '';
}

async function saveCustomType() {
  customTypeError.value = '';
  const name = customTypeName.value?.trim();
  if (!name) {
    customTypeError.value = t.value('ideas.customTypeModalNameRequired');
    return;
  }
  try {
    const newName = await addCustomType(name);
    if (newName) {
      ideaForm.value.type = newName;
      showCustomTypeModal.value = false;
      customTypeName.value = '';
    } else {
      customTypeError.value = t.value('common.saveErrorGeneric');
    }
  } catch (e) {
    customTypeError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

async function load() {
  loadError.value = '';
  try {
    const [ideaList, charList] = await Promise.all([getIdeas(), getCharacters()]);
    ideas.value = ideaList;
    characters.value = charList;
  } catch (e) {
    loadError.value = e?.message || t.value('common.loadErrorGeneric');
  }
}

function openAdd() {
  editingId.value = null;
  if (selectedType.value === 'characters') {
    editingKind.value = 'character';
    charForm.value = { name: '', oneSentence: '', goal: '', motivation: '', conflict: '', epiphany: '' };
  } else {
    editingKind.value = 'idea';
    ideaForm.value = { title: '', body: '', type: selectedType.value || 'plot' };
  }
  showForm.value = true;
}

function editCharacter(c) {
  editingKind.value = 'character';
  editingId.value = c.id;
  charForm.value = {
    name: c.name ?? '',
    oneSentence: c.oneSentence ?? '',
    goal: c.goal ?? '',
    motivation: c.motivation ?? '',
    conflict: c.conflict ?? '',
    epiphany: c.epiphany ?? '',
  };
  showForm.value = true;
}

function editIdea(idea) {
  editingKind.value = 'idea';
  editingId.value = idea.id;
  ideaForm.value = { title: idea.title, body: idea.body, type: idea.type || 'plot' };
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
}

async function saveCharacter() {
  saveError.value = '';
  try {
    if (editingId.value) {
      await updateCharacter(editingId.value, charForm.value);
    } else {
      await addCharacter(charForm.value);
    }
    await load();
    cancelForm();
    window.dispatchEvent(new CustomEvent('inkflow-characters-changed'));
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

async function saveIdea() {
  saveError.value = '';
  const type = ideaForm.value.type && ideaForm.value.type !== '__add_custom__' ? ideaForm.value.type : 'plot';
  const payload = { ...ideaForm.value, type };
  try {
    if (editingId.value) {
      await updateIdea(editingId.value, payload);
    } else {
      await addIdea(payload);
    }
    await load();
    cancelForm();
    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'));
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

async function removeCharacter(id) {
  if (!confirm(t.value('characters.confirmDelete'))) return;
  saveError.value = '';
  try {
    await deleteCharacter(id);
    await load();
    window.dispatchEvent(new CustomEvent('inkflow-characters-changed'));
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

async function removeIdea(id) {
  if (!confirm(t.value('ideas.confirmDelete'))) return;
  saveError.value = '';
  try {
    await deleteIdea(id);
    await load();
    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'));
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

onMounted(async () => {
  const type = route.query.type;
  if (type) selectedType.value = type;
  try {
    await load();
  } catch (e) {
    loadError.value = e?.message || t.value('common.loadErrorGeneric');
  }
  // #region agent log
  fetch('http://127.0.0.1:7453/ingest/c807a8a1-88f8-4b0f-a487-d01b643f354a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'18ab8d'},body:JSON.stringify({sessionId:'18ab8d',location:'EntitiesView.vue:onMounted',message:'Entities load done',data:{ideasLen:ideas.value.length,charactersLen:characters.value.length,loadError:loadError.value,currentStoryId:getCurrentStoryId()},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  window.addEventListener('inkflow-story-switched', load);
});
onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', load);
});
</script>

<style scoped>
.entities-toolbar {
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
}
.entity-type-select {
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  min-width: 10rem;
}
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
.entity-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
.char-card,
.idea-card {
  padding: var(--space-4);
}
.char-header,
.idea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.idea-header {
  align-items: flex-start;
}
.char-name,
.idea-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
}
.idea-type {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.char-actions,
.idea-actions {
  display: flex;
  gap: var(--space-1);
}
.char-one-sentence {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
  font-style: italic;
}
.idea-body {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0;
  white-space: pre-wrap;
}
.char-dl {
  margin: 0;
  font-size: 0.875rem;
}
.char-dl dt {
  font-weight: 600;
  color: var(--text-muted);
  margin-top: var(--space-2);
}
.char-dl dd {
  margin: var(--space-1) 0 0;
}
.save-error {
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  color: var(--danger);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--space-4);
  box-sizing: border-box;
}
.modal-card {
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
  max-width: 28rem;
  width: 100%;
  box-shadow: var(--shadow-md), 0 0 0 1px rgba(0, 0, 0, 0.05);
}
.modal-title {
  margin: 0 0 var(--space-3);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}
.modal-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  box-sizing: border-box;
}
.modal-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.idea-type-select {
  width: 100%;
  max-width: 20rem;
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
}
</style>
