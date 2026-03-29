<template>
  <div class="card form-card idea-form-card">
    <h2 class="form-title">{{ idea ? t('ideas.editIdea') : t('ideas.newIdea') }}</h2>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>
    <div class="form-group">
      <label>{{ t('ideas.titleLabel') }}</label>
      <input v-model="form.title" type="text" :placeholder="t('ideas.shortTitle')" />
    </div>
    <div class="form-group">
      <label>{{ t('ideas.bodyLabel') }}</label>
      <ResizableTextarea v-model="form.body" :placeholder="t('ideas.bodyPlaceholder')" :rows="4" />
      <AiExpandButton
        :current-value="form.body"
        :field-name="t('ideas.ideaBody')"
        @expanded="form.body = $event"
      />
    </div>
    <div v-if="!typeFilter" class="form-group">
      <label>{{ t('ideas.typeLabel') }}</label>
      <select v-model="form.type" class="idea-type-select" @change="onIdeaTypeChange">
        <optgroup :label="t('ideas.typeGroupSuggested')">
          <option v-for="item in builtInTypes" :key="item.slug" :value="item.slug">
            {{ t('ideas.' + item.slug) }}
          </option>
        </optgroup>
        <optgroup v-if="customTypes.length" :label="t('ideas.typeGroupCustom')">
          <option v-for="ct in customTypes" :key="ct.id" :value="ct.name">{{ ct.name }}</option>
        </optgroup>
        <option value="__add_custom__">{{ t('ideas.addCustomType') }}</option>
      </select>
      <button
        v-if="customTypes.length"
        type="button"
        class="btn btn-ghost btn-sm manage-types-btn"
        @click="openManageTypes"
      >
        {{ t('ideas.manageCustomTypes') }}
      </button>
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">
        {{ t('ideas.cancel') }}
      </button>
      <button v-if="idea" type="button" class="btn btn-ghost" @click="doDelete">
        {{ t('ideas.delete') }}
      </button>
      <button type="button" class="btn btn-primary" @click="doSave">
        {{ idea ? t('ideas.save') : t('ideas.add') }}
      </button>
    </div>

    <div v-if="showCustomTypeModal" class="modal-backdrop" @click.self="closeCustomTypeModal">
      <div class="modal-card">
        <h3 class="modal-title">{{ t('ideas.customTypeModalTitle') }}</h3>
        <div class="form-group">
          <input
            v-model="customTypeName"
            type="text"
            :placeholder="t('ideas.customTypeModalPlaceholder')"
            class="modal-input"
            @keydown.enter="saveCustomType"
          />
        </div>
        <p v-if="customTypeError" class="save-error">{{ customTypeError }}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeCustomTypeModal">
            {{ t('ideas.cancel') }}
          </button>
          <button type="button" class="btn btn-primary" @click="saveCustomType">
            {{ t('ideas.customTypeModalSave') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showManageTypesModal"
      class="modal-backdrop"
      @click.self="showManageTypesModal = false"
    >
      <div class="modal-card">
        <h3 class="modal-title">{{ t('ideas.manageCustomTypesTitle') }}</h3>
        <div v-if="!customTypes.length" class="manage-empty">{{ t('ideas.noCustomTypes') }}</div>
        <ul v-else class="manage-type-list">
          <li v-for="ct in customTypes" :key="ct.id" class="manage-type-item">
            <input
              v-model="renameValues[ct.id]"
              class="manage-type-input"
              type="text"
              @keydown.enter="doRenameType(ct.id)"
            />
            <button
              class="btn btn-ghost btn-sm"
              @click="doRenameType(ct.id)"
              :title="t('ideas.customTypeRename')"
            >
              ✓
            </button>
            <button
              class="btn btn-ghost btn-sm btn-danger-icon"
              @click="doDeleteType(ct.id)"
              :title="t('ideas.customTypeDelete')"
            >
              🗑️
            </button>
          </li>
        </ul>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" @click="showManageTypesModal = false">
            {{ t('ideas.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIdeaTypes } from '@/composables/useIdeaTypes'
import AiExpandButton from '@/components/AiExpandButton.vue'
import ResizableTextarea from '@/components/ResizableTextarea.vue'

const props = defineProps({
  /** Existing idea to edit, or null for new */
  idea: { type: Object, default: null },
  /** When set, hide type dropdown and use this type for new ideas */
  typeFilter: { type: String, default: '' },
})

const emit = defineEmits(['save', 'cancel', 'delete'])

const { t } = useI18n()
const { builtInTypes, customTypes, addCustomType, deleteCustomType, renameCustomType } =
  useIdeaTypes()

const form = ref({ title: '', body: '', type: 'plot' })
const saveError = ref('')
const showCustomTypeModal = ref(false)
const customTypeName = ref('')
const customTypeError = ref('')
const showManageTypesModal = ref(false)
const renameValues = ref({})

function openManageTypes() {
  renameValues.value = Object.fromEntries(customTypes.value.map((ct) => [ct.id, ct.name]))
  showManageTypesModal.value = true
}

async function doDeleteType(id) {
  await deleteCustomType(id)
  delete renameValues.value[id]
  // If current idea uses this type, reset to plot
  if (form.value.type === customTypes.value.find((ct) => ct.id === id)?.name) {
    form.value.type = 'plot'
  }
}

async function doRenameType(id) {
  const newName = (renameValues.value[id] || '').trim()
  if (!newName) return
  const oldName = customTypes.value.find((ct) => ct.id === id)?.name
  await renameCustomType(id, newName)
  if (form.value.type === oldName) form.value.type = newName
}

watch(
  () => [props.idea, props.typeFilter],
  () => {
    if (props.idea) {
      form.value = {
        title: props.idea.title || '',
        body: props.idea.body || '',
        type: props.idea.type || 'plot',
      }
    } else {
      const defaultType = props.typeFilter || 'plot'
      form.value = { title: '', body: '', type: defaultType }
    }
    saveError.value = ''
  },
  { immediate: true }
)

function onIdeaTypeChange() {
  if (form.value.type !== '__add_custom__') return
  customTypeName.value = ''
  customTypeError.value = ''
  showCustomTypeModal.value = true
}

function closeCustomTypeModal() {
  showCustomTypeModal.value = false
  form.value.type = 'plot'
  customTypeName.value = ''
  customTypeError.value = ''
}

async function saveCustomType() {
  customTypeError.value = ''
  const name = customTypeName.value?.trim()
  if (!name) {
    customTypeError.value = t.value('ideas.customTypeModalNameRequired')
    return
  }
  try {
    const newName = await addCustomType(name)
    if (newName) {
      form.value.type = newName
      showCustomTypeModal.value = false
      customTypeName.value = ''
    } else {
      customTypeError.value = t.value('common.saveErrorGeneric')
    }
  } catch (e) {
    customTypeError.value = e?.message || t.value('common.saveErrorGeneric')
  }
}

function doSave() {
  saveError.value = ''
  const type = form.value.type && form.value.type !== '__add_custom__' ? form.value.type : 'plot'
  const payload = { title: form.value.title, body: form.value.body, type }
  emit('save', payload)
}

function doDelete() {
  if (!confirm(t.value('ideas.confirmDelete'))) return
  emit('delete')
}
</script>

<style scoped>
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
.idea-type-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
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
.manage-types-btn {
  margin-top: var(--space-1);
  font-size: 0.8125rem;
}
.manage-type-list {
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.manage-type-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.manage-type-input {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
}
.btn-danger-icon {
  color: var(--danger);
}
.manage-empty {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-bottom: var(--space-3);
}
</style>
