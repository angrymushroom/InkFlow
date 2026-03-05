<template>
  <div class="page entities-page">
    <h1 class="page-title">{{ t('entities.title') }}</h1>
    <p class="page-subtitle">{{ t('entities.subtitle') }}</p>
    <div class="entities-toolbar">
      <label class="entities-toolbar-label">{{ t('entities.filterByType') }}</label>
      <select v-model="selectedType" class="entities-type-select" aria-label="Entity type">
        <optgroup :label="t('ideas.typeGroupSuggested')">
          <option
            v-for="item in builtInTypes"
            :key="item.slug"
            :value="item.slug"
          >
            {{ t('ideas.' + item.slug) }}
          </option>
        </optgroup>
        <optgroup v-if="customTypes.length" :label="t('ideas.typeGroupCustom')">
          <option
            v-for="ct in customTypes"
            :key="ct.id"
            :value="ct.name"
          >
            {{ ct.name }}
          </option>
        </optgroup>
      </select>
    </div>
    <section class="entities-view-area">
      <p v-if="childError" class="entities-error">
        {{ t('common.loadErrorGeneric') }} <code>{{ childError }}</code>
      </p>
      <IdeasView v-else :key="selectedType" :type-filter="selectedType" />
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onErrorCaptured } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useIdeaTypes } from '@/composables/useIdeaTypes';
import IdeasView from '@/views/IdeasView.vue';

const { t } = useI18n();
const { builtInTypes, customTypes } = useIdeaTypes();
const selectedType = ref('plot');
const childError = ref('');

watch(selectedType, () => { childError.value = ''; });

onErrorCaptured((err, instance, info) => {
  childError.value = err?.message || String(err);
  console.error('[EntitiesPage] child error:', err, info, instance);
  return false;
});
</script>

<style scoped>
.entities-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.entities-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.entities-toolbar-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
}
.entities-type-select {
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  min-width: 12rem;
}
.entities-view-area {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.entities-view-area > .page {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.entities-error {
  color: var(--danger);
  font-size: 0.875rem;
  margin: 0;
  padding: var(--space-3);
}
.entities-error code {
  font-size: 0.75rem;
  word-break: break-all;
}
</style>
