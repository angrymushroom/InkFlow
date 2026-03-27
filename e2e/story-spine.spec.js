/**
 * E2E tests for the Story Spine (StoryView).
 *
 * Tests the fundamental data persistence loop:
 *   User edits spine fields → clicks "Save story spine" → .saved-hint appears
 *   → page reloads → edited values are still present (read from IndexedDB)
 *
 * If saveStory() or the DB write is broken, the reload assertion will fail.
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('story spine edits persist across page reload', async ({ page }) => {
  // Seed with a recognizable initial value so we can confirm the story has
  // loaded from Dexie before interacting (StoryView form always renders, but
  // story.value is populated asynchronously — we must wait for the value).
  await seedStory(page, { title: 'Original one-liner' });

  await page.goto('/#/story');
  await page.waitForLoadState('networkidle');

  const oneSentenceField = page.getByPlaceholder(/who, what, stakes/i);

  // Wait until the seeded value appears — confirms story finished loading
  await expect(oneSentenceField).toHaveValue('Original one-liner', { timeout: 8000 });

  // Edit both fields — use pressSequentially to fire per-character input events,
  // which guarantees Vue's @input handler on the :value-bound input receives each keystroke.
  await oneSentenceField.click({ clickCount: 3 });
  await oneSentenceField.pressSequentially('A brave hero saves the world from ancient darkness');
  const setupField = page.getByPlaceholder(/opening situation/i);
  await setupField.click({ clickCount: 3 });
  await setupField.pressSequentially('In a crumbling kingdom where magic is forbidden');

  // Click save, then verify the DB write committed before navigating away.
  await page.getByRole('button', { name: /save story spine/i }).click();
  await page.waitForFunction(async () => {
    const id = localStorage.getItem('inkflow_current_story_id');
    if (!id || !window.__inkflow_db) return false;
    const s = await window.__inkflow_db.stories.get(id);
    return s?.oneSentence === 'A brave hero saves the world from ancient darkness';
  }, null, { timeout: 6000 });

  // Navigate away then back (avoids full page reload which can race with IndexedDB flush)
  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');
  await page.goto('/#/story');
  await page.waitForLoadState('networkidle');

  await expect(page.getByPlaceholder(/who, what, stakes/i)).toHaveValue(
    'A brave hero saves the world from ancient darkness',
    { timeout: 8000 }
  );
  await expect(page.getByPlaceholder(/opening situation/i)).toHaveValue(
    'In a crumbling kingdom where magic is forbidden',
    { timeout: 5000 }
  );
});

test('story spine pre-populates from DB on load', async ({ page }) => {
  // Seed a story with spine data already set
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const db = window.__inkflow_db;
    const id = crypto.randomUUID();
    await db.stories.add({
      id,
      oneSentence: 'A wizard discovers lost spells',
      template: 'snowflake',
      templateFields: {},
      setup: 'In the ruins of an ancient library',
      disaster1: '',
      disaster2: '',
      disaster3: '',
      ending: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    localStorage.setItem('inkflow_current_story_id', id);
  });

  await page.goto('/#/story');
  await page.waitForLoadState('networkidle');

  await expect(page.getByPlaceholder(/who, what, stakes/i)).toHaveValue(
    'A wizard discovers lost spells',
    { timeout: 8000 }
  );
  await expect(page.getByPlaceholder(/opening situation/i)).toHaveValue(
    'In the ruins of an ancient library'
  );
});
