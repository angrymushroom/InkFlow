<template>
  <Teleport to="body">
    <div v-if="open" class="fb-backdrop" @click.self="close">
      <div class="fb-card" role="dialog" :aria-label="t('feedback.title')">
        <template v-if="!submitted">
          <!-- Header -->
          <div class="fb-header">
            <h2 class="fb-title">{{ t('feedback.title') }}</h2>
            <button type="button" class="fb-close" :aria-label="t('ideas.cancel')" @click="close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Type selector -->
          <div class="fb-field">
            <label class="fb-label">{{ t('feedback.typeLabel') }}</label>
            <div class="fb-types">
              <button
                v-for="type in TYPES"
                :key="type.key"
                type="button"
                class="fb-type-btn"
                :class="{ 'fb-type-btn--active': selectedType === type.key }"
                @click="selectedType = type.key"
              >
                <span aria-hidden="true">{{ type.emoji }}</span>
                {{ t(`feedback.type${capitalize(type.key)}`) }}
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="fb-field">
            <label class="fb-label" for="fb-body">{{ t('feedback.bodyLabel') }}</label>
            <textarea
              id="fb-body"
              v-model="body"
              class="fb-textarea"
              :placeholder="t('feedback.bodyPlaceholder')"
              rows="4"
            />
            <p v-if="validationError" class="fb-error">{{ t('feedback.required') }}</p>
          </div>

          <!-- Actions -->
          <div class="fb-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="close">{{ t('ideas.cancel') }}</button>
            <button type="button" class="btn btn-primary btn-sm" @click="submit">{{ t('feedback.submit') }}</button>
          </div>
        </template>

        <!-- Thank-you state -->
        <template v-else>
          <div class="fb-thankyou">
            <span class="fb-thankyou-icon" aria-hidden="true">🎉</span>
            <h2 class="fb-title">{{ t('feedback.thankYou') }}</h2>
            <p class="fb-thankyou-msg">{{ t('feedback.thankYouMsg') }}</p>
            <button type="button" class="btn btn-primary btn-sm" @click="close">{{ t('feedback.done') }}</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);

const { t } = useI18n();
const { success: toastSuccess } = useToast();

const TYPES = [
  { key: 'bug',        emoji: '🐛' },
  { key: 'suggestion', emoji: '💡' },
  { key: 'praise',     emoji: '❤️' },
  { key: 'other',      emoji: '💬' },
];

const selectedType = ref('suggestion');
const body = ref('');
const validationError = ref(false);
const submitted = ref(false);

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Reset when opened
watch(() => props.open, (val) => {
  if (val) {
    selectedType.value = 'suggestion';
    body.value = '';
    validationError.value = false;
    submitted.value = false;
  }
});

async function submit() {
  if (!body.value.trim()) {
    validationError.value = true;
    return;
  }
  validationError.value = false;

  const typeLabel = t.value(`feedback.type${capitalize(selectedType.value)}`);
  const text = `[${typeLabel}]\n${body.value.trim()}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard API unavailable — still show thank-you
  }
  submitted.value = true;
}

function close() { emit('close'); }
</script>

<style scoped>
.fb-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: var(--space-4);
  box-sizing: border-box;
}

.fb-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  padding: var(--space-5);
  width: 100%;
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.fb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fb-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
}

.fb-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.fb-close:hover { color: var(--text); background: var(--border); }

.fb-field { display: flex; flex-direction: column; gap: var(--space-2); }

.fb-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fb-types {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.fb-type-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.fb-type-btn:hover { border-color: var(--accent); color: var(--accent); }
.fb-type-btn--active {
  border-color: var(--accent);
  background: var(--accent-subtle);
  color: var(--accent);
}

.fb-textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 100px;
  border-radius: var(--radius-sm);
  font-size: 0.9375rem;
  padding: var(--space-2) var(--space-3);
  line-height: 1.5;
}

.fb-error {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--danger);
}

.fb-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

/* Thank-you state */
.fb-thankyou {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  text-align: center;
}
.fb-thankyou-icon { font-size: 2rem; line-height: 1; }
.fb-thankyou-msg {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
