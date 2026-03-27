/**
 * E2E tests for the Scene Editor (SceneEditorView).
 *
 * Tests the core writing loop:
 *   User types prose → live word count updates
 *   → Save (manual or auto-save) → reload → prose is still there
 *
 * Also tests the Pip chat open button exists (integration smoke test).
 *
 * If DB write of scene content is broken, the reload assertion fails.
 * If countWords() is broken, the word count assertion fails.
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory } from './helpers.js';

async function seedSceneEditor(page, storyId) {
  return page.evaluate(async (storyId) => {
    const db = window.__inkflow_db;
    const chapId = crypto.randomUUID();
    const sceneId = crypto.randomUUID();
    await db.chapters.add({
      id: chapId,
      storyId,
      title: 'Chapter One',
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.scenes.add({
      id: sceneId,
      chapterId: chapId,
      storyId,
      title: 'Opening Scene',
      order: 0,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return sceneId;
  }, storyId);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('prose typing updates live word count', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'Writing Test' });
  const sceneId = await seedSceneEditor(page, storyId);

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Wait for scene to load from Dexie (async, not covered by networkidle)
  const prose = page.locator('.prose-textarea');
  await expect(prose).toBeVisible({ timeout: 8000 });

  // Word count should start at 0 words
  const wordCount = page.locator('.word-count');
  await expect(wordCount).toContainText('0');
  await prose.click();
  await prose.fill('The old clock tower struck midnight as fog rolled in from the sea.');

  // Word count should update (13 words)
  await expect(wordCount).not.toContainText('0');
  await expect(wordCount).toContainText('13');
});

test('scene prose persists after manual save and reload', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'Persistence Test' });
  const sceneId = await seedSceneEditor(page, storyId);

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Wait for scene to load from Dexie
  const prose = page.locator('.prose-textarea');
  await expect(prose).toBeVisible({ timeout: 8000 });
  const testContent = 'She opened the letter and her hands began to tremble.';
  await prose.click();
  await prose.fill(testContent);

  // Click Save
  await page.getByRole('button', { name: /^save$/i }).click();

  // Reload and verify content persisted
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.prose-textarea')).toHaveValue(testContent);
});

test('scene editor loads existing content', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'Preloaded Test' });

  // Seed a scene with existing content
  const sceneId = await page.evaluate(async (storyId) => {
    const db = window.__inkflow_db;
    const chapId = crypto.randomUUID();
    const sceneId = crypto.randomUUID();
    await db.chapters.add({
      id: chapId,
      storyId,
      title: 'Chapter One',
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.scenes.add({
      id: sceneId,
      chapterId: chapId,
      storyId,
      title: 'Scene with Content',
      order: 0,
      content: 'Rain drummed against the window. She waited.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return sceneId;
  }, storyId);

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Wait for scene to load from Dexie, then verify pre-loaded content
  await expect(page.locator('.prose-textarea')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.prose-textarea')).toHaveValue(
    'Rain drummed against the window. She waited.'
  );

  // Word count should reflect existing content (7 words)
  await expect(page.locator('.word-count')).toContainText('7');
});

test('Pip chat button is present in scene editor', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'Pip Smoke Test' });
  const sceneId = await seedSceneEditor(page, storyId);

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // The Pip chat open button must exist (core UI element)
  await expect(
    page.getByRole('button', { name: /open pip chat/i })
  ).toBeVisible({ timeout: 5000 });
});
