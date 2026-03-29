/**
 * Smoke tests: verify every main route renders under the production CSP.
 *
 * These tests exist specifically to catch blank-page regressions caused by:
 *  - CSP violations (unsafe-eval, blocked resources)
 *  - Runtime JS crashes on mount
 *  - Missing imports / chunk load failures
 *
 * They use the custom `test` fixture from fixtures.js which auto-fails
 * on any uncaught JS error, and assertPageRendered() to confirm real DOM output.
 */
import { test, expect } from './fixtures.js';
import { resetDB, assertPageRendered } from './helpers.js';

const ROUTES = [
  { path: '/', name: 'Write (home)' },
  { path: '/#/story', name: 'Story' },
  { path: '/#/outline', name: 'Outline' },
  { path: '/#/characters', name: 'Characters' },
  { path: '/#/ideas', name: 'Ideas' },
  { path: '/#/settings', name: 'Settings' },
  { path: '/#/export', name: 'Export' },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

for (const { path, name } of ROUTES) {
  test(`${name} route renders without blank page or JS error`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await assertPageRendered(page);

    // Confirm the nav is visible — proves the shell rendered
    await expect(page.locator('.nav')).toBeVisible();
  });
}
