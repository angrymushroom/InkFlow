<template>
  <div class="page">
    <h1 class="page-title">{{ t('characters.title') }}</h1>
    <p class="page-subtitle">{{ t('characters.subtitle') }}</p>

    <div v-if="showForm" class="card form-card">
      <h2 class="form-title">{{ editingId ? t('characters.editCharacter') : t('characters.newCharacter') }}</h2>
      <div class="form-group">
        <label>{{ t('characters.name') }}</label>
        <input v-model="form.name" type="text" :placeholder="t('characters.namePlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.oneSentence') }}</label>
        <input v-model="form.oneSentence" type="text" :placeholder="t('characters.oneSentencePlaceholder')" />
        <AiExpandButton :current-value="form.oneSentence" :field-name="t('characters.fieldOneSentence')" @expanded="form.oneSentence = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.goal') }}</label>
        <input v-model="form.goal" type="text" :placeholder="t('characters.goalPlaceholder')" />
        <AiExpandButton :current-value="form.goal" :field-name="t('characters.fieldGoal')" @expanded="form.goal = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.motivation') }}</label>
        <textarea v-model="form.motivation" :placeholder="t('characters.motivationPlaceholder')" rows="2" />
        <AiExpandButton :current-value="form.motivation" :field-name="t('characters.fieldMotivation')" @expanded="form.motivation = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.conflict') }}</label>
        <textarea v-model="form.conflict" :placeholder="t('characters.conflictPlaceholder')" rows="2" />
        <AiExpandButton :current-value="form.conflict" :field-name="t('characters.fieldConflict')" @expanded="form.conflict = $event" />
      </div>
      <div class="form-group">
        <label>{{ t('characters.epiphany') }}</label>
        <textarea v-model="form.epiphany" :placeholder="t('characters.epiphanyPlaceholder')" rows="2" />
        <AiExpandButton :current-value="form.epiphany" :field-name="t('characters.fieldEpiphany')" @expanded="form.epiphany = $event" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" @click="cancelForm">{{ t('ideas.cancel') }}</button>
        <button class="btn btn-primary" @click="saveCharacter">{{ editingId ? t('ideas.save') : t('ideas.add') }}</button>
      </div>
    </div>

    <button v-if="!showForm" class="btn btn-primary" @click="openNew">+ {{ t('characters.newCharacter') }}</button>

    <div v-if="!characters.length && !showForm" class="empty-state card">
      <p>{{ t('characters.empty') }}</p>
    </div>

    <div v-else class="char-list">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { getCharacters, addCharacter, updateCharacter, deleteCharacter } from '@/db';
import { useI18n } from '@/composables/useI18n';
import AiExpandButton from '@/components/AiExpandButton.vue';

const { t } = useI18n();

const characters = ref([]);
const showForm = ref(false);
const editingId = ref(null);
const form = ref({
  name: '',
  oneSentence: '',
  goal: '',
  motivation: '',
  conflict: '',
  epiphany: '',
});

async function load() {
  characters.value = await getCharacters();
}

function openNew() {
  editingId.value = null;
  form.value = { name: '', oneSentence: '', goal: '', motivation: '', conflict: '', epiphany: '' };
  showForm.value = true;
}

function editCharacter(c) {
  editingId.value = c.id;
  form.value = {
    name: c.name ?? '',
    oneSentence: c.oneSentence ?? '',
    goal: c.goal ?? '',
    motivation: c.motivation ?? '',
    conflict: c.conflict ?? '',
    epiphany: c.epiphany ?? '',
  };
  showForm.value = true;
}

function cancelForm() {
  showForm.value = false;
  editingId.value = null;
}

async function saveCharacter() {
  if (editingId.value) {
    await updateCharacter(editingId.value, form.value);
  } else {
    await addCharacter(form.value);
  }
  await load();
  cancelForm();
  window.dispatchEvent(new CustomEvent('inkflow-characters-changed'));
}

async function removeCharacter(id) {
  if (!confirm(t.value('characters.confirmDelete'))) return;
  await deleteCharacter(id);
  await load();
  window.dispatchEvent(new CustomEvent('inkflow-characters-changed'));
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
.char-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
.char-card {
  padding: var(--space-4);
}
.char-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
}
.char-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}
.char-actions {
  display: flex;
  gap: var(--space-1);
}
.char-one-sentence {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
  font-style: italic;
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
</style>
