<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card fork-modal-card">
      <h2 class="modal-title">{{ t('fork.modalTitle') }}</h2>
      <p class="modal-subtitle">{{ t('fork.modalSubtitle') }}</p>

      <div class="fork-source-card">
        <span class="fork-source-label">⑂</span>
        <div class="fork-source-info">
          <strong>{{ scene?.title || t('outline.untitledScene') }}</strong>
          <span v-if="scene?.oneSentenceSummary" class="fork-source-summary">
            {{ scene.oneSentenceSummary }}
          </span>
        </div>
      </div>

      <div class="form-group" style="margin-top: var(--space-4)">
        <label class="form-label">{{ t('fork.descriptionLabel') }}</label>
        <textarea
          v-model="description"
          class="form-control fork-textarea"
          :placeholder="t('fork.descriptionPlaceholder')"
          rows="3"
          autofocus
          @keydown.enter.ctrl="onCreate"
          @keydown.enter.meta="onCreate"
        />
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" @click="$emit('close')">
          {{ t('fork.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!description.trim() || creating"
          @click="onCreate"
        >
          {{ creating ? '…' : t('fork.create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { addScene } from '@/db'
import { useI18n } from '@/composables/useI18n'

const props = defineProps({
  show: { type: Boolean, default: false },
  scene: { type: Object, default: null },
})

const emit = defineEmits(['close', 'created'])

const { t } = useI18n()
const description = ref('')
const creating = ref(false)

watch(
  () => props.show,
  (val) => { if (!val) description.value = '' }
)

async function onCreate() {
  if (!props.scene || !description.value.trim() || creating.value) return
  creating.value = true
  try {
    const newScene = await addScene({
      chapterId: props.scene.chapterId,
      title: props.scene.title ? `${props.scene.title} (fork)` : 'Fork',
      oneSentenceSummary: props.scene.oneSentenceSummary || '',
      forkFromSceneId: props.scene.id,
      forkDescription: description.value.trim(),
    })
    emit('created', newScene.id)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.fork-modal-card {
  max-width: 480px;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
}

.modal-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-4);
  line-height: 1.5;
}

.fork-source-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) / 2);
}

.fork-source-label {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.fork-source-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.fork-source-summary {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: var(--space-2);
  color: var(--text);
}

.fork-textarea {
  width: 100%;
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-5);
}
</style>
