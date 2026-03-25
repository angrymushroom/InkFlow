<template>
  <Teleport to="body">
    <Transition name="banner">
      <div v-if="warnings.length" class="cwb-wrap" role="region" aria-label="Consistency warnings">
        <!-- Collapsed bar -->
        <div class="cwb-bar">
          <span class="cwb-icon">⚠️</span>
          <span class="cwb-label">
            {{
              warnings.length === 1
                ? t('consistencyWarning.foundOne')
                : t('consistencyWarning.found', { count: warnings.length })
            }}
            <span v-if="sceneTitle" class="cwb-scene">— {{ sceneTitle }}</span>
          </span>
          <div class="cwb-bar-actions">
            <button class="cwb-btn cwb-btn--ghost" @click="toggleExpanded">
              {{ isExpanded ? t('consistencyWarning.collapse') : t('consistencyWarning.review') }}
            </button>
            <button class="cwb-btn cwb-btn--ghost cwb-close" @click="dismiss" :title="t('consistencyWarning.dismiss')">×</button>
          </div>
        </div>

        <!-- Expanded list -->
        <Transition name="expand">
          <div v-if="isExpanded" class="cwb-list">
            <div v-for="(issue, i) in warnings" :key="i" class="cwb-item">
              <span class="cwb-bullet">!</span>
              <span class="cwb-text">{{ issue }}</span>
            </div>
            <div class="cwb-footer">
              <span class="cwb-note">{{ t('consistencyWarning.note') }}</span>
              <button class="cwb-btn cwb-btn--ghost" @click="dismiss">
                {{ t('consistencyWarning.dismiss') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useConsistencyWarnings } from '@/composables/useConsistencyWarnings';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const { warnings, sceneTitle, dismiss } = useConsistencyWarnings();
const isExpanded = ref(false);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}
</script>

<style scoped>
.cwb-wrap {
  position: fixed;
  bottom: var(--space-5, 20px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 7900;
  width: min(520px, calc(100vw - 32px));
  background: var(--bg-elevated, #fff);
  border: 1px solid #e6a817;
  border-radius: var(--radius, 8px);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,.12));
  overflow: hidden;
}

.cwb-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: rgba(230, 168, 23, 0.06);
}

.cwb-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.cwb-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text, #222);
}

.cwb-scene {
  font-weight: 400;
  color: var(--text-muted, #888);
}

.cwb-bar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
}

.cwb-list {
  border-top: 1px solid rgba(230, 168, 23, 0.3);
}

.cwb-item {
  display: flex;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  align-items: flex-start;
}

.cwb-item + .cwb-item {
  border-top: 1px solid var(--border, #e0e0e0);
}

.cwb-bullet {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e6a817;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.cwb-text {
  font-size: 0.875rem;
  color: var(--text, #222);
  line-height: 1.5;
}

.cwb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-top: 1px solid var(--border, #e0e0e0);
}

.cwb-note {
  font-size: 0.8rem;
  color: var(--text-muted, #888);
}

/* Buttons */
.cwb-btn {
  border: none;
  border-radius: var(--radius-sm, 5px);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 5px 10px;
  transition: background 0.15s, opacity 0.15s;
}
.cwb-btn--ghost {
  background: transparent;
  color: var(--text-muted, #888);
}
.cwb-btn--ghost:hover {
  background: var(--bg-hover, rgba(0,0,0,.06));
  color: var(--text, #222);
}
.cwb-close {
  font-size: 1.1rem;
  padding: 2px 7px;
  line-height: 1;
}

/* Transitions */
.banner-enter-active,
.banner-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.banner-enter-from,
.banner-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.expand-enter-active,
.expand-leave-active {
  transition: opacity 0.15s ease;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
}
</style>
