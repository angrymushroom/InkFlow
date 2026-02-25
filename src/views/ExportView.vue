<template>
  <div class="page">
    <h1 class="page-title">{{ t('export.title') }}</h1>
    <p class="page-subtitle">{{ t('export.subtitle') }}</p>

    <div class="card card-section">
      <h2 class="section-title">{{ t('export.language') }}</h2>
      <p class="form-hint">{{ t('export.languageSubtitle') }}</p>
      <div class="form-group">
        <label>{{ t('export.language') }}</label>
        <select v-model="currentLocale" @change="onLocaleChange" class="locale-select">
          <option v-for="opt in localeOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
      </div>
    </div>

    <div class="card card-section">
      <h2 class="section-title">{{ t('export.ai') }}</h2>
      <p class="form-hint">{{ t('export.aiHint') }}</p>
      <div class="form-group">
        <label>{{ t('export.provider') }}</label>
        <select v-model="provider" @change="onProviderChange">
          <option v-for="p in providers" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ providerLabel }} {{ t('export.apiKey') }}</label>
        <input
          v-model="apiKey"
          :type="showKey ? 'text' : 'password'"
          :placeholder="providerPlaceholder"
        />
        <p class="form-hint form-hint-small">{{ t('export.apiKeyHint') }} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a></p>
        <div class="form-row">
          <button type="button" class="btn btn-ghost btn-sm" @click="showKey = !showKey">
            {{ showKey ? t('export.hide') : t('export.show') }}
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="saveKey">{{ t('export.saveKey') }}</button>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="testing || !apiKey.trim()" @click="testApi">
            {{ testing ? t('export.testing') : t('export.testApi') }}
          </button>
        </div>
        <p v-if="testMessage" class="test-message" :class="testSuccess ? 'test-success' : 'test-error'">
          {{ testMessage }}
        </p>
      </div>
      <div class="form-group">
        <label>{{ t('export.modelQuick') }}</label>
        <select v-model="modelQuick" @change="onModelQuickChange" class="locale-select">
          <option v-for="opt in modelOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
        <p class="form-hint form-hint-small">{{ t('export.modelQuickHint') }}</p>
      </div>
      <div class="form-group">
        <label>{{ t('export.modelLongForm') }}</label>
        <select v-model="modelLongForm" @change="onModelLongFormChange" class="locale-select">
          <option v-for="opt in modelOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
        <p class="form-hint form-hint-small">{{ t('export.modelLongFormHint') }}</p>
      </div>
    </div>

    <div class="card card-section">
      <h2 class="section-title">{{ t('export.backup') }}</h2>
      <p class="form-hint">{{ t('export.backupReminder') }}</p>
      <div class="form-group">
        <button class="btn btn-primary" @click="exportProject">{{ t('export.downloadBackup') }}</button>
        <p v-if="exportError" class="test-message test-error">{{ exportError }}</p>
      </div>
      <p v-if="backupNudge" class="form-hint backup-nudge">{{ t('export.backupNudge') }}</p>
      <div class="form-group">
        <label>{{ t('export.importBackup') }}</label>
        <input type="file" accept=".json,application/json" @change="onFileSelect" />
        <p class="form-hint">{{ t('export.importHint') }}</p>
        <p v-if="importError" class="test-message test-error">{{ importError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { exportProject as doExport, importProject } from '@/db';
import {
  PROVIDERS,
  TIERS,
  getProvider,
  setProvider,
  getApiKey,
  setApiKey,
  getModel,
  setModel,
  testApiKey,
  GEMINI_MODEL_OPTIONS,
  OPENAI_MODEL_OPTIONS,
} from '@/services/ai';
import { useI18n } from '@/composables/useI18n';
import { LOCALES } from '@/locales';

const { locale, t, setLocale } = useI18n();
const localeOptions = LOCALES;
const currentLocale = ref(locale.value);

const providers = PROVIDERS;
const provider = ref(getProvider());
const apiKey = ref('');
const showKey = ref(false);
const testing = ref(false);
const testMessage = ref('');
const testSuccess = ref(false);

const providerLabel = computed(() => {
  const p = providers.find((x) => x.id === provider.value);
  return p?.name ?? 'API';
});
const providerPlaceholder = computed(() => {
  const p = providers.find((x) => x.id === provider.value);
  return p?.placeholder ?? 'API key';
});
const modelOptions = computed(() =>
  provider.value === 'gemini' ? GEMINI_MODEL_OPTIONS : OPENAI_MODEL_OPTIONS
);

const modelQuick = ref('');
const modelLongForm = ref('');
const exportError = ref('');
const importError = ref('');
const LAST_EXPORT_KEY = 'inkflow_last_export_at';
const BACKUP_NUDGE_DAYS = 30;
const backupNudge = ref(false);

function loadKey() {
  apiKey.value = getApiKey();
}
function loadModels() {
  modelQuick.value = getModel(provider.value, TIERS.LIGHT);
  modelLongForm.value = getModel(provider.value, TIERS.ADVANCED);
}
function onModelQuickChange() {
  setModel(provider.value, TIERS.LIGHT, modelQuick.value);
}
function onModelLongFormChange() {
  setModel(provider.value, TIERS.ADVANCED, modelLongForm.value);
}

function onProviderChange() {
  setProvider(provider.value);
  loadKey();
  loadModels();
}

onMounted(() => {
  loadKey();
  loadModels();
  currentLocale.value = locale.value;
  checkBackupNudge();
});

function onLocaleChange() {
  setLocale(currentLocale.value);
}

function saveKey() {
  setProvider(provider.value);
  setApiKey(apiKey.value);
  testMessage.value = '';
  alert(t.value('export.keySaved'));
}

async function testApi() {
  if (!apiKey.value?.trim()) {
    testMessage.value = t.value('export.testError');
    testSuccess.value = false;
    return;
  }
  testing.value = true;
  testMessage.value = '';
  testSuccess.value = false;
  try {
    await testApiKey(apiKey.value.trim(), provider.value);
    testMessage.value = t.value('export.testSuccess');
    testSuccess.value = true;
  } catch (e) {
    testMessage.value = e?.message || t.value('export.testError');
    testSuccess.value = false;
  } finally {
    testing.value = false;
  }
}

async function exportProject() {
  exportError.value = '';
  try {
    const data = await doExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inkflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    try {
      localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
    } catch (_) {}
    backupNudge.value = false;
  } catch (err) {
    exportError.value = err?.message || t.value('export.exportErrorGeneric');
  }
}

function checkBackupNudge() {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY);
    if (!raw) {
      backupNudge.value = true;
      return;
    }
    const then = parseInt(raw, 10);
    if (Number.isNaN(then) || Date.now() - then > BACKUP_NUDGE_DAYS * 24 * 60 * 60 * 1000) {
      backupNudge.value = true;
    }
  } catch (_) {
    backupNudge.value = false;
  }
}

function onFileSelect(e) {
  const file = e.target?.files?.[0];
  if (!file) return;
  importError.value = '';
  if (!confirm(t.value('export.importConfirm'))) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target?.result ?? '{}');
      await importProject(data);
      try {
        localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
      } catch (_) {}
      alert(t.value('export.importDone'));
      window.location.reload();
    } catch (err) {
      importError.value = err?.message || t.value('export.importErrorGeneric');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
</script>

<style scoped>
.card-section {
  margin-bottom: var(--space-5);
}
.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-3);
}
.form-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
}
.form-hint code {
  background: var(--border);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8125rem;
}
.form-row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.form-hint-small {
  margin-top: var(--space-1);
  font-size: 0.8125rem;
}
.form-hint-small a {
  color: var(--accent);
}
.test-message {
  margin-top: var(--space-2);
  font-size: 0.875rem;
}
.test-success {
  color: var(--success);
}
.test-error {
  color: var(--danger);
}
.backup-nudge {
  margin-top: var(--space-1);
  font-style: italic;
}
</style>
