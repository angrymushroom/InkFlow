/**
 * User Journey E: Build story content then export full JSON backup
 *
 * A writer has created chapters and scenes in their story. They go to
 * Settings and download a JSON backup. The downloaded file must contain
 * all the data: the story, both chapters, and all scenes.
 *
 * This tests the complete exportProject() pipeline and verifies data
 * integrity across all DB tables in one end-to-end assertion.
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory } from './helpers.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

test('Journey E: Export full project JSON contains all chapters and scenes', async ({ page }) => {
  const storyId = await seedStory(page, { title: 'The Grand Saga' });

  // Seed 2 chapters with 3 scenes total (more realistic dataset)
  await page.evaluate(async (storyId) => {
    const db = window.__inkflow_db;

    const chap1Id = crypto.randomUUID();
    const chap2Id = crypto.randomUUID();
    await db.chapters.add({ id: chap1Id, storyId, title: 'Part One', order: 0, createdAt: Date.now(), updatedAt: Date.now() });
    await db.chapters.add({ id: chap2Id, storyId, title: 'Part Two', order: 1, createdAt: Date.now(), updatedAt: Date.now() });

    await db.scenes.add({ id: crypto.randomUUID(), chapterId: chap1Id, storyId, title: 'The Call', order: 0, content: 'It began with a letter.', createdAt: Date.now(), updatedAt: Date.now() });
    await db.scenes.add({ id: crypto.randomUUID(), chapterId: chap1Id, storyId, title: 'The Journey', order: 1, content: '', createdAt: Date.now(), updatedAt: Date.now() });
    await db.scenes.add({ id: crypto.randomUUID(), chapterId: chap2Id, storyId, title: 'The Confrontation', order: 0, content: '', createdAt: Date.now(), updatedAt: Date.now() });
  }, storyId);

  // Navigate to Settings/Export
  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');

  // Trigger download (JSON is default format)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download/i }).click(),
  ]);

  // Save and parse the downloaded file
  const tmpPath = path.join(os.tmpdir(), `inkflow-journey-e-${Date.now()}.json`);
  await download.saveAs(tmpPath);
  const data = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));

  // ── Verify export structure ──────────────────────────────────────────────
  expect(data).toHaveProperty('version');
  expect(data).toHaveProperty('stories');
  expect(data).toHaveProperty('chapters');
  expect(data).toHaveProperty('scenes');

  // Story is present with correct title
  const story = data.stories.find((s) => s.id === storyId);
  expect(story).toBeDefined();
  expect(story.oneSentence).toBe('The Grand Saga');

  // Both chapters exported
  const storyChapters = data.chapters.filter((c) => c.storyId === storyId);
  expect(storyChapters).toHaveLength(2);
  const chapterTitles = storyChapters.map((c) => c.title).sort();
  expect(chapterTitles).toEqual(['Part One', 'Part Two']);

  // All 3 scenes exported
  const storyScenes = data.scenes.filter((s) => s.storyId === storyId);
  expect(storyScenes).toHaveLength(3);
  const sceneTitles = storyScenes.map((s) => s.title).sort();
  expect(sceneTitles).toEqual(['The Call', 'The Confrontation', 'The Journey']);

  // Scene with prose has its content preserved
  const callScene = storyScenes.find((s) => s.title === 'The Call');
  expect(callScene.content).toBe('It began with a letter.');

  // Clean up
  fs.unlinkSync(tmpPath);
});
