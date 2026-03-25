<template>
  <div class="page">
    <h1 class="page-title">{{ pageTitle }}</h1>
    <p class="page-subtitle">{{ pageSubtitle }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>

    <div v-if="showForm" class="card form-card">
      <h2 class="form-title">{{ editingId ? t('ideas.editIdea') : t('ideas.newIdea') }}</h2>
      <div class="form-group">
        <label>{{ t('ideas.titleLabel') }}</label>
        <input v-model="form.title" type="text" :placeholder="t('ideas.shortTitle')" />
      </div>
      <div class="form-group">
        <label>{{ t('ideas.bodyLabel') }}</label>
        <ResizableTextarea v-model="form.body" :placeholder="t('ideas.bodyPlaceholder')" :rows="4" />
        <AiExpandButton :current-value="form.body" :field-name="t('ideas.ideaBody')" @expanded="form.body = $event" />
      </div>
      <div v-if="!typeFilter" class="form-group">
        <label>{{ t('ideas.typeLabel') }}</label>
        <select v-model="form.type" class="idea-type-select" @change="onIdeaTypeChange">
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

    <button v-if="!showForm" class="btn btn-primary" @click="openNew">+ {{ t('ideas.newIdea') }}</button>

    <div v-if="!displayedIdeas.length && !showForm" class="empty-state card">
      <OtterIllustration v-if="!typeFilter" size="md" variant="idle" class="empty-otter" />
      <p>{{ typeFilter ? t('entities.emptyFilter') : t('ideas.empty') }}</p>
    </div>

    <div v-else class="idea-list">
      <div v-for="idea in displayedIdeas" :key="idea.id" class="card idea-card">
        <div class="idea-header">
          <span class="idea-type">{{ getIdeaTypeLabel(idea.type, (key) => t(key)) }}</span>
          <div class="idea-actions">
            <button class="btn btn-ghost btn-sm btn-icon" @click="editIdea(idea)" :title="t('ideas.edit')">✏️</button>
            <button class="btn btn-ghost btn-sm btn-icon" @click="removeIdea(idea.id)" :title="t('ideas.delete')">🗑️</button>
          </div>
        </div>
        <h3 class="idea-title">{{ idea.title || t('ideas.untitled') }}</h3>
        <p v-if="idea.body" class="idea-body">{{ idea.body }}</p>
      </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getIdeas, addIdea, updateIdea, deleteIdea } from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useIdeaTypes } from '@/composables/useIdeaTypes';
import AiExpandButton from '@/components/AiExpandButton.vue';
import ResizableTextarea from '@/components/ResizableTextarea.vue';
import OtterIllustration from '@/components/OtterIllustration.vue';

const props = defineProps({
  /** When set, only show ideas of this type and default new idea to this type */
  typeFilter: { type: String, default: '' },
});

const { t } = useI18n();
const { builtInTypes, customTypes, addCustomType, getIdeaTypeLabel, isBuiltInType } = useIdeaTypes();

const ideas = ref([]);
const displayedIdeas = computed(() => {
  if (!props.typeFilter) return ideas.value;
  return ideas.value.filter((i) => (i.type || 'plot') === props.typeFilter);
});
const pageTitle = computed(() => {
  if (!props.typeFilter) return t.value('ideas.title');
  return isBuiltInType(props.typeFilter) ? t.value('ideas.' + props.typeFilter) : props.typeFilter;
});
const pageSubtitle = computed(() => {
  return t.value('ideas.subtitle');
});
const showForm = ref(false);
const editingId = ref(null);
const form = ref({ title: '', body: '', type: 'plot' });
const loadError = ref('');
const saveError = ref('');
const showCustomTypeModal = ref(false);
const customTypeName = ref('');
const customTypeError = ref('');

function onIdeaTypeChange() {
  if (form.value.type !== '__add_custom__') return;
  customTypeName.value = '';
  customTypeError.value = '';
  showCustomTypeModal.value = true;
}

function closeCustomTypeModal() {
  showCustomTypeModal.value = false;
  form.value.type = 'plot';
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
      form.value.type = newName;
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
    ideas.value = await getIdeas();
  } catch (e) {
    loadError.value = e?.message || t.value('common.loadErrorGeneric');
  }
}

function openNew() {
  editingId.value = null;
  const defaultType = props.typeFilter || 'plot';
  form.value = { title: '', body: '', type: defaultType };
  showForm.value = true;
}

function editIdea(idea) {
  editingId.value = idea.id;
  form.value = { title: idea.title, body: idea.body, type: idea.type || 'plot' };
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
}

async function saveIdea() {
  saveError.value = '';
  const type = form.value.type && form.value.type !== '__add_custom__' ? form.value.type : 'plot';
  const payload = { ...form.value, type };
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

onMounted(() => {
  load();
  window.addEventListener('inkflow-story-switched', load);
  window.addEventListener('inkflow-ideas-changed', load);
});
onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', load);
  window.removeEventListener('inkflow-ideas-changed', load);
});
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
.idea-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
.idea-card {
  padding: var(--space-4);
}
.idea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.idea-type {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.idea-actions {
  display: flex;
  gap: var(--space-1);
}
.idea-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
}
.idea-body {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0;
  white-space: pre-wrap;
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
</style>
