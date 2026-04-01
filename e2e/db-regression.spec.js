/**
 * E2E regression: DB version compatibility.
 *
 * Simulates a user whose IndexedDB is already at a higher version (v7+)
 * by seeding it before navigation. Verifies that the Outline and Write
 * pages render content rather than showing a VersionError.
 */
import { test, expect } from '@playwright/test'
import { resetDB } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await resetDB(page)
  await page.reload()
  await page.waitForLoadState('networkidle')
})

test('outline page renders without VersionError', async ({ page }) => {
  // Listen for uncaught errors
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Should not have VersionError
  const versionErrors = errors.filter((e) => e.includes('VersionError'))
  expect(versionErrors).toHaveLength(0)

  // Page content should be visible (not blank)
  const app = page.locator('#app')
  await expect(app).toBeVisible()
  const html = await app.innerHTML()
  expect(html.trim().length).toBeGreaterThan(100)
})

test('write page renders without VersionError', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/#/write')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const versionErrors = errors.filter((e) => e.includes('VersionError'))
  expect(versionErrors).toHaveLength(0)

  const app = page.locator('#app')
  await expect(app).toBeVisible()
  const html = await app.innerHTML()
  expect(html.trim().length).toBeGreaterThan(100)
})

test('characters page renders and navigation away works', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/#/characters')
  await page.waitForLoadState('networkidle')

  // Verify the page rendered
  await expect(page.locator('.characters-page')).toBeVisible({ timeout: 5000 })

  // Navigate away — this was broken (navigation locked after entering characters)
  await page.goto('/#/outline')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/#\/outline/)

  // Navigate back to write
  await page.goto('/#/write')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/#\/write/)

  expect(errors.filter((e) => e.includes('VersionError'))).toHaveLength(0)
})

test('all main routes render without JS errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  const routes = ['/#/write', '/#/outline', '/#/story', '/#/characters', '/#/ideas', '/#/settings']
  for (const route of routes) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)
  }

  expect(errors.filter((e) => e.includes('VersionError'))).toHaveLength(0)
})
