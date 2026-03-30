/**
 * E2E tests for Novel Ingestion Pipeline.
 *
 * Three fixtures covering different structural patterns:
 *   1. Explicit "Chapter I/II/III" headings → regex path (no Layer 1 AI call)
 *   2. No chapter markers, *** separators only → AI fallback path
 *   3. "ACT I / ACT II / ACT III" markers → regex path
 *
 * All AI responses are mocked — no real API calls in CI.
 */
import { test, expect } from '@playwright/test'
import { resetDB, mockAiResponse } from './helpers.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readFixture(name) {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8')
}

// ── Shared mock helper ────────────────────────────────────────────────────────
// Each ingestion makes N sequential AI calls:
//   Layer 2: 1 call per chapter (chapter analysis JSON)
//   Layer 3a: 1 call (character merge JSON array)
//   Layer 3b: 1 call (template detection JSON)
//   Layer 1 fallback (optional): 1 call (chapter boundaries JSON)
//
// We use a stateful counter so each call gets a fitting response shape.

function buildSeqMock(chapterCount, templateId = 'hero_journey', includeLayer1Fallback = false) {
  const chapterAnalysis = JSON.stringify({
    characters: [
      { name: 'Mira', role: 'protagonist' },
      { name: 'Callum', role: 'supporting' },
    ],
    chapterSummary: 'The protagonist discovers an unexpected inheritance.',
  })

  const layer1Fallback = JSON.stringify([
    { title: 'Part One', startIndex: 0 },
    { title: 'Part Two', startIndex: 800 },
  ])

  const charMerge = JSON.stringify([
    { canonicalName: 'Mira', aliases: [], oneSentence: 'A curious solicitor.', role: 'protagonist' },
    { canonicalName: 'Callum', aliases: [], oneSentence: 'Her dependable neighbour.', role: 'supporting' },
  ])

  const spineMap = {
    hero_journey: { premise: 'A quiet life interrupted.', call: 'The letter arrives.', trials: 'Secrets uncovered.', ordeal: 'The truth confronted.', elixir: 'A new understanding.' },
    save_the_cat: { logline: 'A woman uncovers her family\'s secret.', catalyst: 'An unexpected inheritance.', debate: 'Should she dig deeper?', midpoint: 'The documents are found.', allIsLost: 'Everything is questioned.', finale: 'She makes her choice.' },
    snowflake: { oneSentence: 'A woman inherits more than a house.', setup: 'Mira receives a mysterious key.', disaster1: 'The workshop holds dangerous secrets.', disaster2: 'Her family history is not what she thought.', disaster3: 'She must decide what to do with the truth.', ending: 'She chooses honesty over comfort.' },
  }

  const templateDetect = JSON.stringify({
    templateId,
    confidence: 0.82,
    spine: spineMap[templateId] || spineMap.hero_journey,
  })

  return async (page) => {
    let callIndex = 0
    const calls = []
    if (includeLayer1Fallback) calls.push(layer1Fallback)
    for (let i = 0; i < chapterCount; i++) calls.push(chapterAnalysis)
    calls.push(charMerge)
    calls.push(templateDetect)

    const fulfill = (route) => {
      const text = calls[callIndex] ?? chapterAnalysis
      callIndex++
      const body = JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })
      route.fulfill({ status: 200, contentType: 'application/json', body })
    }

    // Gemini non-streaming
    await page.route('**/v1beta/models/**', fulfill)
    // OpenAI-compat (non-streaming for completeWithAi)
    await page.route('**/v1/chat/completions', (route) => {
      const text = calls[callIndex] ?? chapterAnalysis
      callIndex++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: text }, finish_reason: 'stop' }] }),
      })
    })
  }
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
// Expected: 3 chapters, 2 characters, hero_journey template.

test('fixture 1: explicit chapters detected via regex, imports to DB', async ({ page }) => {
  const novelText = readFixture('novel-explicit-chapters.txt')
  const setupMock = buildSeqMock(3, 'hero_journey', false)
  await setupMock(page)

  await openNovelImportModal(page)

  // Step 1: paste text
  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('.title-input').fill('The Clockwork Inheritance')
  await page.locator('button', { hasText: /Analyz/i }).click()

  // Step 2: preview
  await expect(page.locator('.preview-card')).toBeVisible({ timeout: 15000 })

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
  await page.locator('.confirm-box').locator('..').locator('button', { hasText: /Import/i }).click()

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
// Regex finds *** separators → at least 2 "chapters" detected.
// No Layer 1 AI fallback needed (separators are enough).

test('fixture 2: *** separators detected, chapters and characters written to DB', async ({ page }) => {
  const novelText = readFixture('novel-no-chapters.txt')
  // The *** regex will fire — expect ~5 sections
  const setupMock = buildSeqMock(5, 'story_circle', false)
  await setupMock(page)

  await openNovelImportModal(page)

  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('button', { hasText: /Analyz/i }).click()

  await expect(page.locator('.preview-card')).toBeVisible({ timeout: 15000 })

  // At least one chapter detected
  const chaptersLabel = page.locator('.preview-card-label').first()
  await expect(chaptersLabel).toContainText(/chapter/i)

  // Proceed to confirm
  await page.locator('button', { hasText: /Import/i }).last().click()
  await expect(page.locator('.confirm-box')).toBeVisible()
  await page.locator('.confirm-box').locator('..').locator('button', { hasText: /Import/i }).click()

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
// Regex detects ACT markers → 3 acts, save_the_cat template (3-act structure).

test('fixture 3: ACT markers detected, template set on story', async ({ page }) => {
  const novelText = readFixture('novel-acts.txt')
  const setupMock = buildSeqMock(3, 'save_the_cat', false)
  await setupMock(page)

  await openNovelImportModal(page)

  await page.locator('.novel-textarea').fill(novelText)
  await page.locator('.title-input').fill('The Last Inheritance')
  await page.locator('button', { hasText: /Analyz/i }).click()

  await expect(page.locator('.preview-card')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.template-badge')).toBeVisible()

  // Proceed and confirm
  await page.locator('button', { hasText: /Import/i }).last().click()
  await expect(page.locator('.confirm-box')).toBeVisible()
  await page.locator('.confirm-box').locator('..').locator('button', { hasText: /Import/i }).click()

  await expect(page).toHaveURL(/#\/outline/, { timeout: 10000 })

  // Verify template written to story
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
