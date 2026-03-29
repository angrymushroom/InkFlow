<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <transition-group name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.type}`">
          <span class="toast-icon">{{ iconFor(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<script setup>
import { toasts } from '@/composables/useToast'

function iconFor(type) {
  if (type === 'success') return '✓'
  if (type === 'error') return '✕'
  return 'ℹ'
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  right: var(--space-4);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}
@media (min-width: 768px) {
  .toast-container {
    bottom: var(--space-5);
  }
}
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
  font-weight: 500;
  box-shadow: var(--shadow-md);
  pointer-events: auto;
  max-width: 340px;
}
.toast--success {
  background: var(--success);
  color: #fff;
}
.toast--error {
  background: var(--danger);
  color: #fff;
}
.toast--info {
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border);
}
.toast-icon {
  font-style: normal;
  font-size: 1rem;
  flex-shrink: 0;
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
