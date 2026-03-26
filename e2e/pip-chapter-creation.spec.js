/**
 * E2E tests for Pip (OtterChat) action flow.
 *
 * Core scenario being tested:
 *   User sends message → Pip AI returns <pip-action> tag → action chip appears as "pending"
 *   → user clicks "Save" → applySingleAction writes to DB
 *   → dispatchEvent('inkflow-outline-changed') → sidebar reloads → UI shows new data
 *
 * If the event dispatch is broken, the sidebar assertion will time-out and CI fails.
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory, mockAiResponse } from './helpers.js';

async function seedSceneEditor(page, storyId) {
  return page.evaluate(async (storyId) => {
    const db = window.__inkflow_db;
    const chapId = crypto.randomUUID();
    const sceneId = crypto.randomUUID();
    await db.chapters.add({
      id: chapId,
      storyId,
      title: 'Act One',
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

test('Pip creates a chapter via chat — sidebar shows new chapter after Save', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'My Test Novel' });
  const sceneId = await seedSceneEditor(page, storyId);

  await mockAiResponse(
    page,
    'Great idea!\n<pip-action>{"type":"add_chapter","title":"Act Two"}</pip-action>'
  );

  await page.goto(`/#/write/scene/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Open Pip and send message
  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Add a chapter called Act Two');
  await input.press('Enter');

  // Wait for AI response (the assistant bubble)
  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: 'Great idea!' })
  ).toBeVisible({ timeout: 15_000 });

  // Confirm the pending action by clicking Save
  await page.locator('.otter-action-btn--save').first().click();

  // Wait for the action chip to flip to "applied" state (✓)
  await expect(page.locator('.otter-action-chip').filter({ hasText: /✓/ })).toBeVisible({
    timeout: 5_000,
  });

  // KEY ASSERTION: sidebar must now show "Act Two" in a .sidebar-chapter element
  // The chapter renders as "Chapter 2: Act Two" via the sidebar.chapterNum i18n key
  await expect(
    page.locator('.sidebar-chapter').filter({ hasText: 'Act Two' })
  ).toBeVisible({ timeout: 5_000 });
});

test('Pip creates a scene via chat — outline view shows new scene after Save', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'My Test Novel' });
  const sceneId = await seedSceneEditor(page, storyId);

  await mockAiResponse(
    page,
    'Adding the new scene.\n<pip-action>{"type":"add_scene","title":"The Confrontation","chapter_title_match":"Act One"}</pip-action>'
  );

  await page.goto(`/#/write/scene/${sceneId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Add a scene called The Confrontation to Act One');
  await input.press('Enter');

  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: 'Adding the new scene.' })
  ).toBeVisible({ timeout: 15_000 });

  await page.locator('.otter-action-btn--save').first().click();

  await expect(page.locator('.otter-action-chip').filter({ hasText: /✓/ })).toBeVisible({
    timeout: 5_000,
  });

  // Navigate to outline and verify the new scene appears in the scene title span
  await page.goto('/#/outline');
  await expect(
    page.locator('.outline-scene-title').filter({ hasText: 'The Confrontation' })
  ).toBeVisible({ timeout: 5_000 });
});

test('Pip creates a character via chat — characters page shows Alice after Save', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'My Test Novel' });
  const sceneId = await seedSceneEditor(page, storyId);

  await mockAiResponse(
    page,
    'Adding Alice.\n<pip-action>{"type":"upsert_character","name":"Alice","fields":{"oneSentence":"The brave hero."}}</pip-action>'
  );

  await page.goto(`/#/write/scene/${sceneId}`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Add a character named Alice');
  await input.press('Enter');

  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: 'Adding Alice.' })
  ).toBeVisible({ timeout: 15_000 });

  await page.locator('.otter-action-btn--save').first().click();

  await expect(page.locator('.otter-action-chip').filter({ hasText: /✓/ })).toBeVisible({
    timeout: 5_000,
  });

  // Navigate to characters view and verify Alice appears in a .char-name element.
  // We scope to .char-name so the Pip chat bubbles (still in DOM) don't cause a strict-mode violation.
  await page.goto('/#/characters');
  await expect(page.locator('.char-name').filter({ hasText: 'Alice' })).toBeVisible({
    timeout: 5_000,
  });
});
