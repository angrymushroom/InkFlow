/**
 * User Journey C: Manual writing workflow
 *
 * A writer starts with an empty story and goes through the core manual
 * writing workflow entirely via the UI — no Pip involved:
 *
 *   Outline page: create chapter → create scene
 *   → click "Write this scene"
 *   → Scene editor: type prose → save
 *   → Return to outline: scene status indicator shows "written"
 *
 * This journey tests the cross-view data flow:
 *   addChapter/addScene DB write → navigate to scene editor
 *   → updateScene (prose) DB write → outline view reflects written state
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('Journey C: Create chapter + scene via outline, write prose, verify written status', async ({ page }) => {
  await seedStory(page, { title: 'My Novel' });

  // ── Step 1: Create a chapter via the Outline page ────────────────────────
  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /new chapter/i }).first().click();
  const chapterInput = page.getByPlaceholder(/chapter title/i);
  await expect(chapterInput).toBeVisible({ timeout: 3000 });
  await chapterInput.fill('Part One: The Setup');
  await page.getByRole('button', { name: /^add$/i }).click();

  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Part One: The Setup' })
  ).toBeVisible({ timeout: 5000 });

  // ── Step 2: Add a scene to that chapter ─────────────────────────────────
  await page.locator('[title="Add scene"]').first().click();
  const sceneInput = page.getByPlaceholder(/scene title/i);
  await expect(sceneInput).toBeVisible({ timeout: 3000 });
  await sceneInput.fill('The Arrival');
  await page.getByRole('button', { name: /^add$/i }).click();

  await expect(
    page.locator('.outline-scene-title').filter({ hasText: 'The Arrival' })
  ).toBeVisible({ timeout: 5000 });

  // ── Step 3: Click "Write scene" to navigate to scene editor ─────────────
  await page.locator('.outline-scene-row').filter({ hasText: 'The Arrival' })
    .getByRole('link', { name: /write/i }).click();
  await page.waitForLoadState('networkidle');

  // Verify we're now in the scene editor (prose textarea loads)
  const prose = page.locator('.prose-textarea');
  await expect(prose).toBeVisible({ timeout: 8000 });

  // ── Step 4: Write prose and verify word count ────────────────────────────
  const proseText = 'The train pulled into the station just as the clock struck midnight. She stepped onto the platform, bags in hand, heart racing.';
  await prose.fill(proseText);

  // Word count should reflect typed words (more than 0)
  await expect(page.locator('.word-count')).not.toContainText('0');
  await expect(page.locator('.word-count')).toContainText('22');

  // ── Step 5: Save and navigate back to outline ────────────────────────────
  await page.getByRole('button', { name: /^save$/i }).click();

  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');

  // The scene's status indicator should now show "written" (has content)
  await expect(
    page.locator('.outline-scene-row').filter({ hasText: 'The Arrival' })
      .locator('.scene-status-indicator--written')
  ).toBeVisible({ timeout: 5000 });
});
