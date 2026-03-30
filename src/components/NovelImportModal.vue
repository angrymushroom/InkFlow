<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card novel-import-modal" role="dialog" aria-modal="true">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{{ t('novelImport.modalTitle') }}</h2>
        <button class="btn btn-icon modal-close-btn" @click="$emit('close')" :aria-label="t('novelImport.cancelBtn')">✕</button>
      </div>

      <!-- Step indicators -->
      <div class="steps-row">
        <div v-for="n in 3" :key="n" class="step-dot" :class="{ active: step === n, done: step > n }">
          {{ n }}
        </div>
      </div>

      <!-- ── Step 1: Input ── -->
      <div v-if="step === 1" class="step-body">
        <h3 class="step-title">{{ t('novelImport.step1Title') }}</h3>
        <div class="form-group">
          <input
            v-model="titleInput"
            type="text"
            class="title-input"
            :placeholder="t('novelImport.storyTitlePlaceholder')"
          />
        </div>
        <div class="form-group">
          <textarea
            v-model="rawText"
            class="novel-textarea"
            :placeholder="t('novelImport.textareaPlaceholder')"
            rows="12"
          />
        </div>
        <div class="form-group upload-row">
          <label class="upload-label">
            {{ t('novelImport.uploadLabel') }}
            <input type="file" accept=".txt,.md" class="file-input" @change="onFileUpload" />
          </label>
          <span class="form-hint">{{ t('novelImport.uploadHint') }}</span>
        </div>
        <p v-if="inputError" class="error-msg">{{ inputError }}</p>
      </div>

      <!-- ── Step 2: Preview ── -->
      <div v-if="step === 2" class="step-body">
        <h3 class="step-title">{{ t('novelImport.step2Title') }}</h3>

        <div class="preview-grid">
          <!-- Chapters -->
          <div class="preview-card">
            <div class="preview-card-label">
              {{ result.chapters.length === 1
                ? t('novelImport.oneChapterFound')
                : t('novelImport.chaptersFound', { count: result.chapters.length }) }}
            </div>
            <ul class="chapter-list">
              <li v-for="(ch, i) in result.chapters.slice(0, 8)" :key="i" class="chapter-item">
                <span class="chapter-title">{{ ch.title }}</span>
                <span class="chapter-scenes">
                  {{ t('novelImport.scenesFound', { count: ch.scenes.length }) }}
                </span>
              </li>
              <li v-if="result.chapters.length > 8" class="chapter-item chapter-more">
                + {{ result.chapters.length - 8 }} more…
              </li>
            </ul>
          </div>

          <!-- Characters -->
          <div class="preview-card">
            <div class="preview-card-label">
              {{ result.characters.length === 0
                ? t('novelImport.noCharacters')
                : t('novelImport.charactersFound', { count: result.characters.length }) }}
            </div>
            <ul class="char-list">
              <li v-for="(c, i) in result.characters.slice(0, 6)" :key="i" class="char-item">
                {{ c.canonicalName }}
                <span v-if="c.role" class="char-role">({{ c.role }})</span>
              </li>
              <li v-if="result.characters.length > 6" class="char-item char-more">
                + {{ result.characters.length - 6 }} more…
              </li>
            </ul>
          </div>
        </div>

        <!-- Template + confidence -->
        <div class="template-row">
          <span class="template-badge">
            {{ t('novelImport.detectedTemplate', { name: templateDisplayName }) }}
          </span>
          <span class="confidence-badge" :class="{ 'confidence-low': result.lowConfidence }">
            {{ t('novelImport.templateConfidence', { pct: Math.round(result.templateConfidence * 100) }) }}
          </span>
        </div>
        <p v-if="result.lowConfidence" class="low-confidence-warning">
          ⚠ {{ t('novelImport.lowConfidenceWarning') }}
        </p>

        <!-- Spine preview -->
        <div v-if="spineEntries.length > 0" class="spine-preview">
          <div class="spine-preview-title">{{ t('novelImport.spinePreviewTitle') }}</div>
          <div v-for="entry in spineEntries" :key="entry.key" class="spine-entry">
            <span class="spine-key">{{ entry.label }}</span>
            <span class="spine-val">{{ entry.value || t('novelImport.emptySpine') }}</span>
          </div>
        </div>
      </div>

      <!-- ── Step 3: Confirm ── -->
      <div v-if="step === 3" class="step-body">
        <h3 class="step-title">{{ t('novelImport.step3Title') }}</h3>
        <div class="confirm-box">
          <p class="confirm-title">{{ t('novelImport.confirmTitle') }}</p>
          <p class="confirm-hint">{{ t('novelImport.confirmHint') }}</p>
        </div>
      </div>

      <!-- Footer buttons -->
      <div class="modal-footer">
        <button
          v-if="step > 1"
          type="button"
          class="btn btn-ghost"
          :disabled="busy"
          @click="step--"
        >
          {{ t('novelImport.backBtn') }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="busy"
          @click="$emit('close')"
        >
          {{ t('novelImport.cancelBtn') }}
        </button>
        <button
          v-if="step === 1"
          type="button"
          class="btn btn-primary"
          :disabled="busy"
          @click="runAnalysis"
        >
          {{ busy ? t('novelImport.analyzing') : t('novelImport.analyzeBtn') }}
        </button>
        <button
          v-if="step === 2"
          type="button"
          class="btn btn-primary"
          @click="step = 3"
        >
          {{ t('novelImport.importBtn') }} →
        </button>
        <button
          v-if="step === 3"
          type="button"
          class="btn btn-primary"
          data-testid="confirm-import-btn"
          :disabled="busy"
          @click="doImport"
        >
          {{ busy ? t('novelImport.importing') : t('novelImport.importBtn') }}
        </button>
      </div>

      <!-- Progress bar (visible while analyzing) -->
      <div v-if="busy" class="progress-bar-wrap">
        <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { getCurrentStoryId } from '@/db'
import { runIngestionPipeline, writeIngestionToDb } from '@/services/novelIngestion'
import { TEMPLATES } from '@/data/templates'

const emit = defineEmits(['close'])

const { t } = useI18n()
const { success: toastSuccess, error: toastError } = useToast()
const router = useRouter()

const step = ref(1)
const rawText = ref('')
const titleInput = ref('')
const inputError = ref('')
const busy = ref(false)
const progressPct = ref(0)

/** @type {import('@/services/novelIngestion').IngestionResult|null} */
const result = ref(null)

// ── File upload ──────────────────────────────────────────────────────────────

function onFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    rawText.value = ev.target.result || ''
    if (!titleInput.value) {
      titleInput.value = file.name.replace(/\.[^.]+$/, '')
    }
  }
  reader.readAsText(file, 'utf-8')
}

// ── Step 1 → 2: analysis ─────────────────────────────────────────────────────

async function runAnalysis() {
  inputError.value = ''
  const text = rawText.value.trim()
  if (!text) {
    inputError.value = t('novelImport.errorNoText')
    return
  }
  if (text.length < 200) {
    inputError.value = t('novelImport.errorTooShort')
    return
  }

  busy.value = true
  progressPct.value = 5

  try {
    result.value = await runIngestionPipeline(text, titleInput.value.trim(), (step, pct) => {
      progressPct.value = pct
    })
    step.value = 2
  } catch (err) {
    inputError.value = err?.message || t('novelImport.errorGeneric')
  } finally {
    busy.value = false
    progressPct.value = 0
  }
}

// ── Step 3: write to DB ───────────────────────────────────────────────────────

async function doImport() {
  if (!result.value) return
  busy.value = true
  try {
    const storyId = getCurrentStoryId()
    await writeIngestionToDb(storyId, result.value, titleInput.value.trim())
    toastSuccess(t('novelImport.successToast'))
    emit('close')
    router.push('/outline')
  } catch (err) {
    toastError(err?.message || t('novelImport.errorGeneric'))
  } finally {
    busy.value = false
  }
}

// ── Computed helpers ──────────────────────────────────────────────────────────

const templateDisplayName = computed(() => {
  if (!result.value) return ''
  const id = result.value.templateId
  const key = `templates.${id}.name`
  return t(key) || id
})

const spineEntries = computed(() => {
  if (!result.value) return []
  const id = result.value.templateId
  const tpl = TEMPLATES[id]
  if (!tpl) return []
  return tpl.spineFields.slice(0, 4).map((field) => ({
    key: field.key,
    label: t(`templates.${id}.fields.${field.key}`) || field.key,
    value: result.value.spine[field.key] || '',
  }))
})
</script>

<style scoped>
.novel-import-modal {
  width: min(680px, 96vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.modal-close-btn {
  font-size: 1rem;
  color: var(--text-muted);
}

/* Step dots */
.steps-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  border: 2px solid var(--border);
  color: var(--text-muted);
  transition: all 0.2s;
}
.step-dot.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
}
.step-dot.done {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* Step body */
.step-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.step-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 var(--space-2);
  color: var(--text);
}

.title-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
}

.novel-textarea {
  width: 100%;
  min-height: 200px;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
  font-family: monospace;
  resize: vertical;
  line-height: 1.5;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.upload-label {
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.file-input {
  display: none;
}

.error-msg {
  color: var(--danger);
  font-size: 0.875rem;
  margin: 0;
}

/* Preview grid */
.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

@media (max-width: 500px) {
  .preview-grid { grid-template-columns: 1fr; }
}

.preview-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3);
  background: var(--bg-elevated);
}

.preview-card-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.chapter-list,
.char-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85rem;
  gap: var(--space-2);
}

.chapter-title {
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 65%;
}

.chapter-scenes {
  color: var(--text-muted);
  font-size: 0.78rem;
  white-space: nowrap;
}

.chapter-more,
.char-more {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.char-item {
  font-size: 0.85rem;
  color: var(--text);
}

.char-role {
  color: var(--text-muted);
  font-size: 0.78rem;
  margin-left: 4px;
}

/* Template badge */
.template-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.template-badge {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.82rem;
  font-weight: 600;
}

.confidence-badge {
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.82rem;
}

.confidence-badge.confidence-low {
  background: rgba(225, 29, 72, 0.08);
  color: var(--danger);
  border-color: rgba(225, 29, 72, 0.3);
}

.low-confidence-warning {
  font-size: 0.85rem;
  color: var(--danger);
  margin: 0;
  background: rgba(225, 29, 72, 0.06);
  border: 1px solid rgba(225, 29, 72, 0.2);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
}

/* Spine preview */
.spine-preview {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3);
  background: var(--bg-elevated);
}

.spine-preview-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-2);
}

.spine-entry {
  display: flex;
  gap: var(--space-3);
  font-size: 0.85rem;
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
}
.spine-entry:last-child { border-bottom: none; }

.spine-key {
  color: var(--text-muted);
  min-width: 90px;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.spine-val {
  color: var(--text);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Confirm box */
.confirm-box {
  border: 1px solid rgba(225, 29, 72, 0.3);
  border-radius: var(--radius);
  background: rgba(225, 29, 72, 0.06);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.confirm-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
  color: var(--text);
}

.confirm-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* Progress bar */
.progress-bar-wrap {
  height: 3px;
  background: var(--border);
  flex-shrink: 0;
}

.progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s ease;
}
</style>
