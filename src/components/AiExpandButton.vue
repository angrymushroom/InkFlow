<template>
  <div class="ai-expand">
    <button
      type="button"
      class="btn btn-ghost btn-sm ai-expand-btn"
      :disabled="expanding"
      :title="hasKey ? t('ai.titleExpand') : t('ai.titleSetup')"
      @click="onClick"
    >
      <span v-if="expanding" class="ai-expand-spinner">⋯</span>
      <span v-else>{{ t('ai.expandWithAi') }}</span>
    </button>

    <!-- Friendly "no API key" overlay -->
    <div v-if="showSetupHint" class="ai-setup-overlay" @click.self="showSetupHint = false">
      <div class="ai-setup-card card">
        <h3 class="ai-setup-title">{{ t('ai.setupTitle') }}</h3>
        <p class="ai-setup-text">{{ t('ai.setupText') }}</p>
        <div class="ai-setup-actions">
          <button type="button" class="btn btn-primary" @click="goToSetup">{{ t('ai.goToSetup') }}</button>
          <button type="button" class="btn btn-ghost" @click="showSetupHint = false">{{ t('ai.close') }}</button>
        </div>
      </div>
    </div>

    <!-- AI result: let user Apply, Try again, or Keep mine -->
    <div v-if="showResultModal" class="ai-setup-overlay" @click.self="closeResultModal">
      <div class="ai-result-card card">
        <h3 class="ai-setup-title">{{ t('ai.previewTitle') }}</h3>
        <p class="ai-result-hint">{{ t('ai.previewHint') }}</p>
        <textarea
          v-model="editableResult"
          class="ai-result-textarea"
          rows="6"
          :placeholder="t('ai.previewPlaceholder')"
        />
        <p v-if="error && showResultModal" class="ai-expand-error ai-result-inline-error">{{ error }}</p>
        <div class="ai-result-actions">
          <button type="button" class="btn btn-primary" @click="applyResult">
            {{ t('ai.apply') }}
          </button>
          <button type="button" class="btn btn-ghost" :disabled="expanding" @click="tryAgain">
            {{ expanding ? t('ai.generating') : t('ai.tryAgain') }}
          </button>
          <button type="button" class="btn btn-ghost" @click="keepMine">
            {{ t('ai.keepMine') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="ai-expand-error">
      {{ error }}
      <router-link to="/settings" class="ai-expand-error-link">{{ t('ai.checkKey') }}</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { getApiKey, expandWithAi } from "@/services/ai";
import { getStory, getIdeas, getCharacters } from "@/db";
import { useI18n } from "@/composables/useI18n";

const { t, locale } = useI18n();

const props = defineProps({
  currentValue: { type: String, default: "" },
  fieldName: { type: String, required: true },
});

const emit = defineEmits(["expanded"]);

const router = useRouter();
const expanding = ref(false);
const error = ref("");
const showSetupHint = ref(false);
const showResultModal = ref(false);
const editableResult = ref("");

const hasKey = computed(() => !!getApiKey()?.trim());

function onClick() {
  if (!hasKey.value) {
    showSetupHint.value = true;
    return;
  }
  runExpand();
}

function goToSetup() {
  showSetupHint.value = false;
  router.push("/settings");
}

function closeResultModal() {
  showResultModal.value = false;
  editableResult.value = "";
}

function applyResult() {
  emit("expanded", editableResult.value?.trim() ?? "");
  closeResultModal();
}

function keepMine() {
  closeResultModal();
}

async function fetchExpansion() {
  const [story, ideas, characters] = await Promise.all([
    getStory(),
    getIdeas(),
    getCharacters(),
  ]);
  return expandWithAi({
    currentText: props.currentValue,
    fieldName: props.fieldName,
    story: story || {},
    ideas: ideas || [],
    characters: characters || [],
    locale: locale.value,
  });
}

async function tryAgain() {
  error.value = "";
  expanding.value = true;
  try {
    const result = await fetchExpansion();
    editableResult.value = result;
  } catch (e) {
    error.value = e?.message || "AI expand failed.";
  } finally {
    expanding.value = false;
  }
}

async function runExpand() {
  error.value = "";
  expanding.value = true;
  try {
    const result = await fetchExpansion();
    editableResult.value = result;
    showResultModal.value = true;
  } catch (e) {
    error.value = e?.message || "AI expand failed.";
  } finally {
    expanding.value = false;
  }
}
</script>

<style scoped>
.ai-expand {
  margin-top: var(--space-2);
}
.ai-expand-btn {
  font-size: 0.8125rem;
}
.ai-expand-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}
.ai-expand-spinner {
  display: inline-block;
  animation: pulse 0.8s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
.ai-expand-error {
  margin: var(--space-1) 0 0;
  font-size: 0.8125rem;
  color: var(--danger);
}
.ai-expand-error-link {
  display: block;
  margin-top: var(--space-1);
  font-size: 0.8125rem;
}

/* Setup overlay */
.ai-setup-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  padding: var(--space-4);
  padding-left: max(var(--space-4), env(safe-area-inset-left));
  padding-right: max(var(--space-4), env(safe-area-inset-right));
  padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.ai-setup-card {
  max-width: 360px;
  width: 100%;
  padding: var(--space-5);
  margin: auto;
}
.ai-setup-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-3);
}
.ai-setup-text {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-4);
  line-height: 1.5;
}
.ai-setup-actions {
  display: flex;
  gap: var(--space-2);
}

/* Result modal */
.ai-result-card {
  max-width: 480px;
  width: 100%;
  max-height: min(90vh, 90dvh);
  display: flex;
  flex-direction: column;
  padding: var(--space-5);
  margin: auto;
  overflow-y: auto;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}
.ai-result-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
  line-height: 1.4;
}
.ai-result-textarea {
  width: 100%;
  min-height: 120px;
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  resize: vertical;
  background: var(--bg);
  color: var(--text);
}
.ai-result-textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.ai-result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.ai-result-actions .btn-primary {
  flex-shrink: 0;
}
.ai-result-inline-error {
  margin: 0 0 var(--space-3);
  font-size: 0.8125rem;
}
</style>
