<template>
  <div class="page">
    <h1 class="page-title">{{ t('story.title') }}</h1>
    <p class="page-subtitle">{{ t(`templates.${templateId}.subtitle`) }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>

    <!-- Progress dashboard -->
    <div class="progress-dashboard">
      <div class="progress-item">
        <div class="progress-label">
          <span>{{ t('story.progress.spine') }}</span>
          <span class="progress-count">{{ spineProgress.filled }}/{{ spineProgress.total }}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: spineProgress.pct + '%' }" />
        </div>
      </div>
      <div class="progress-item">
        <div class="progress-label">
          <span>{{ t('story.progress.characters') }}</span>
          <span class="progress-count">{{ characterCount }}</span>
        </div>
        <div class="progress-bar-track">
          <div
            class="progress-bar-fill"
            :class="characterCount >= 3 ? 'progress-bar-fill--solid' : characterCount >= 1 ? 'progress-bar-fill--started' : ''"
            :style="{ width: characterCount >= 3 ? '100%' : characterCount >= 1 ? '40%' : '0%' }"
          />
        </div>
      </div>
      <div class="progress-item">
        <div class="progress-label">
          <span>{{ t('story.progress.outline') }}</span>
          <span class="progress-count">{{ outlineStore.chapters.length }} {{ t('story.progress.chapters') }}, {{ outlineStore.scenes.length }} {{ t('story.progress.scenes') }}</span>
        </div>
        <div class="progress-bar-track">
          <div
            class="progress-bar-fill"
            :style="{ width: outlineStore.chapters.length ? Math.min(outlineStore.chapters.length * 10, 100) + '%' : '0%' }"
          />
        </div>
      </div>
      <div class="progress-item" v-if="writingProgress.total > 0">
        <div class="progress-label">
          <span>{{ t('story.progress.writing') }}</span>
          <span class="progress-count">{{ writingProgress.written }}/{{ writingProgress.total }}</span>
        </div>
        <div class="progress-bar-track">
          <div
            class="progress-bar-fill"
            :style="{ width: writingProgress.total ? Math.round((writingProgress.written / writingProgress.total) * 100) + '%' : '0%' }"
          />
        </div>
      </div>
    </div>

    <!-- Template selector -->
    <div class="template-selector card">
      <span class="template-selector-label">{{ t('story.templateLabel') }}</span>
      <div class="template-selector-options">
        <button
          v-for="(tpl, key) in TEMPLATES"
          :key="key"
          type="button"
          class="template-selector-btn"
          :class="{ active: templateId === key }"
          @click="switchTemplate(key)"
        >
          {{ t(`templates.${key}.name`) }}
        </button>
      </div>
    </div>

    <div class="card form-card">
      <div v-for="field in currentTemplate.spineFields" :key="field.key" class="form-group">
        <label>{{ t(`templates.${templateId}.fields.${field.key}`) }}</label>
        <input
          v-if="field.type === 'input'"
          :value="getFieldValue(field.prop)"
          type="text"
          :placeholder="t(`templates.${templateId}.placeholders.${field.key}`)"
          @input="setFieldValue(field.prop, $event.target.value)"
        />
        <ResizableTextarea
          v-else
          :model-value="getFieldValue(field.prop)"
          :placeholder="t(`templates.${templateId}.placeholders.${field.key}`)"
          :rows="
            field.key === 'you' || field.key === 'setup' || field.key === 'oneSentence' ? 3 : 2
          "
          @update:model-value="setFieldValue(field.prop, $event)"
        />
        <AiExpandButton
          :current-value="getFieldValue(field.prop)"
          :field-name="t(`templates.${templateId}.fields.${field.key}`)"
          @expanded="setFieldValue(field.prop, $event)"
        />
      </div>

      <div class="story-actions">
        <button class="btn btn-primary" @click="save">{{ t('story.saveStory') }}</button>
        <span v-if="savedHint" class="saved-hint">{{ t('story.saved') }}</span>
      </div>
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
    </div>

    <section class="story-danger-zone">
      <h3 class="story-danger-zone-title">{{ t('story.deleteStorySection') }}</h3>
      <p v-if="storyCount <= 1" class="story-danger-zone-hint">
        {{ t('story.cannotDeleteLastStory') }}
      </p>
      <button
        type="button"
        class="btn btn-ghost btn-danger"
        :disabled="storyCount <= 1"
        @click="showDeleteModal = true"
      >
        {{ t('story.deleteStory') }}
      </button>
    </section>

    <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
      <div class="modal-card">
        <h3 class="modal-title">{{ t('story.deleteStoryConfirmTitle') }}</h3>
        <p class="modal-body">{{ t('story.deleteStoryConfirmBody') }}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showDeleteModal = false">
            {{ t('ideas.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            :disabled="deleteInProgress"
            @click="confirmDeleteStory"
          >
            {{ t('story.deleteStoryConfirmButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStory, saveStory, getStories, deleteStory, getCharacters } from '@/db'
import { useI18n } from '@/composables/useI18n'
import { useStoryStore } from '@/stores/story.js'
import { useOutlineStore } from '@/stores/outline.js'
import { useToast } from '@/composables/useToast'
import { storyDirty } from '@/stores/unsaved'
import AiExpandButton from '@/components/AiExpandButton.vue'
import ResizableTextarea from '@/components/ResizableTextarea.vue'
import { TEMPLATES, getSpineFieldValue, setSpineFieldPatch } from '@/data/templates'

const { t } = useI18n()
const { success: toastSuccess } = useToast()
const router = useRouter()
const storyStore = useStoryStore()
const outlineStore = useOutlineStore()

const storyCount = ref(1)
const characterCount = ref(0)
const showDeleteModal = ref(false)
const deleteInProgress = ref(false)

const story = ref({
  id: '',
  template: 'snowflake',
  templateFields: {},
  oneSentence: '',
  setup: '',
  disaster1: '',
  disaster2: '',
  disaster3: '',
  ending: '',
})
const lastSavedJson = ref('')
const savedHint = ref(false)
const saveError = ref('')
const loadError = ref('')
const saveTimeout = ref(null)
const beforeUnloadHandler = ref(null)

const templateId = computed(() => story.value.template ?? 'snowflake')
const currentTemplate = computed(() => TEMPLATES[templateId.value] ?? TEMPLATES.snowflake)

const spineProgress = computed(() => {
  const fields = currentTemplate.value.spineFields
  const filled = fields.filter((f) => getSpineFieldValue(story.value, f.prop)?.trim()).length
  return { filled, total: fields.length, pct: fields.length ? Math.round((filled / fields.length) * 100) : 0 }
})
const writingProgress = computed(() => {
  const scenes = outlineStore.scenes
  const written = scenes.filter((s) => s.content?.trim()).length
  return { written, total: scenes.length }
})

function getFieldValue(prop) {
  return getSpineFieldValue(story.value, prop)
}

function setFieldValue(prop, value) {
  const patch = setSpineFieldPatch(story.value, prop, value)
  Object.assign(story.value, patch)
}

async function switchTemplate(newTemplateId) {
  if (newTemplateId === templateId.value) return
  story.value.template = newTemplateId
  if (!story.value.templateFields) story.value.templateFields = {}
  await save()
  toastSuccess(t.value(`templates.${newTemplateId}.name`))
}

function storySnapshot() {
  return JSON.stringify({
    id: story.value.id ?? '',
    template: story.value.template ?? 'snowflake',
    templateFields: story.value.templateFields ?? {},
    oneSentence: story.value.oneSentence ?? '',
    setup: story.value.setup ?? '',
    disaster1: story.value.disaster1 ?? '',
    disaster2: story.value.disaster2 ?? '',
    disaster3: story.value.disaster3 ?? '',
    ending: story.value.ending ?? '',
  })
}

function isDirty() {
  return lastSavedJson.value !== storySnapshot()
}

function setBeforeUnload() {
  if (beforeUnloadHandler.value) return
  beforeUnloadHandler.value = (e) => {
    if (isDirty()) e.preventDefault()
  }
  window.addEventListener('beforeunload', beforeUnloadHandler.value)
}
function clearBeforeUnload() {
  if (beforeUnloadHandler.value) {
    window.removeEventListener('beforeunload', beforeUnloadHandler.value)
    beforeUnloadHandler.value = null
  }
}

async function load() {
  loadError.value = ''
  try {
    const [s, list] = await Promise.all([getStory(), getStories()])
    storyCount.value = list?.length ?? 0
    if (s) {
      story.value = {
        id: s.id ?? 'story',
        template: s.template ?? 'snowflake',
        templateFields: s.templateFields ?? {},
        oneSentence: s.oneSentence ?? '',
        setup: s.setup ?? '',
        disaster1: s.disaster1 ?? '',
        disaster2: s.disaster2 ?? '',
        disaster3: s.disaster3 ?? '',
        ending: s.ending ?? '',
      }
      const chars = await getCharacters(s.id ?? 'story')
      characterCount.value = chars?.length ?? 0
    }
    lastSavedJson.value = storySnapshot()
    storyDirty.value = isDirty()
  } catch (e) {
    loadError.value = e?.message || t('story.saveError')
  }
}

async function confirmDeleteStory() {
  if (deleteInProgress.value || !story.value?.id) return
  deleteInProgress.value = true
  try {
    const { switchedToId } = await deleteStory(story.value.id)
    showDeleteModal.value = false
    await storyStore.loadStories()
    await storyStore.loadActiveStory()
    if (switchedToId) {
      router.push('/story')
    }
  } catch (e) {
    saveError.value = e?.message || t('story.saveError')
  } finally {
    deleteInProgress.value = false
  }
}

async function save() {
  saveError.value = ''
  try {
    await saveStory(story.value)
    lastSavedJson.value = storySnapshot()
    storyDirty.value = false
    if (!isDirty()) clearBeforeUnload()
    savedHint.value = true
    setTimeout(() => {
      savedHint.value = false
    }, 2000)
    storyStore.loadActiveStory()
  } catch (e) {
    saveError.value = e?.message || t('story.saveError')
    setBeforeUnload()
  }
}

async function autoSave() {
  if (!isDirty()) return
  try {
    await saveStory(story.value)
    lastSavedJson.value = storySnapshot()
    storyDirty.value = false
    if (!isDirty()) clearBeforeUnload()
    savedHint.value = true
    setTimeout(() => {
      savedHint.value = false
    }, 2000)
  } catch (e) {
    saveError.value = e?.message || t('story.saveError')
    setBeforeUnload()
  }
}

onMounted(async () => {
  await load()
  watch(
    story,
    () => {
      storyDirty.value = isDirty()
      if (saveTimeout.value) clearTimeout(saveTimeout.value)
      saveTimeout.value = setTimeout(() => {
        autoSave()
        saveTimeout.value = null
      }, 1800)
      if (isDirty()) setBeforeUnload()
    },
    { deep: true }
  )
  // Reload form when user switches to a different story
  watch(
    () => storyStore.activeStoryId,
    async () => {
      if (!storyDirty.value) await load()
    }
  )
})

onUnmounted(() => {
  if (saveTimeout.value) clearTimeout(saveTimeout.value)
  clearBeforeUnload()
  storyDirty.value = false
})
</script>

<style scoped>
.form-card {
  max-width: 100%;
}
.form-group {
  margin-bottom: var(--space-4);
}
.story-actions {
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

/* Progress dashboard */
.progress-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
}
.progress-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}
.progress-count {
  font-variant-numeric: tabular-nums;
}
.progress-bar-track {
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.4s ease;
  min-width: 0;
}
.progress-bar-fill--started {
  background: color-mix(in srgb, var(--accent) 60%, transparent);
}
.progress-bar-fill--solid {
  background: var(--accent);
}
@media (max-width: 500px) {
  .progress-dashboard {
    grid-template-columns: 1fr;
  }
}

/* Template selector */
.template-selector {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.template-selector-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}
.template-selector-options {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.template-selector-btn {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}
.template-selector-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.template-selector-btn.active {
  border-color: var(--accent);
  background: var(--accent-subtle);
  color: var(--accent);
  font-weight: 600;
}

/* Danger zone */
.story-danger-zone {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}
.story-danger-zone-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.story-danger-zone-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-2);
}
.btn-danger {
  color: var(--danger);
}
.btn-danger:hover:not(:disabled) {
  background: var(--danger);
  color: var(--bg);
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
  box-shadow:
    var(--shadow-md),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}
.modal-title {
  margin: 0 0 var(--space-2);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
}
.modal-body {
  margin: 0 0 var(--space-5);
  font-size: 0.9375rem;
  color: var(--text-muted);
  line-height: 1.6;
}
.modal-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
