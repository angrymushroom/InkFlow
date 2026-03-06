<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
      <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <h3 :id="titleId" class="modal-title">{{ title }}</h3>
        <p v-if="body" class="modal-body">{{ body }}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="$emit('update:modelValue', false)">
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="btn"
            :class="danger ? 'btn-danger' : 'btn-primary'"
            :disabled="loading"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  danger: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'confirm']);

const titleId = computed(() => `confirm-modal-title-${Math.random().toString(36).slice(2)}`);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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
  box-shadow: var(--shadow-md);
}
.modal-title {
  margin: 0 0 var(--space-2);
  font-size: 1.125rem;
  font-weight: 600;
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
}
.btn-danger {
  background: var(--danger);
  color: #fff;
}
.btn-danger:hover:not(:disabled) {
  background: var(--danger-hover);
}
</style>
