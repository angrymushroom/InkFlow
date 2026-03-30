/**
 * E2E tests for the Ideas / Entities page (/ideas).
 *
 * Tests the core ideas workflow:
 *   - Creating a new idea (title + body)
 *   - Idea appears in the list and persists after reload
 *   - Filtering by type shows only matching ideas
 *   - Deleting an idea removes it from the list
 *
 * Zero Pip involvement — all actions are direct UI interactions.
 */
import { test, expect } from '@playwright/test'
import { resetDB, seedStory } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetDB(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
})

test('create an idea — appears in list and persists after reload', async ({ page }) => {
  await seedStory(page)

  await page.goto('/#/ideas')
  await page.waitForLoadState('networkidle')

  // Click "New idea" button
  await page.locator('button', { hasText: /new idea/i }).first().click()

  // Fill the title
  await page.getByPlaceholder(/short title/i).fill('The hidden vault')

  // Fill the body — actual placeholder is "Quick idea..."
  await page.getByPlaceholder(/Quick idea/i).fill('Beneath the old library lies a sealed chamber.')

  // Save — when creating, the button says "Add" (t('ideas.add'))
  await page.locator('button', { hasText: /^add$/i }).click()

  // Idea should appear in the list
  await expect(
    page.locator('.entity-list-item-title').filter({ hasText: 'The hidden vault' })
  ).toBeVisible({ timeout: 5000 })

  // Reload and verify persistence
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(
    page.locator('.entity-list-item-title').filter({ hasText: 'The hidden vault' })
  ).toBeVisible({ timeout: 8000 })
})

test('type filter shows only ideas of that type', async ({ page }) => {
  await seedStory(page)

  // Seed two ideas of different types directly into DB
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const storyId = localStorage.getItem('inkflow_current_story_id')
    await window.__inkflow_db.ideas.bulkAdd([
      { id: crypto.randomUUID(), storyId, title: 'Plot twist', body: '', type: 'plot', createdAt: Date.now(), updatedAt: Date.now() },
      { id: crypto.randomUUID(), storyId, title: 'Magic system', body: '', type: 'worldbuilding', createdAt: Date.now(), updatedAt: Date.now() },
    ])
  })

  // Reload so the ideas store picks up the newly seeded data
  await page.reload()
  await page.waitForLoadState('networkidle')

  await page.goto('/#/ideas')
  await page.waitForLoadState('networkidle')

  // The app auto-selects the first type alphabetically ('plot' comes before 'worldbuilding').
  // So 'Plot twist' is visible and 'Magic system' is not visible initially.
  await expect(page.locator('.entity-list-item-title').filter({ hasText: 'Plot twist' })).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.entity-list-item-title').filter({ hasText: 'Magic system' })).not.toBeVisible()

  // Click the "worldbuilding" filter chip
  await page.locator('.entity-type-btn', { hasText: /worldbuilding/i }).click()

  // Only Magic system should be visible; Plot twist should be hidden
  await expect(page.locator('.entity-list-item-title').filter({ hasText: 'Magic system' })).toBeVisible({ timeout: 3000 })
  await expect(page.locator('.entity-list-item-title').filter({ hasText: 'Plot twist' })).not.toBeVisible()
})

test('delete an idea removes it from the list', async ({ page }) => {
  await seedStory(page)

  // Seed an idea directly
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break
      await new Promise((r) => setTimeout(r, 100))
    }
    const storyId = localStorage.getItem('inkflow_current_story_id')
    await window.__inkflow_db.ideas.add({
      id: crypto.randomUUID(), storyId, title: 'Doomed idea', body: 'Will be deleted.',
      type: 'plot', createdAt: Date.now(), updatedAt: Date.now(),
    })
  })

  // Reload so the store picks up the seeded idea
  await page.reload()
  await page.waitForLoadState('networkidle')

  await page.goto('/#/ideas')
  await page.waitForLoadState('networkidle')

  // Select the idea to open it in the detail panel
  await page.locator('.entity-list-item-title').filter({ hasText: 'Doomed idea' }).click()

  // Click the delete button (🗑 icon button in list item actions)
  const ideaItem = page.locator('.entity-list-item').filter({ hasText: 'Doomed idea' })
  await ideaItem.locator('button', { hasText: /🗑️/ }).click()

  // A ConfirmModal appears — click the danger "Delete" button to confirm
  await page.locator('[role="dialog"] .btn-danger').click()

  // Idea should disappear from list
  await expect(
    page.locator('.entity-list-item-title').filter({ hasText: 'Doomed idea' })
  ).not.toBeVisible({ timeout: 5000 })
})
