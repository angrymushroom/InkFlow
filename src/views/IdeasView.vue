<template>
  <div class="page">
    <h1 class="page-title">{{ t('ideas.title') }}</h1>
    <p class="page-subtitle">{{ t('ideas.subtitle') }}</p>

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
      <div class="form-group">
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

    <div v-if="!ideas.length && !showForm" class="empty-state card">
      <p>{{ t('ideas.empty') }}</p>
    </div>

    <div v-else class="idea-list">
      <div v-for="idea in ideas" :key="idea.id" class="card idea-card">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getIdeas, addIdea, updateIdea, deleteIdea } from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useIdeaTypes } from '@/composables/useIdeaTypes';
import AiExpandButton from '@/components/AiExpandButton.vue';
import ResizableTextarea from '@/components/ResizableTextarea.vue';

const { t } = useI18n();
const { builtInTypes, customTypes, addCustomType, getIdeaTypeLabel } = useIdeaTypes();

const ideas = ref([]);
const showForm = ref(false);
const editingId = ref(null);
const form = ref({ title: '', body: '', type: 'plot' });

async function onIdeaTypeChange() {
  if (form.value.type !== '__add_custom__') return;
  const name = window.prompt(t.value('ideas.addCustomType'));
  if (!name?.trim()) {
    form.value.type = 'plot';
    return;
  }
  const newName = await addCustomType(name);
  if (newName) form.value.type = newName;
  else form.value.type = 'plot';
}

async function load() {
  ideas.value = await getIdeas();
}

function openNew() {
  editingId.value = null;
  form.value = { title: '', body: '', type: 'plot' };
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
  const type = form.value.type && form.value.type !== '__add_custom__' ? form.value.type : 'plot';
  const payload = { ...form.value, type };
  if (editingId.value) {
    await updateIdea(editingId.value, payload);
  } else {
    await addIdea(payload);
  }
  await load();
  cancelForm();
  window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'));
}

async function removeIdea(id) {
  if (!confirm(t.value('ideas.confirmDelete'))) return;
  await deleteIdea(id);
  await load();
  window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'));
}

onMounted(() => {
  load();
  window.addEventListener('inkflow-story-switched', load);
});
onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', load);
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
</style>
