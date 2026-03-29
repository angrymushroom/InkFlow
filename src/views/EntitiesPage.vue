<template>
  <div class="page entities-page">
    <h1 class="page-title">{{ t('ideas.title') }}</h1>
    <p class="page-subtitle">{{ t('ideas.subtitle') }}</p>

    <p v-if="loadError" class="entities-error">{{ loadError }}</p>

    <div v-else class="entities-layout">
      <aside class="entities-list-col">
        <!-- No ideas: empty state -->
        <template v-if="!ideas.length">
          <div class="entities-empty-state card">
            <p>{{ t('ideas.empty') }}</p>
            <button type="button" class="btn btn-primary" @click="openNewNoType">
              + {{ t('ideas.newIdea') }}
            </button>
          </div>
        </template>

        <!-- Has ideas: type buttons + list -->
        <template v-else>
          <div class="entity-type-buttons">
            <button
              v-for="item in typesWithCounts"
              :key="item.type"
              type="button"
              class="btn btn-ghost entity-type-btn"
              :class="{ active: selectedType === item.type }"
              @click="selectType(item.type)"
            >
              {{ item.label }} ({{ item.count }})
            </button>
          </div>
          <button type="button" class="btn btn-primary entities-new-btn" @click="openNew">
            + {{ t('ideas.newIdea') }}
          </button>
          <router-link
            v-if="ideas.length"
            :to="{ query: {} }"
            class="entities-add-type-link"
            @click.prevent="openNewWithTypeSelect"
            >{{ t('entities.addAnotherType') }}</router-link
          >

          <!-- List for selected type -->
          <div v-if="selectedType" class="entity-list-wrap">
            <template v-if="!displayedIdeas.length">
              <p class="entities-empty-type">{{ t('entities.noTypeYet', { type: typeLabel }) }}</p>
              <button type="button" class="btn btn-ghost btn-sm" @click="openNew">
                + {{ t('ideas.add') }}
              </button>
            </template>
            <div v-else class="entity-list">
              <div
                v-for="idea in displayedIdeas"
                :key="idea.id"
                class="entity-list-item"
                :class="{ active: selectedId === idea.id }"
                @click="selectIdea(idea)"
              >
                <div class="entity-list-item-main">
                  <span class="entity-list-item-title">{{
                    idea.title || t('ideas.untitled')
                  }}</span>
                  <p v-if="idea.body" class="entity-body-preview">
                    {{ (idea.body || '').trim().slice(0, 60)
                    }}{{ (idea.body || '').length > 60 ? '…' : '' }}
                  </p>
                </div>
                <div class="entity-list-item-actions">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-icon"
                    :title="t('ideas.edit')"
                    @click.stop="selectIdea(idea)"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm btn-icon"
                    :title="t('ideas.delete')"
                    @click.stop="confirmRemove(idea)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </aside>

      <div class="entities-detail-col">
        <template v-if="!selectedId && !showNew">
          <p class="entities-placeholder">{{ t('entities.selectOrAdd') }}</p>
        </template>
        <template v-else>
          <IdeaFormCard
            :idea="selectedIdea"
            :type-filter="showNewWithTypeSelect ? '' : selectedType"
            @save="onSave"
            @cancel="onCancel"
            @delete="onDelete"
          />
        </template>
      </div>
    </div>

    <ConfirmModal
      v-model="deleteModal.open"
      :title="t('ideas.confirmDelete')"
      :confirm-label="t('ideas.delete')"
      :cancel-label="t('ideas.cancel')"
      :danger="true"
      @confirm="doRemove"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getIdeas, addIdea, updateIdea, deleteIdea } from '@/db'
import { useI18n } from '@/composables/useI18n'
import { useIdeaTypes } from '@/composables/useIdeaTypes'
import IdeaFormCard from '@/components/IdeaFormCard.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const { t } = useI18n()
const { isBuiltInType } = useIdeaTypes()

const ideas = ref([])
const loadError = ref('')
const selectedType = ref('')
const selectedId = ref(null)
const showNew = ref(false)
const showNewWithTypeSelect = ref(false)
const deleteModal = ref({ open: false, idea: null })

const typesWithCounts = computed(() => {
  const map = new Map()
  for (const i of ideas.value) {
    const type = i.type || 'plot'
    const cur = map.get(type) || 0
    map.set(type, cur + 1)
  }
  return Array.from(map.entries())
    .map(([type, count]) => ({
      type,
      count,
      label: isBuiltInType(type) ? t.value('ideas.' + type) : type,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const displayedIdeas = computed(() => {
  if (!selectedType.value) return []
  return ideas.value.filter((i) => (i.type || 'plot') === selectedType.value)
})

const selectedIdea = computed(() => {
  if (!selectedId.value) return null
  return ideas.value.find((i) => i.id === selectedId.value) || null
})

const typeLabel = computed(() => {
  if (!selectedType.value) return ''
  return isBuiltInType(selectedType.value)
    ? t.value('ideas.' + selectedType.value)
    : selectedType.value
})

watch(
  ideas,
  (list) => {
    if (list.length > 0 && !selectedType.value) {
      const first = typesWithCounts.value[0]
      if (first) selectedType.value = first.type
    }
  },
  { immediate: true }
)

async function load() {
  loadError.value = ''
  try {
    ideas.value = await getIdeas()
  } catch (e) {
    loadError.value = e?.message || t.value('common.loadErrorGeneric')
  }
}

function selectType(type) {
  selectedType.value = type
  selectedId.value = null
  showNew.value = false
  showNewWithTypeSelect.value = false
}

function selectIdea(idea) {
  selectedId.value = idea.id
  showNew.value = false
  showNewWithTypeSelect.value = false
}

function openNew() {
  selectedId.value = null
  showNew.value = true
  showNewWithTypeSelect.value = false
}

function openNewNoType() {
  selectedId.value = null
  showNew.value = true
  showNewWithTypeSelect.value = true
}

function openNewWithTypeSelect(e) {
  e.preventDefault()
  selectedId.value = null
  showNew.value = true
  showNewWithTypeSelect.value = true
}

function onCancel() {
  selectedId.value = null
  showNew.value = false
  showNewWithTypeSelect.value = false
}

async function onSave(payload) {
  loadError.value = ''
  try {
    if (selectedId.value) {
      await updateIdea(selectedId.value, payload)
    } else {
      await addIdea(payload)
    }
    await load()
    onCancel()
    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'))
  } catch (e) {
    loadError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

async function onDelete() {
  if (!selectedId.value) return
  loadError.value = ''
  try {
    await deleteIdea(selectedId.value)
    await load()
    selectedId.value = null
    showNew.value = false
    showNewWithTypeSelect.value = false
    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'))
  } catch (e) {
    loadError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

function confirmRemove(idea) {
  deleteModal.value = { open: true, idea }
}

async function doRemove() {
  const idea = deleteModal.value.idea
  if (!idea) return
  deleteModal.value.open = false
  loadError.value = ''
  try {
    await deleteIdea(idea.id)
    if (selectedId.value === idea.id) {
      selectedId.value = null
      showNew.value = false
    }
    await load()
    window.dispatchEvent(new CustomEvent('inkflow-ideas-changed'))
  } catch (e) {
    loadError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

onMounted(() => {
  load()
  window.addEventListener('inkflow-story-switched', load)
})
onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', load)
})
</script>

<style scoped>
.entities-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.entities-error {
  color: var(--danger);
  font-size: 0.875rem;
  margin: 0 0 var(--space-3);
}
.entities-layout {
  display: flex;
  gap: var(--space-4);
  flex: 1;
  min-height: 400px;
}
.entities-list-col {
  min-width: 280px;
  width: 35%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow: hidden;
}
.entity-type-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.entity-type-btn {
  font-size: 0.875rem;
}
.entity-type-btn.active {
  background: var(--accent);
  color: var(--accent-fg);
  font-weight: 600;
}
.entities-new-btn {
  flex-shrink: 0;
}
.entities-add-type-link {
  font-size: 0.875rem;
  color: var(--accent);
  text-decoration: none;
}
.entities-add-type-link:hover {
  text-decoration: underline;
}
.entity-list-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.entities-empty-type {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.entity-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.entity-list-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
}
.entity-list-item:hover {
  background: var(--bg-elevated);
}
.entity-list-item.active {
  background: var(--bg-elevated);
  border-color: var(--accent);
}
.entity-list-item-main {
  flex: 1;
  min-width: 0;
}
.entity-list-item-title {
  font-weight: 600;
  font-size: 0.9375rem;
  display: block;
  margin-bottom: 2px;
}
.entity-body-preview {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.entity-list-item-actions {
  flex-shrink: 0;
  display: flex;
  gap: var(--space-1);
}
.entities-detail-col {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
.entities-placeholder {
  color: var(--text-muted);
  font-size: 0.9375rem;
  margin: 0;
  padding: var(--space-4);
}
.entities-empty-state {
  padding: var(--space-5);
  text-align: center;
}
.entities-empty-state p {
  margin: 0 0 var(--space-4);
  color: var(--text-muted);
}

@media (max-width: 767px) {
  .entities-layout {
    flex-direction: column;
  }
  .entities-list-col {
    width: 100%;
    max-width: none;
    max-height: 280px;
  }
}
</style>
