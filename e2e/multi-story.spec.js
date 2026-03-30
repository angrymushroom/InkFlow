/**
 * E2E tests for multi-story workflow.
 *
 * Tests:
 *   - Create a second story via the story switcher
 *   - Switch between two stories — data is isolated per story
 *   - Active story badge shows on the current story
 */
import { test, expect } from '@playwright/test'
import { resetDB, seedStory } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetDB(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
})

test('create a second story via story switcher', async ({ page }) => {
  await seedStory(page, { title: 'First Story' })

  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')

  // Open the story switcher by clicking the story section title in the sidebar
  await page.locator('.sidebar-section-title-btn').first().click()
  await expect(page.locator('[aria-label="Switch story"]')).toBeVisible({ timeout: 5000 })

  // Click "New story" in the modal footer
  await page.locator('[aria-label="Switch story"]').locator('button', { hasText: /new story/i }).click()

  // Modal should close and a new (empty) story is now active
  await expect(page.locator('[aria-label="Switch story"]')).not.toBeVisible({ timeout: 3000 })

  // The sidebar should show the new story (empty title = unnamed)
  // Navigate to story page and confirm it's blank (new story)
  await page.goto('/#/story')
  await page.waitForLoadState('networkidle')
  await expect(page.getByPlaceholder(/who, what, stakes/i)).toHaveValue('', { timeout: 5000 })
})

test('switch between stories — data is isolated', async ({ page }) => {
  // Seed two stories with different chapters
  const story1Id = await seedStory(page, { title: 'Story Alpha' })
  const story2Id = await page.evaluate(async () => {
    const db = window.__inkflow_db
    const id = crypto.randomUUID()
    await db.stories.add({
      id, oneSentence: 'Story Beta', template: 'snowflake', templateFields: {},
      createdAt: Date.now(), updatedAt: Date.now(),
    })
    return id
  })

  // Add a chapter to story 1
  await page.evaluate(async (storyId) => {
    await window.__inkflow_db.chapters.add({
      id: crypto.randomUUID(), storyId, title: 'Alpha Chapter', order: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  }, story1Id)

  // Add a chapter to story 2
  await page.evaluate(async (storyId) => {
    await window.__inkflow_db.chapters.add({
      id: crypto.randomUUID(), storyId, title: 'Beta Chapter', order: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  }, story2Id)

  // Verify story 1 (current) outline shows Alpha Chapter
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

  // Story switcher should close
  await expect(page.locator('[aria-label="Switch story"]')).not.toBeVisible({ timeout: 3000 })

  // Navigate to outline — should now show Beta Chapter
  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Beta Chapter' })
  ).toBeVisible({ timeout: 8000 })
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Alpha Chapter' })
  ).not.toBeVisible()
})
