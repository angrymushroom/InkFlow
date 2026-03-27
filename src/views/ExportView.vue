<template>
  <div class="page">
    <h1 class="page-title">{{ t('settings.title') }}</h1>
    <p class="page-subtitle">{{ t('settings.subtitle') }}</p>

    <div class="card card-section">
      <h2 class="section-title">{{ t('settings.appearance') }}</h2>
      <div class="form-group">
        <label>{{ t('settings.darkMode') }}</label>
        <select :value="theme" @change="onThemeChange" class="theme-select">
          <option value="light">{{ t('settings.themeLight') }}</option>
          <option value="dark">{{ t('settings.themeDark') }}</option>
          <option value="system">{{ t('settings.themeSystem') }}</option>
        </select>
      </div>
    </div>

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
        <label>
          {{ providerLabel }} {{ t('export.apiKey') }}
          <span class="info-tooltip-wrapper" :aria-label="t('export.apiKeyPrivacyNote')">
            <button type="button" class="info-btn" tabindex="0">ⓘ</button>
            <span class="info-tooltip" role="tooltip">{{ t('export.apiKeyPrivacyNote') }}</span>
          </span>
        </label>
        <input
          v-model="apiKey"
          :type="showKey ? 'text' : 'password'"
          :placeholder="providerPlaceholder"
        />
        <p class="form-hint form-hint-small">
          {{ t('export.apiKeyHint') }}
          <a v-if="providerKeyHelpUrl" :href="providerKeyHelpUrl" target="_blank" rel="noopener">{{ providerKeyHelpLabel }}</a>
        </p>
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
        <label>{{ t('export.qualityBias') }}</label>
        <div class="bias-toggle">
          <button
            type="button"
            class="bias-btn"
            :class="{ 'bias-btn--active': qualityBias === 'faster' }"
            @click="onBiasChange('faster')"
          >⚡ {{ t('export.qualityBiasFaster') }}</button>
          <button
            type="button"
            class="bias-btn"
            :class="{ 'bias-btn--active': qualityBias === 'best' }"
            @click="onBiasChange('best')"
          >✨ {{ t('export.qualityBiasBest') }}</button>
        </div>
        <p class="form-hint form-hint-small">{{ t('export.qualityBiasHint') }}</p>
      </div>
    </div>

    <div class="card card-section">
      <h2 class="section-title">{{ t('export.exportTitle') }}</h2>
      <div class="export-format-group">
        <div class="form-group">
          <label>{{ t('export.exportFormat') }}</label>
          <select v-model="exportFormat" class="locale-select">
            <option value="json">{{ t('export.formatJson') }}</option>
            <option value="epub">{{ t('export.formatEpub') }}</option>
            <option value="docx">{{ t('export.formatDocx') }}</option>
            <option value="pdf">{{ t('export.formatPdf') }}</option>
            <option value="markdown">{{ t('export.formatMarkdown') }}</option>
            <option value="txt">{{ t('export.formatTxt') }}</option>
          </select>
        </div>
        <button class="btn btn-primary" :disabled="exporting" @click="doExport">
          {{ exporting ? '…' : t('export.download') }}
        </button>
      </div>
      <p class="form-hint format-hint">{{ formatHint }}</p>
      <p v-if="exportFormat === 'pdf'" class="form-hint pdf-note">{{ t('export.pdfNote') }}</p>
      <p v-if="exportFormat === 'json' && backupNudge" class="form-hint backup-nudge">{{ t('export.backupNudge') }}</p>
      <p v-if="exportError" class="test-message test-error">{{ exportError }}</p>

      <div class="import-divider"></div>
      <div class="form-group">
        <label>{{ t('export.importBackup') }}</label>
        <input type="file" accept=".json,application/json" @change="onFileSelect" />
        <p class="form-hint">{{ t('export.importHint') }}</p>
        <p v-if="importError" class="test-message test-error">{{ importError }}</p>
      </div>
    </div>

    <div class="card card-section about-section">
      <div class="about-row">
        <span class="about-name">InkFlow</span>
        <span class="about-version">v{{ appVersion }}</span>
        <button class="btn btn-ghost btn-sm" @click="showChangelog = true">{{ t('settings.whatsNew') }}</button>
      </div>
    </div>

    <div class="card card-section shortcuts-section">
      <h2 class="settings-section-title">{{ t('settings.shortcuts.title') }}</h2>
      <table class="shortcuts-table">
        <tbody>
          <tr>
            <td class="shortcut-keys"><kbd>⌘S</kbd> / <kbd>Ctrl+S</kbd></td>
            <td class="shortcut-desc">{{ t('settings.shortcuts.saveScene') }}</td>
          </tr>
          <tr>
            <td class="shortcut-keys"><kbd>Esc</kbd></td>
            <td class="shortcut-desc">{{ t('settings.shortcuts.exitFocus') }}</td>
          </tr>
          <tr>
            <td class="shortcut-keys"><kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd></td>
            <td class="shortcut-desc">{{ t('settings.shortcuts.globalSearch') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ChangelogModal v-if="showChangelog" @close="showChangelog = false" />

    <ConfirmModal
      v-model="importConfirmOpen"
      :title="t('export.importConfirmTitle')"
      :body="t('export.importConfirm')"
      :confirm-label="t('export.importConfirmButton')"
      :cancel-label="t('ideas.cancel')"
      :danger="true"
      @confirm="doImport"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { useToast } from '@/composables/useToast';
import { exportProject as doExportJson, importProject, getCurrentStoryId, getStory } from '@/db';
import { buildMarkdown, buildPlainText, buildEpubBlob, buildDocxBlob, openPrintWindow, safeFilename } from '@/utils/exportFormats';
import {
  PROVIDERS, getProvider, setProvider, getApiKey, setApiKey,
  testApiKey, QUALITY_BIAS, getQualityBias, setQualityBias,
} from '@/services/ai';
import { useI18n } from '@/composables/useI18n';
import { LOCALES } from '@/locales';
import ConfirmModal from '@/components/ConfirmModal.vue';
import ChangelogModal from '@/components/ChangelogModal.vue';
import { APP_VERSION } from '@/data/changelog';

const { locale, t, setLocale } = useI18n();
const appVersion = APP_VERSION;
const showChangelog = ref(false);
const { theme, setTheme } = useTheme();
const { success: toastSuccess, error: toastError } = useToast();
const localeOptions = LOCALES;
const currentLocale = ref(locale.value);

function onThemeChange(e) { setTheme(e.target.value); }

const providers = PROVIDERS;
const provider = ref(getProvider());
const apiKey = ref('');
const showKey = ref(false);
const testing = ref(false);
const testMessage = ref('');
const testSuccess = ref(false);

const providerConfig      = computed(() => providers.find((x) => x.id === provider.value));
const providerLabel       = computed(() => providerConfig.value?.name ?? 'API');
const providerPlaceholder = computed(() => providerConfig.value?.placeholder ?? 'API key');
const providerKeyHelpUrl  = computed(() => providerConfig.value?.keyHelpUrl ?? '');
const providerKeyHelpLabel = computed(() => providerConfig.value?.keyHelpLabel ?? t.value('export.apiKeyGetKey'));

const qualityBias = ref(getQualityBias());
const exportFormat = ref('json');
const exporting = ref(false);
const exportError = ref('');
const importError = ref('');
const importConfirmOpen = ref(false);
let pendingImportData = null;

const formatHint = computed(() => {
  if (exportFormat.value === 'json') return t.value('export.formatJsonHint');
  if (exportFormat.value === 'pdf') return t.value('export.formatStoryHint');
  return t.value('export.formatStoryHint');
});

const LAST_EXPORT_KEY = 'inkflow_last_export_at';
const BACKUP_NUDGE_DAYS = 30;
const backupNudge = ref(false);

function loadKey() { apiKey.value = getApiKey(); }
function onBiasChange(bias) { qualityBias.value = bias; setQualityBias(bias); }
function onProviderChange() { setProvider(provider.value); loadKey(); }

onMounted(() => {
  loadKey();
  currentLocale.value = locale.value;
  checkBackupNudge();
});

function onLocaleChange() { setLocale(currentLocale.value); }

function saveKey() {
  setProvider(provider.value);
  setApiKey(apiKey.value);
  testMessage.value = '';
  toastSuccess(t.value('export.keySaved'));
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function doExport() {
  exportError.value = '';
  exporting.value = true;
  const storyId = getCurrentStoryId();
  const dateStr = new Date().toISOString().slice(0, 10);
  try {
    if (exportFormat.value === 'json') {
      const data = await doExportJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `inkflow-backup-${dateStr}.json`);
      try { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); } catch (_) {}
      backupNudge.value = false;
    } else {
      const story = await getStory(storyId);
      if (exportFormat.value === 'markdown') {
        const md = await buildMarkdown(storyId);
        downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), safeFilename(story, 'md'));
      } else if (exportFormat.value === 'txt') {
        const txt = await buildPlainText(storyId);
        downloadBlob(new Blob([txt], { type: 'text/plain;charset=utf-8' }), safeFilename(story, 'txt'));
      } else if (exportFormat.value === 'pdf') {
        await openPrintWindow(storyId);
      } else if (exportFormat.value === 'epub') {
        downloadBlob(await buildEpubBlob(storyId), safeFilename(story, 'epub'));
      } else if (exportFormat.value === 'docx') {
        downloadBlob(await buildDocxBlob(storyId), safeFilename(story, 'docx'));
      }
    }
  } catch (err) {
    exportError.value = err?.message || t.value('export.exportErrorGeneric');
  } finally {
    exporting.value = false;
  }
}

function checkBackupNudge() {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY);
    if (!raw) { backupNudge.value = true; return; }
    const then = parseInt(raw, 10);
    if (Number.isNaN(then) || Date.now() - then > BACKUP_NUDGE_DAYS * 24 * 60 * 60 * 1000) {
      backupNudge.value = true;
    }
  } catch (_) { backupNudge.value = false; }
}

function onFileSelect(e) {
  const file = e.target?.files?.[0];
  if (!file) return;
  importError.value = '';
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      pendingImportData = JSON.parse(ev.target?.result ?? '{}');
      importConfirmOpen.value = true;
    } catch (err) {
      importError.value = err?.message || t.value('export.importErrorGeneric');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function doImport() {
  importConfirmOpen.value = false;
  if (!pendingImportData) return;
  try {
    await importProject(pendingImportData);
    try { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); } catch (_) {}
    toastSuccess(t.value('export.importDone'));
    setTimeout(() => window.location.reload(), 1200);
  } catch (err) {
    importError.value = err?.message || t.value('export.importErrorGeneric');
  } finally {
    pendingImportData = null;
  }
}
</script>

<style scoped>
.card-section { margin-bottom: var(--space-5); }
.section-title { font-size: 1.125rem; font-weight: 600; margin: 0 0 var(--space-3); }
.form-hint { font-size: 0.875rem; color: var(--text-muted); margin: 0 0 var(--space-3); }
.form-hint code { background: var(--border); padding: 2px 6px; border-radius: 4px; font-size: 0.8125rem; }
.form-row { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
.form-hint-small { margin-top: var(--space-1); font-size: 0.8125rem; }
.info-tooltip-wrapper {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  margin-left: var(--space-1);
}
.info-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.8125rem;
  padding: 0;
  line-height: 1;
}
.info-btn:hover, .info-btn:focus { color: var(--accent); outline: none; }
.info-tooltip {
  display: none;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(100% + 6px);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  padding: var(--space-2) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--text-muted);
  width: 240px;
  white-space: normal;
  z-index: 100;
  pointer-events: none;
}
.info-tooltip-wrapper:hover .info-tooltip,
.info-tooltip-wrapper:focus-within .info-tooltip { display: block; }
.bias-toggle { display: flex; gap: var(--space-2); margin-top: var(--space-1); }
.bias-btn {
  flex: 1; padding: var(--space-2) var(--space-3); font: inherit; font-size: 0.875rem;
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); color: var(--text-muted); cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.bias-btn:hover { border-color: var(--accent); color: var(--text); }
.bias-btn--active { border-color: var(--accent); background: rgba(37,99,235,0.08); color: var(--accent); font-weight: 500; }
.form-hint-small a { color: var(--accent); }
.test-message { margin-top: var(--space-2); font-size: 0.875rem; }
.test-success { color: var(--success); }
.test-error { color: var(--danger); }
.backup-nudge { margin-top: var(--space-1); font-style: italic; }
.export-format-group {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 0;
}
.export-format-group .form-group {
  margin-bottom: 0;
  flex: 1;
  min-width: 180px;
}
.format-hint {
  margin-top: var(--space-2);
  margin-bottom: 0;
}
.pdf-note {
  margin-top: var(--space-1);
  margin-bottom: 0;
}
.about-section { padding: var(--space-3) var(--space-4); }
.about-row { display: flex; align-items: center; gap: var(--space-3); }
.about-name { font-weight: 600; color: var(--text); }
.about-version { font-size: 0.875rem; color: var(--text-muted); }
.import-divider {
  border-top: 1px solid var(--border);
  margin: var(--space-5) 0 var(--space-4);
}
.shortcuts-section { padding: var(--space-3) var(--space-4); }
.shortcuts-table { width: 100%; border-collapse: collapse; }
.shortcuts-table tr + tr td { border-top: 1px solid var(--border); }
.shortcuts-table td { padding: var(--space-2) 0; vertical-align: middle; }
.shortcut-keys { white-space: nowrap; padding-right: var(--space-4); }
kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.8125rem;
  font-family: inherit;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 4px);
  color: var(--text);
}
.shortcut-desc { color: var(--text-muted); font-size: 0.9375rem; }
</style>
