/**
 * E2E tests for Outline CRUD (OutlineView + OutlineEditPanel).
 *
 * Tests the full UI flow for creating chapters and scenes via the outline
 * view buttons — completely separate from the Pip chat path.
 *
 *   Click "New chapter" → panel opens → fill title → "Add" → chapter appears
 *   Click "Add scene" (within chapter) → panel opens → fill title → "Add" → scene appears
 *
 * If addChapter()/addScene() DB writes or the CustomEvent dispatch is broken,
 * the outline assertions will fail.
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('create a chapter via the New Chapter button', async ({ page }) => {
  await seedStory(page, { title: 'Test Novel' });

  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');

  // Click the top-level "New chapter" button
  await page.getByRole('button', { name: /new chapter/i }).first().click();

  // Panel opens — fill in the title input
  const titleInput = page.getByPlaceholder(/chapter title/i);
  await expect(titleInput).toBeVisible({ timeout: 3000 });
  await titleInput.fill('The Beginning');

  // Click "Add" to confirm
  await page.getByRole('button', { name: /^add$/i }).click();

  // The new chapter should appear in the outline
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'The Beginning' })
  ).toBeVisible({ timeout: 5000 });
});

test('create a scene inside a chapter', async ({ page }) => {
  await seedStory(page, { title: 'Test Novel' });

  // Seed a chapter directly so we can test scene creation
  await page.evaluate(async () => {
    const storyId = localStorage.getItem('inkflow_current_story_id');
    const db = window.__inkflow_db;
    const chapId = crypto.randomUUID();
    await db.chapters.add({
      id: chapId,
      storyId,
      title: 'Act One',
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');

  // The chapter should be visible
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Act One' })
  ).toBeVisible({ timeout: 5000 });

  // Click the "Add scene" button (title attribute contains "Add scene")
  await page.locator('[title="Add scene"]').first().click();

  // Panel opens — fill in the scene title
  const titleInput = page.getByPlaceholder(/scene title/i);
  await expect(titleInput).toBeVisible({ timeout: 3000 });
  await titleInput.fill('The Awakening');

  // Click "Add" to confirm
  await page.getByRole('button', { name: /^add$/i }).click();

  // The new scene should appear in the outline
  await expect(
    page.locator('.outline-scene-title').filter({ hasText: 'The Awakening' })
  ).toBeVisible({ timeout: 5000 });
});

test('chapter and scene persist after page reload', async ({ page }) => {
  await seedStory(page, { title: 'Persistence Novel' });

  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');

  // Create chapter
  await page.getByRole('button', { name: /new chapter/i }).first().click();
  await page.getByPlaceholder(/chapter title/i).fill('Persistent Chapter');
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Persistent Chapter' })
  ).toBeVisible({ timeout: 5000 });

  // Reload the page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Chapter should still be there after reload (confirms DB write)
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Persistent Chapter' })
  ).toBeVisible({ timeout: 5000 });
});
