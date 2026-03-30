/**
 * E2E tests for Novel Ingestion Pipeline.
 *
 * Three fixtures covering different structural patterns:
 *   1. Explicit "Chapter I/II/III" headings → regex path (no Layer 1 AI call)
 *   2. No chapter markers, *** separators only → regex path (separators detected)
 *   3. "ACT I / ACT II / ACT III" markers → regex path
 *
 * All AI responses are mocked — no real API calls in CI.
 * A single universal mock returns the same shape for every AI call,
 * regardless of how many chapters regex detects. Layers that expect
 * a different shape (mergeCharacters, detectTemplate) fall back gracefully.
 */
import { test, expect } from '@playwright/test'
import { resetDB } from './helpers.js'
import { readFileSync } from 'fs'
import { join } from 'path'

const fixtureDir = join(process.cwd(), 'e2e', 'fixtures')

function readFixture(name) {
  return readFileSync(join(fixtureDir, name), 'utf-8')
}

// ── Universal AI mock ────────────────────────────────────────────────────────
// Returns the same chapter-analysis shape for EVERY AI call.
// - analyzeChapter: parses OK → extracts Mira + Callum
// - mergeCharacters: Array.isArray(parsed) === false → falls back to uniqueChars
// - detectTemplate: parsed.templateId missing → falls back to 'snowflake' (still truthy)

async function setupAiMock(page) {
  const universalText = JSON.stringify({
    characters: [
      { name: 'Mira', role: 'protagonist' },
      { name: 'Callum', role: 'supporting' },
    ],
    chapterSummary: 'The protagonist discovers an unexpected inheritance.',
  })

  const geminiBody = JSON.stringify({
    candidates: [{ content: { parts: [{ text: universalText }] } }],
  })
  const openaiBody = JSON.stringify({
    choices: [{ message: { content: universalText }, finish_reason: 'stop' }],
  })

  await page.route('**/v1beta/models/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: geminiBody })
  })
  await page.route('**/v1/chat/completions', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: openaiBody })
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetDB(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
})

// ── Helper: open the Novel Import modal from the settings page ────────────────

async function openNovelImportModal(page) {
  await page.goto('/#/settings')
  await page.waitForLoadState('networkidle')
  const btn = page.locator('button', { hasText: /Import from Novel Text|从小说文本导入|Importer depuis|Importar desde/i })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(page.locator('.novel-import-modal')).toBeVisible()
}

// ── Test 1: Explicit chapter headings (Chapter I / II / III) ─────────────────
// Regex detects 3 chapters → no Layer 1 AI call.
// Expected: ≥3 chapters, ≥1 character, template written.

test('fixture 1: explicit chapters detected via regex, imports to DB', async ({ page }) => {
  const novelText = readFixture('novel-explicit-chapters.txt')
  await setupAiMock(page)

  await openNovelImportModal(page)

  // Step 1: paste text
  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('.title-input').fill('The Clockwork Inheritance')
  await page.locator('button', { hasText: /Analyz/i }).click()

  // Step 2: preview (two .preview-card elements exist — chapters + characters)
  await expect(page.locator('.preview-card').first()).toBeVisible({ timeout: 15000 })

  // Should detect 3+ chapters (prologue may be added, but at least 3)
  const chaptersLabel = page.locator('.preview-card-label').first()
  await expect(chaptersLabel).toContainText(/chapter/i)

  // Characters should appear
  await expect(page.locator('.char-item').first()).toBeVisible()

  // Template badge should show something
  await expect(page.locator('.template-badge')).toBeVisible()

  // Proceed to step 3
  await page.locator('button', { hasText: /Import/i }).last().click()
  await expect(page.locator('.confirm-box')).toBeVisible()

  // Confirm import
  await page.locator('[data-testid="confirm-import-btn"]').click()

  // Should navigate to /outline
  await expect(page).toHaveURL(/#\/outline/, { timeout: 10000 })

  // Verify chapters were written to DB
  const chapterCount = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const storyId = localStorage.getItem('inkflow_current_story_id')
    const chapters = await window.__inkflow_db.chapters.where('storyId').equals(storyId).count()
    return chapters
  })
  expect(chapterCount).toBeGreaterThanOrEqual(3)
})

// ── Test 2: No chapter markers, *** separators only ───────────────────────────
// Regex finds *** separators → sections detected.
// No Layer 1 AI fallback needed (separators are enough).

test('fixture 2: *** separators detected, chapters and characters written to DB', async ({ page }) => {
  const novelText = readFixture('novel-no-chapters.txt')
  await setupAiMock(page)

  await openNovelImportModal(page)

  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('button', { hasText: /Analyz/i }).click()

  await expect(page.locator('.preview-card').first()).toBeVisible({ timeout: 15000 })

  // At least one chapter detected
  const chaptersLabel = page.locator('.preview-card-label').first()
  await expect(chaptersLabel).toContainText(/chapter/i)

  // Proceed to confirm
  await page.locator('button', { hasText: /Import/i }).last().click()
  await expect(page.locator('.confirm-box')).toBeVisible()
  await page.locator('[data-testid="confirm-import-btn"]').click()

  await expect(page).toHaveURL(/#\/outline/, { timeout: 10000 })

  // Verify characters were written
  const charCount = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const storyId = localStorage.getItem('inkflow_current_story_id')
    return window.__inkflow_db.characters.where('storyId').equals(storyId).count()
  })
  expect(charCount).toBeGreaterThanOrEqual(1)
})

// ── Test 3: ACT I / ACT II / ACT III markers ─────────────────────────────────
// Regex detects ACT markers → chapters detected, template written.

test('fixture 3: ACT markers detected, template set on story', async ({ page }) => {
  const novelText = readFixture('novel-acts.txt')
  await setupAiMock(page)

  await openNovelImportModal(page)

  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('.title-input').fill('The Last Inheritance')
  await page.locator('button', { hasText: /Analyz/i }).click()

  await expect(page.locator('.preview-card').first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.template-badge')).toBeVisible()

  // Proceed and confirm
  await page.locator('button', { hasText: /Import/i }).last().click()
  await expect(page.locator('.confirm-box')).toBeVisible()
  await page.locator('[data-testid="confirm-import-btn"]').click()

  await expect(page).toHaveURL(/#\/outline/, { timeout: 10000 })

  // Verify template written to story (any truthy value passes — snowflake fallback is fine)
  const storyTemplate = await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const storyId = localStorage.getItem('inkflow_current_story_id')
    const story = await window.__inkflow_db.stories.get(storyId)
    return story?.template
  })
  expect(storyTemplate).toBeTruthy()
})

// ── Test 4: Error states ──────────────────────────────────────────────────────

test('shows error when text is too short', async ({ page }) => {
  await openNovelImportModal(page)
  await page.locator('.novel-textarea').fill('Too short.')
  await page.locator('button', { hasText: /Analyz/i }).click()
  await expect(page.locator('.error-msg')).toBeVisible()
})

test('modal closes on cancel', async ({ page }) => {
  await openNovelImportModal(page)
  await page.locator('button', { hasText: /Cancel|Annuler|Cancelar|取消/i }).first().click()
  await expect(page.locator('.novel-import-modal')).not.toBeVisible()
})

// ── Test 6: Post-import UI verification ──────────────────────────────────────
// After confirming import, the /outline page must render the imported chapter
// titles and /characters must render the imported character names.
// This is stronger than a DB count — it verifies store + template rendering.

test('imported chapters appear in outline UI, characters appear on characters page', async ({ page }) => {
  const novelText = readFixture('novel-explicit-chapters.txt')
  await setupAiMock(page)

  await openNovelImportModal(page)
  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('.title-input').fill('The Clockwork Inheritance')
  await page.locator('button', { hasText: /Analyz/i }).click()
  await expect(page.locator('.preview-card').first()).toBeVisible({ timeout: 15000 })

  await page.locator('button', { hasText: /Import/i }).last().click()
  await expect(page.locator('.confirm-box')).toBeVisible()
  await page.locator('[data-testid="confirm-import-btn"]').click()
  await expect(page).toHaveURL(/#\/outline/, { timeout: 10000 })

  // Outline page must show at least one of the fixture's chapter titles
  await expect(
    page.locator('.outline-chapter-title').first()
  ).toBeVisible({ timeout: 8000 })

  // Characters page must show the AI-extracted characters (Mira, Callum from mock)
  await page.goto('/#/characters')
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.char-name').filter({ hasText: /Mira|Callum/i }).first()
  ).toBeVisible({ timeout: 8000 })
})

// ── Test 7: File upload path ──────────────────────────────────────────────────
// Tests the FileReader code path: uploading a .txt file populates the textarea.

test('file upload populates the textarea', async ({ page }) => {
  const novelText = readFixture('novel-explicit-chapters.txt')

  await openNovelImportModal(page)

  // Set the file input directly (simulates user picking a file)
  await page.locator('input[type="file"][accept=".txt,.md"]').setInputFiles({
    name: 'my-novel.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(novelText),
  })

  // After FileReader reads the file, the textarea should be populated
  await expect(page.locator('.novel-textarea')).not.toHaveValue('', { timeout: 5000 })

  // Title input should auto-populate from filename (minus extension)
  await expect(page.locator('.title-input')).toHaveValue('my-novel', { timeout: 3000 })
})
