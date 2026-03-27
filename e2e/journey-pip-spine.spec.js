/**
 * User Journey: Pip updates story spine and scene metadata
 *
 * Journey A — Writer uses Pip to define/update the story's one-sentence summary
 * and setup. After saving, they navigate to the Story page and see the changes.
 *
 * Journey B — Writer uses Pip to add notes to a scene. After saving, they
 * reload the scene editor and see the notes reflected.
 *
 * These journeys test the full chain:
 *   Pip chat → <pip-action> → Save → applySingleAction → DB write
 *   → dispatchEvent → navigate to another view → UI reflects new data
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

// ─── Journey A ────────────────────────────────────────────────────────────────
test('Journey A: Pip updates story spine → Story page shows new values', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'Old one-liner' });
  const sceneId = await seedSceneEditor(page, storyId);

  // Mock AI to return an update_spine action
  await mockAiResponse(
    page,
    'Updated your story spine!\n<pip-action>{"type":"update_spine","fields":{"oneSentence":"A detective uncovers a conspiracy that goes all the way to the top","setup":"A rain-soaked city where nothing is what it seems"}}</pip-action>'
  );

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Open Pip and send the message
  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Update my story spine with a detective mystery premise');
  await input.press('Enter');

  // Wait for assistant response
  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: 'Updated your story spine' })
  ).toBeVisible({ timeout: 15_000 });

  // Save the action
  await page.locator('.otter-action-btn--save').first().click();
  await expect(page.locator('.otter-action-chip').filter({ hasText: /✓/ })).toBeVisible({
    timeout: 5_000,
  });

  // Navigate to the Story page and verify the spine fields updated
  await page.goto('/#/story');
  await page.waitForLoadState('networkidle');

  await expect(page.getByPlaceholder(/who, what, stakes/i)).toHaveValue(
    'A detective uncovers a conspiracy that goes all the way to the top',
    { timeout: 8000 }
  );
  await expect(page.getByPlaceholder(/opening situation/i)).toHaveValue(
    'A rain-soaked city where nothing is what it seems'
  );
});

// ─── Journey B ────────────────────────────────────────────────────────────────
test('Journey B: Pip updates scene notes → Scene editor shows the notes', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'Mystery Novel' });
  const sceneId = await seedSceneEditor(page, storyId);

  // Mock AI to return an update_scene action with notes
  await mockAiResponse(
    page,
    'Added notes to your scene.\n<pip-action>{"type":"update_scene","title_match":"Opening Scene","fields":{"notes":"Remember: the detective finds a glove at minute 10. Foreshadow the rain."}}</pip-action>'
  );

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');

  // Open Pip
  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Add a note to the opening scene about the glove');
  await input.press('Enter');

  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: 'Added notes to your scene' })
  ).toBeVisible({ timeout: 15_000 });

  // Save
  await page.locator('.otter-action-btn--save').first().click();
  await expect(page.locator('.otter-action-chip').filter({ hasText: /✓/ })).toBeVisible({
    timeout: 5_000,
  });

  // Reload the scene editor — scene metadata should show the new notes
  await page.reload();
  await page.waitForLoadState('networkidle');

  // The notes appear in .scene-meta-notes (shown in scene header when not in focus mode)
  await expect(
    page.locator('.scene-meta-notes')
  ).toContainText('glove', { timeout: 8000 });
});
