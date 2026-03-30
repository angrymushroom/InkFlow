/**
 * E2E tests for the Characters page (/characters) — direct UI interactions.
 *
 * Distinct from the Pip character tests (pip-chapter-creation, journey-pip-character),
 * which create characters via AI chat. These tests use the form directly.
 *
 * Tests:
 *   - Create a character via the "New character" button + form
 *   - Character persists after reload
 *   - Edit an existing character's fields and save
 */
import { test, expect } from '@playwright/test'
import { resetDB, seedStory } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetDB(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
})

test('create a character via form — name appears in list and persists', async ({ page }) => {
  await seedStory(page)

  await page.goto('/#/characters')
  await page.waitForLoadState('networkidle')

  // Click "New character"
  await page.locator('.chars-new-btn').click()

  // Fill name and one-sentence role
  await page.getByPlaceholder(/character name/i).fill('Elena Voss')
  await page.getByPlaceholder(/this character in one sentence/i).fill('A rogue archivist who knows too much.')

  // When creating a new character the button says "Add" (t('ideas.add'))
  await page.locator('.form-actions .btn-primary').click()

  // Name should appear in the character list
  await expect(
    page.locator('.char-name').filter({ hasText: 'Elena Voss' })
  ).toBeVisible({ timeout: 5000 })

  // Reload and verify persistence
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.char-name').filter({ hasText: 'Elena Voss' })
  ).toBeVisible({ timeout: 8000 })
})

test('edit an existing character — changes persist after reload', async ({ page }) => {
  await seedStory(page)

  // Seed a character directly
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const storyId = localStorage.getItem('inkflow_current_story_id')
    await window.__inkflow_db.characters.add({
      id: crypto.randomUUID(), storyId, name: 'Old Name', oneSentence: '',
      goal: '', motivation: '', conflict: '', epiphany: '',
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  })

  // Reload so the characters store picks up the seeded data
  await page.reload()
  await page.waitForLoadState('networkidle')

  await page.goto('/#/characters')
  await page.waitForLoadState('networkidle')

  // Select the character to open the edit form
  await page.locator('.char-list-item').filter({ hasText: 'Old Name' }).click()

  // Change the name — when editing, the button says "Save" (t('ideas.save'))
  const nameInput = page.getByPlaceholder(/character name/i)
  await expect(nameInput).toHaveValue('Old Name', { timeout: 5000 })
  await nameInput.click({ clickCount: 3 })
  await nameInput.fill('New Name')

  await page.locator('.form-actions .btn-primary').click()

  // Updated name should appear in list
  await expect(
    page.locator('.char-name').filter({ hasText: 'New Name' })
  ).toBeVisible({ timeout: 5000 })
  await expect(
    page.locator('.char-name').filter({ hasText: 'Old Name' })
  ).not.toBeVisible()

  // Reload and verify
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.char-name').filter({ hasText: 'New Name' })
  ).toBeVisible({ timeout: 8000 })
})
