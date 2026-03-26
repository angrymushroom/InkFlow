/**
 * E2E smoke tests for basic story creation and navigation.
 */
import { test, expect } from '@playwright/test';
import { resetDB } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('app loads and shows the home/write screen', async ({ page }) => {
  await expect(page).toHaveURL(/\//);
  // The app should render without errors — check the root element exists
  await expect(page.locator('#app')).toBeVisible();
});

test('navigating to /outline route works', async ({ page }) => {
  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');
  // Outline page should render (no crash)
  await expect(page.locator('#app')).toBeVisible();
});

test('navigating to /characters route works', async ({ page }) => {
  await page.goto('/#/characters');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#app')).toBeVisible();
});
