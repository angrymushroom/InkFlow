<template>
  <Teleport to="body">
    <div class="cl-backdrop" @click.self="$emit('close')">
      <div class="cl-modal" role="dialog" aria-modal="true">
        <div class="cl-header">
          <h2 class="cl-title">{{ t('settings.changelogTitle') }}</h2>
          <button class="cl-close" @click="$emit('close')" :aria-label="t('settings.changelogClose')">&#x2715;</button>
        </div>
        <div class="cl-body">
          <div v-for="entry in CHANGELOG" :key="entry.version" class="cl-version">
            <div class="cl-version-header">
              <span class="cl-version-num">v{{ entry.version }}</span>
              <span class="cl-version-date">{{ entry.date }}</span>
            </div>
            <ul class="cl-list">
              <li v-for="(change, i) in entry.changes" :key="i" class="cl-item">
                <span class="cl-badge" :class="`cl-badge--${change.type}`">{{ change.type }}</span>
                <span class="cl-text">{{ change.text }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useI18n } from '@/composables/useI18n';
import { CHANGELOG } from '@/data/changelog';

const { t } = useI18n();
defineEmits(['close']);
</script>

<style scoped>
.cl-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  padding: var(--space-4);
}
.cl-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 540px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.cl-title { font-size: 1.125rem; font-weight: 600; margin: 0; }
.cl-close {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 1rem; padding: var(--space-1);
  border-radius: var(--radius-sm); line-height: 1;
}
.cl-close:hover { color: var(--text); }
.cl-body {
  overflow-y: auto;
  padding: var(--space-4) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.cl-version-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.cl-version-num { font-size: 1rem; font-weight: 700; color: var(--text); }
.cl-version-date { font-size: 0.8125rem; color: var(--text-muted); }
.cl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.cl-item { display: flex; align-items: baseline; gap: var(--space-2); }
.cl-badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 4px;
}
.cl-badge--feat { background: rgba(37, 99, 235, 0.12); color: var(--accent); }
.cl-badge--fix  { background: rgba(22, 163, 74, 0.12);  color: #16a34a; }
.cl-badge--perf { background: rgba(217, 119, 6, 0.12);  color: #d97706; }
.cl-badge--refactor { background: var(--border); color: var(--text-muted); }
.cl-text { font-size: 0.875rem; color: var(--text); line-height: 1.5; }
</style>
