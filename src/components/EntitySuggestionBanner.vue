<template>
  <Teleport to="body">
    <Transition name="banner">
      <div v-if="pending.length" class="esb-wrap" role="region" aria-label="Entity suggestions">
        <!-- Collapsed bar -->
        <div class="esb-bar">
          <span class="esb-icon">🦦</span>
          <span class="esb-label">
            {{
              pending.length === 1
                ? t('entitySuggestion.foundOne')
                : t('entitySuggestion.found', { count: pending.length })
            }}
          </span>
          <div class="esb-bar-actions">
            <button class="esb-btn esb-btn--ghost" @click="toggleExpanded">
              {{ isExpanded ? t('entitySuggestion.collapse') : t('entitySuggestion.review') }}
            </button>
            <button class="esb-btn esb-btn--ghost esb-close" @click="dismiss" :title="t('entitySuggestion.skip')">×</button>
          </div>
        </div>

        <!-- Expanded list -->
        <Transition name="expand">
          <div v-if="isExpanded" class="esb-list">
            <label
              v-for="(entity, i) in pending"
              :key="entity.name"
              class="esb-item"
              :class="{ 'esb-item--checked': entity.selected }"
            >
              <input
                type="checkbox"
                class="esb-checkbox"
                :checked="entity.selected"
                @change="toggleItem(i)"
              />
              <span class="esb-item-name">{{ entity.name }}</span>
              <span class="esb-item-type">{{ t(`entitySuggestion.typeLabels.${entity.type}`) }}</span>
              <span class="esb-item-desc">{{ entity.description }}</span>
            </label>

            <div class="esb-footer">
              <button class="esb-btn esb-btn--ghost esb-small" @click="selectAll">
                {{ t('entitySuggestion.selectAll') }}
              </button>
              <div class="esb-footer-right">
                <button class="esb-btn esb-btn--ghost" @click="dismiss">
                  {{ t('entitySuggestion.skip') }}
                </button>
                <button
                  class="esb-btn esb-btn--primary"
                  :disabled="!hasSelected || saving"
                  @click="handleSave"
                >
                  {{ saving ? '…' : t('entitySuggestion.saveSelected') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useEntitySuggestions } from '@/composables/useEntitySuggestions';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const { pending, isExpanded, dismiss, toggleItem, toggleExpanded, selectAll, saveSelected } =
  useEntitySuggestions();

const saving = ref(false);
const hasSelected = computed(() => pending.value.some((e) => e.selected));

async function handleSave() {
  saving.value = true;
  try {
    await saveSelected(t.value);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.esb-wrap {
  position: fixed;
  bottom: var(--space-5, 20px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 8000;
  width: min(480px, calc(100vw - 32px));
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: var(--radius, 8px);
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,.12));
  overflow: hidden;
}

.esb-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
}

.esb-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.esb-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text, #222);
}

.esb-bar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1, 4px);
}

.esb-list {
  border-top: 1px solid var(--border, #e0e0e0);
  padding: var(--space-2, 8px) 0;
}

.esb-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  column-gap: var(--space-2, 8px);
  row-gap: 2px;
  align-items: center;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  cursor: pointer;
  transition: background 0.1s;
}
.esb-item:hover {
  background: var(--bg-hover, rgba(0,0,0,.04));
}
.esb-item--checked .esb-item-name {
  color: var(--text, #222);
}

.esb-checkbox {
  grid-row: 1 / 3;
  width: 15px;
  height: 15px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: var(--accent, #4a6cf7);
}

.esb-item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text, #222);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.esb-item-type {
  font-size: 0.75rem;
  color: var(--text-muted, #888);
  background: var(--bg-subtle, #f5f5f5);
  padding: 1px 6px;
  border-radius: 99px;
  white-space: nowrap;
  justify-self: end;
}

.esb-item-desc {
  grid-column: 2 / 4;
  font-size: 0.8125rem;
  color: var(--text-muted, #888);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.esb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-top: 1px solid var(--border, #e0e0e0);
  margin-top: var(--space-1, 4px);
}

.esb-footer-right {
  display: flex;
  gap: var(--space-2, 8px);
  align-items: center;
}

/* Buttons */
.esb-btn {
  border: none;
  border-radius: var(--radius-sm, 5px);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 5px 10px;
  transition: background 0.15s, opacity 0.15s;
}
.esb-btn--ghost {
  background: transparent;
  color: var(--text-muted, #888);
}
.esb-btn--ghost:hover {
  background: var(--bg-hover, rgba(0,0,0,.06));
  color: var(--text, #222);
}
.esb-btn--primary {
  background: var(--accent, #4a6cf7);
  color: #fff;
}
.esb-btn--primary:hover:not(:disabled) {
  opacity: 0.88;
}
.esb-btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.esb-close {
  font-size: 1.1rem;
  padding: 2px 7px;
  line-height: 1;
}
.esb-small {
  font-size: 0.75rem;
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
