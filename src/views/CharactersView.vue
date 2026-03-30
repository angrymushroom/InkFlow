<template>
  <div class="page characters-page">
    <h1 class="page-title">{{ t('characters.title') }}</h1>
    <p class="page-subtitle">{{ t('characters.subtitle') }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>

    <div class="chars-layout">
      <!-- Left: character list -->
      <aside class="chars-list-col">
        <button class="btn btn-primary chars-new-btn" @click="openNew">
          + {{ t('characters.newCharacter') }}
        </button>

        <div v-if="!characters.length && !showForm" class="empty-state card chars-empty">
          <OtterIllustration size="md" variant="idle" class="empty-otter" />
          <p>{{ t('characters.empty') }}</p>
        </div>

        <div v-else class="char-list">
          <div
            v-for="char in characters"
            :key="char.id"
            class="char-list-item"
            :class="{ active: editingId === char.id }"
            @click="editCharacter(char)"
          >
            <div class="char-list-item-main">
              <span class="char-list-item-name">{{ char.name || t('characters.unnamed') }}</span>
              <p v-if="char.oneSentence" class="char-list-item-summary">{{ char.oneSentence }}</p>
            </div>
            <button
              class="btn btn-ghost btn-sm btn-icon"
              @click.stop="confirmDelete(char)"
              :title="t('ideas.delete')"
            >
              🗑️
            </button>
          </div>
        </div>
      </aside>

      <!-- Right: edit form or placeholder -->
      <div class="chars-detail-col">
        <template v-if="!showForm">
          <p class="chars-placeholder">{{ t('entities.selectOrAdd') }}</p>
        </template>
        <template v-else>
          <div class="card form-card">
            <h2 class="form-title">
              {{ editingId ? t('characters.editCharacter') : t('characters.newCharacter') }}
            </h2>
            <div class="form-group">
              <label>{{ t('characters.name') }}</label>
              <input v-model="form.name" type="text" :placeholder="t('characters.namePlaceholder')" />
            </div>
            <div class="form-group">
              <label>{{ t('characters.oneSentence') }}</label>
              <input
                v-model="form.oneSentence"
                type="text"
                :placeholder="t('characters.oneSentencePlaceholder')"
              />
              <AiExpandButton
                :current-value="form.oneSentence"
                :field-name="t('characters.fieldOneSentence')"
                @expanded="form.oneSentence = $event"
              />
            </div>
            <div class="form-group">
              <label>{{ t('characters.goal') }}</label>
              <input v-model="form.goal" type="text" :placeholder="t('characters.goalPlaceholder')" />
              <AiExpandButton
                :current-value="form.goal"
                :field-name="t('characters.fieldGoal')"
                @expanded="form.goal = $event"
              />
            </div>
            <div class="form-group">
              <label>{{ t('characters.motivation') }}</label>
              <ResizableTextarea
                v-model="form.motivation"
                :placeholder="t('characters.motivationPlaceholder')"
                :rows="2"
              />
              <AiExpandButton
                :current-value="form.motivation"
                :field-name="t('characters.fieldMotivation')"
                @expanded="form.motivation = $event"
              />
            </div>
            <div class="form-group">
              <label>{{ t('characters.conflict') }}</label>
              <ResizableTextarea
                v-model="form.conflict"
                :placeholder="t('characters.conflictPlaceholder')"
                :rows="2"
              />
              <AiExpandButton
                :current-value="form.conflict"
                :field-name="t('characters.fieldConflict')"
                @expanded="form.conflict = $event"
              />
            </div>
            <div class="form-group">
              <label>{{ t('characters.epiphany') }}</label>
              <ResizableTextarea
                v-model="form.epiphany"
                :placeholder="t('characters.epiphanyPlaceholder')"
                :rows="2"
              />
              <AiExpandButton
                :current-value="form.epiphany"
                :field-name="t('characters.fieldEpiphany')"
                @expanded="form.epiphany = $event"
              />
            </div>
            <div class="form-actions">
              <button class="btn btn-ghost" @click="cancelForm">{{ t('ideas.cancel') }}</button>
              <button class="btn btn-primary" @click="saveCharacter">
                {{ editingId ? t('ideas.save') : t('ideas.add') }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <ConfirmModal
      v-model="deleteModal.open"
      :title="t('characters.confirmDelete')"
      :confirm-label="t('ideas.delete')"
      :cancel-label="t('ideas.cancel')"
      :danger="true"
      @confirm="doDelete"
    />

    <!-- Relationships section (visible when ≥2 characters exist) -->
    <section v-if="characters.length >= 2" class="rel-section">
      <h2 class="rel-section-title">{{ t('characters.relationships') }}</h2>
      <p class="page-subtitle">{{ t('characters.relationshipsSubtitle') }}</p>

      <div v-if="showRelForm" class="card form-card">
        <h3 class="form-title">{{ t('characters.newRelationship') }}</h3>
        <div class="form-group">
          <label>{{ t('characters.relFrom') }}</label>
          <select v-model="relForm.fromCharId" class="rel-select">
            <option v-for="c in characters" :key="c.id" :value="c.id">
              {{ c.name || t('characters.unnamed') }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('characters.relTo') }}</label>
          <select v-model="relForm.toCharId" class="rel-select">
            <option v-for="c in characters" :key="c.id" :value="c.id">
              {{ c.name || t('characters.unnamed') }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('characters.relLabel') }}</label>
          <input
            v-model="relForm.label"
            type="text"
            :placeholder="t('characters.relLabelPlaceholder')"
          />
        </div>
        <div class="form-group">
          <label>{{ t('characters.relDescription') }}</label>
          <ResizableTextarea
            v-model="relForm.description"
            :placeholder="t('characters.relDescriptionPlaceholder')"
            :rows="2"
          />
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="cancelRelForm">{{ t('ideas.cancel') }}</button>
          <button class="btn btn-primary" @click="saveRelationship">{{ t('ideas.add') }}</button>
        </div>
      </div>

      <button v-if="!showRelForm" class="btn btn-primary" @click="openRelForm">
        + {{ t('characters.newRelationship') }}
      </button>

      <div v-if="relationships.length" class="rel-list">
        <div v-for="rel in relationships" :key="rel.id" class="card rel-card">
          <div class="rel-header">
            <span class="rel-names">
              <strong>{{ charName(rel.fromCharId) }}</strong>
              <span class="rel-arrow">{{ rel.label || '→' }}</span>
              <strong>{{ charName(rel.toCharId) }}</strong>
            </span>
            <button
              class="btn btn-ghost btn-sm btn-icon"
              @click="confirmDeleteRel(rel)"
              :title="t('ideas.delete')"
            >
              🗑️
            </button>
          </div>
          <p v-if="rel.description" class="rel-description">{{ rel.description }}</p>
        </div>
      </div>
    </section>

    <ConfirmModal
      v-model="deleteRelModal.open"
      :title="t('characters.relConfirmDelete')"
      :confirm-label="t('ideas.delete')"
      :cancel-label="t('ideas.cancel')"
      :danger="true"
      @confirm="doDeleteRel"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  getCharacters,
  addCharacter,
  updateCharacter,
  deleteCharacter,
  getCharacterRelationships,
  addCharacterRelationship,
  deleteCharacterRelationship,
} from '@/db'
import { useI18n } from '@/composables/useI18n'
import { useStoryStore } from '@/stores/story.js'
import { useCharactersStore } from '@/stores/characters.js'
import AiExpandButton from '@/components/AiExpandButton.vue'
import ResizableTextarea from '@/components/ResizableTextarea.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import OtterIllustration from '@/components/OtterIllustration.vue'

const { t } = useI18n()
const storyStore = useStoryStore()
const charactersStore = useCharactersStore()

const characters = ref([])
const showForm = ref(false)
const editingId = ref(null)
const form = ref({
  name: '',
  oneSentence: '',
  goal: '',
  motivation: '',
  conflict: '',
  epiphany: '',
})
const loadError = ref('')
const saveError = ref('')
const deleteModal = ref({ open: false, character: null })

// Relationships
const relationships = ref([])
const showRelForm = ref(false)
const relForm = ref({ fromCharId: '', toCharId: '', label: '', description: '' })
const deleteRelModal = ref({ open: false, relationship: null })

function charName(id) {
  return characters.value.find((c) => c.id === id)?.name || id
}

function openRelForm() {
  relForm.value = {
    fromCharId: characters.value[0]?.id ?? '',
    toCharId: characters.value[1]?.id ?? '',
    label: '',
    description: '',
  }
  showRelForm.value = true
}

function cancelRelForm() {
  showRelForm.value = false
}

async function saveRelationship() {
  saveError.value = ''
  try {
    await addCharacterRelationship(relForm.value)
    relationships.value = await getCharacterRelationships()
    cancelRelForm()
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

function confirmDeleteRel(rel) {
  deleteRelModal.value = { open: true, relationship: rel }
}

async function doDeleteRel() {
  const rel = deleteRelModal.value.relationship
  if (!rel) return
  deleteRelModal.value.open = false
  try {
    await deleteCharacterRelationship(rel.id)
    relationships.value = await getCharacterRelationships()
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

async function loadRelationships() {
  try {
    relationships.value = await getCharacterRelationships()
  } catch (_) {}
}

async function load() {
  loadError.value = ''
  try {
    characters.value = await getCharacters()
    relationships.value = await getCharacterRelationships()
  } catch (e) {
    loadError.value = e?.message || t.value('common.loadErrorGeneric')
  }
}

function openNew() {
  editingId.value = null
  form.value = { name: '', oneSentence: '', goal: '', motivation: '', conflict: '', epiphany: '' }
  showForm.value = true
}

function editCharacter(c) {
  editingId.value = c.id
  form.value = {
    name: c.name ?? '',
    oneSentence: c.oneSentence ?? '',
    goal: c.goal ?? '',
    motivation: c.motivation ?? '',
    conflict: c.conflict ?? '',
    epiphany: c.epiphany ?? '',
  }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
}

async function saveCharacter() {
  saveError.value = ''
  try {
    if (editingId.value) {
      await updateCharacter(editingId.value, form.value)
    } else {
      await addCharacter(form.value)
    }
    await load()
    cancelForm()
    charactersStore.load()
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

function confirmDelete(char) {
  deleteModal.value = { open: true, character: char }
}

async function doDelete() {
  const char = deleteModal.value.character
  if (!char) return
  deleteModal.value.open = false
  saveError.value = ''
  try {
    await deleteCharacter(char.id)
    await load() // also reloads relationships since cascade cleaned them up
    charactersStore.load()
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

onMounted(() => {
  load()
  watch(() => storyStore.activeStoryId, load)
  watch(() => charactersStore.characters, async () => { await load() }, { deep: true })
})
</script>

<style scoped>
.characters-page {
  display: flex;
  flex-direction: column;
}

/* Split-panel layout */
.chars-layout {
  display: flex;
  gap: var(--space-4);
  min-height: 400px;
}

.chars-list-col {
  min-width: 240px;
  width: 32%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chars-new-btn {
  flex-shrink: 0;
}

.chars-empty {
  padding: var(--space-5);
  text-align: center;
}
.chars-empty p {
  margin: 0 0 var(--space-2);
  color: var(--text-muted);
}

.chars-detail-col {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.chars-placeholder {
  color: var(--text-muted);
  font-size: 0.9375rem;
  margin: 0;
  padding: var(--space-4);
}

/* Compact character list items */
.char-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

.char-list-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.12s, border-color 0.12s;
}
.char-list-item:hover {
  background: var(--bg-elevated);
}
.char-list-item.active {
  background: var(--bg-elevated);
  border-color: var(--accent);
}
.char-list-item-main {
  flex: 1;
  min-width: 0;
}
.char-list-item-name {
  font-weight: 600;
  font-size: 0.9375rem;
  display: block;
  margin-bottom: 2px;
}
.char-list-item-summary {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Form inside detail col */
.form-card {
  margin-bottom: 0;
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

.save-error {
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  color: var(--danger);
}

/* Relationships section */
.rel-section {
  margin-top: var(--space-7);
}
.rel-section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-1);
}
.rel-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.rel-card {
  padding: var(--space-3) var(--space-4);
}
.rel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rel-names {
  font-size: 0.9375rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.rel-arrow {
  color: var(--text-muted);
  font-style: italic;
}
.rel-description {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: var(--space-2) 0 0;
}
.rel-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
}

/* Mobile: stack to single column */
@media (max-width: 767px) {
  .chars-layout {
    flex-direction: column;
  }
  .chars-list-col {
    width: 100%;
    max-width: none;
    max-height: 300px;
  }
}
</style>
