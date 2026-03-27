/**
 * User Journey D: Pip creates a detailed character → Characters page shows full details
 *
 * A writer asks Pip to create a character with rich detail fields
 * (name, one-sentence role, goal, motivation). After saving the Pip action,
 * they navigate to the Characters page and verify the character appears
 * with its details correctly persisted.
 *
 * This tests the upsert_character action path with field data — more thorough
 * than the smoke test in pip-chapter-creation.spec.js which only checks the name.
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory, mockAiResponse } from './helpers.js';

async function seedSceneEditor(page, storyId) {
  return page.evaluate(async (storyId) => {
    const db = window.__inkflow_db;
    const chapId = crypto.randomUUID();
    const sceneId = crypto.randomUUID();
    await db.chapters.add({
      id: chapId, storyId, title: 'Chapter One', order: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    await db.scenes.add({
      id: sceneId, chapterId: chapId, storyId, title: 'Opening Scene', order: 0,
      content: '', createdAt: Date.now(), updatedAt: Date.now(),
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

test('Journey D: Pip creates character with details → Characters page shows full profile', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'The Long Game' });
  const sceneId = await seedSceneEditor(page, storyId);

  // Mock AI to return a detailed upsert_character action
  await mockAiResponse(
    page,
    'Created your character!\n<pip-action>{"type":"upsert_character","name":"Marcus Webb","fields":{"oneSentence":"A disgraced detective who never gave up on the case that ended his career","goal":"Uncover who framed him and clear his name","motivation":"His daughter still believes in him"}}</pip-action>'
  );

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Open Pip and request character creation
  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Create a character: Marcus Webb, disgraced detective trying to clear his name');
  await input.press('Enter');

  // Wait for Pip response
  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: 'Created your character' })
  ).toBeVisible({ timeout: 15_000 });

  // Save the action
  await page.locator('.otter-action-btn--save').first().click();
  await expect(page.locator('.otter-action-chip').filter({ hasText: /✓/ })).toBeVisible({
    timeout: 5_000,
  });

  // Navigate to Characters page
  await page.goto('/#/characters');
  await page.waitForLoadState('networkidle');

  // Character name must appear
  await expect(
    page.locator('.char-name').filter({ hasText: 'Marcus Webb' })
  ).toBeVisible({ timeout: 5000 });

  // Character's one-sentence role must also be persisted (.char-one-sentence in CharactersView)
  await expect(
    page.locator('.char-one-sentence').filter({ hasText: 'disgraced detective' })
  ).toBeVisible({ timeout: 5000 });
});
