/**
 * E2E tests for multi-story workflow.
 *
 * Tests:
 *   - Create a second story via the story switcher — a new story becomes active
 *   - Switch between two stories — chapter data is isolated per story
 */
import { test, expect } from '@playwright/test'
import { resetDB, seedStory } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetDB(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
})

test('create a second story via story switcher — new story becomes active', async ({ page }) => {
  await seedStory(page, { title: 'First Story' })

  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')

  // Record the current story ID before creating a new one
  const originalId = await page.evaluate(() => localStorage.getItem('inkflow_current_story_id'))

  // Open the story switcher
  await page.locator('.sidebar-section-title-btn').first().click()
  await expect(page.locator('[aria-label="Switch story"]')).toBeVisible({ timeout: 5000 })

  // Click "New story"
  await page.locator('[aria-label="Switch story"]').locator('button', { hasText: /new story/i }).click()

  // Modal should close after creation
  await expect(page.locator('[aria-label="Switch story"]')).not.toBeVisible({ timeout: 5000 })

  // The active story ID in localStorage must have changed — a different story is now current
  await page.waitForFunction(
    (orig) => localStorage.getItem('inkflow_current_story_id') !== orig,
    originalId,
    { timeout: 5000 }
  )

  // The story switcher should now list at least 2 stories
  await page.locator('.sidebar-section-title-btn').first().click()
  await expect(page.locator('[aria-label="Switch story"]')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.story-item').nth(1)).toBeVisible()
  // Close the switcher
  await page.locator('[aria-label="Switch story"]').locator('button', { hasText: /×|close/i }).click().catch(() =>
    page.keyboard.press('Escape')
  )
})

test('switch between stories — chapters are isolated per story', async ({ page }) => {
  // Seed story 1 with a chapter
  const story1Id = await seedStory(page, { title: 'Story Alpha' })
  await page.evaluate(async (storyId) => {
    await window.__inkflow_db.chapters.add({
      id: crypto.randomUUID(), storyId, title: 'Alpha Chapter', order: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  }, story1Id)

  // Seed story 2 directly into DB with its own chapter
  const story2Id = await page.evaluate(async () => {
    const id = crypto.randomUUID()
    await window.__inkflow_db.stories.add({
      id, oneSentence: 'Story Beta', template: 'snowflake', templateFields: {},
      createdAt: Date.now(), updatedAt: Date.now(),
    })
    await window.__inkflow_db.chapters.add({
      id: crypto.randomUUID(), storyId: id, title: 'Beta Chapter', order: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
    return id
  })

  // Full reload so Pinia picks up both stories from DB
  await page.reload()
  await page.waitForLoadState('networkidle')

  // Story 1 is current — its outline shows Alpha Chapter
  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Alpha Chapter' })
  ).toBeVisible({ timeout: 8000 })
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Beta Chapter' })
  ).not.toBeVisible()

  // Switch to story 2 via the story switcher
  await page.locator('.sidebar-section-title-btn').first().click()
  await expect(page.locator('[aria-label="Switch story"]')).toBeVisible({ timeout: 5000 })
  await page.locator('.story-item').filter({ hasText: 'Story Beta' }).click()
  await expect(page.locator('[aria-label="Switch story"]')).not.toBeVisible({ timeout: 3000 })

  // Navigate to outline — should now show Beta Chapter only
  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Beta Chapter' })
  ).toBeVisible({ timeout: 8000 })
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Alpha Chapter' })
  ).not.toBeVisible()
})
