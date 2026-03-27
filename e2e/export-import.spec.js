/**
 * E2E tests for Export and Import (ExportView / Settings page).
 *
 * Tests two critical data-integrity flows:
 *
 * 1. JSON Export: clicking "Download" triggers a file download that contains
 *    the expected story data (validateImportData format).
 *
 * 2. Import round-trip: providing a valid JSON backup via the file input →
 *    confirming the modal → page reloads → story data is accessible.
 *
 * If exportProject() or importProject() DB operations are broken, these tests fail.
 * If the download mechanism (createObjectURL / a.click()) is broken, the first test fails.
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

test('JSON export downloads a file containing story data', async ({ page }) => {
  // Seed a story with a chapter so there is meaningful data to export
  const storyId = await seedStory(page, { title: 'Export Test Novel' });
  await page.evaluate(async (storyId) => {
    const db = window.__inkflow_db;
    await db.chapters.add({
      id: crypto.randomUUID(),
      storyId,
      title: 'Chapter One',
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, storyId);

  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');

  // JSON is the default export format — no need to change the select.
  // Wait for the download, then click the button
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download/i }).click(),
  ]);

  // Save the downloaded file to a temp path and parse it
  const tmpPath = path.join(os.tmpdir(), `inkflow-test-${Date.now()}.json`);
  await download.saveAs(tmpPath);
  const raw = fs.readFileSync(tmpPath, 'utf8');
  const data = JSON.parse(raw);

  // Verify the exported JSON structure
  expect(data).toHaveProperty('version');
  expect(data).toHaveProperty('stories');
  expect(data).toHaveProperty('chapters');
  expect(Array.isArray(data.stories)).toBe(true);
  expect(data.stories.length).toBeGreaterThan(0);

  // Verify our seeded story is in the export
  const exportedStory = data.stories.find((s) => s.id === storyId);
  expect(exportedStory).toBeDefined();
  expect(exportedStory.oneSentence).toBe('Export Test Novel');

  // Verify the chapter is exported
  expect(Array.isArray(data.chapters)).toBe(true);
  const exportedChapter = data.chapters.find((c) => c.storyId === storyId);
  expect(exportedChapter).toBeDefined();
  expect(exportedChapter.title).toBe('Chapter One');

  // Clean up
  fs.unlinkSync(tmpPath);
});

test('import round-trip restores story data', async ({ page }) => {
  // Build a minimal valid backup JSON (same format as exportProject output)
  const storyId = crypto.randomUUID();
  const chapId = crypto.randomUUID();
  const backup = {
    version: 5,
    exportedAt: Date.now(),
    stories: [
      {
        id: storyId,
        oneSentence: 'Imported Novel Title',
        template: 'snowflake',
        templateFields: {},
        setup: '',
        disaster1: '',
        disaster2: '',
        disaster3: '',
        ending: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    chapters: [
      {
        id: chapId,
        storyId,
        title: 'Restored Chapter',
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    scenes: [],
    characters: [],
    ideas: [],
    story_facts: [],
  };

  // Write the backup to a temp file for setInputFiles
  const tmpPath = path.join(os.tmpdir(), `inkflow-import-test-${Date.now()}.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(backup));

  await page.goto('/#/settings');
  await page.waitForLoadState('networkidle');

  // Set the file on the hidden file input
  await page.locator('input[type="file"]').setInputFiles(tmpPath);

  // Confirmation modal should appear — click "Yes, import"
  await expect(page.getByRole('button', { name: /yes, import/i })).toBeVisible({
    timeout: 3000,
  });
  await page.getByRole('button', { name: /yes, import/i }).click();

  // After import, the page reloads automatically (setTimeout 1200ms in doImport)
  await page.waitForLoadState('networkidle');

  // Navigate to outline and verify the imported chapter appears
  await page.goto('/#/outline');
  await page.waitForLoadState('networkidle');
  await expect(
    page.locator('.outline-chapter-title').filter({ hasText: 'Restored Chapter' })
  ).toBeVisible({ timeout: 8000 });

  // Clean up
  fs.unlinkSync(tmpPath);
});
