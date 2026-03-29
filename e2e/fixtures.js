/**
 * Extended Playwright fixtures for InkFlow E2E tests.
 *
 * Provides a `page` fixture that:
 *  - Collects uncaught JS errors during the test
 *  - Fails the test if any pageerror was emitted (runtime crash / CSP block)
 */
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const jsErrors = [];

    page.on('pageerror', (err) => {
      jsErrors.push(err.message);
    });

    await use(page);

    // After the test body finishes, fail if any uncaught JS error was thrown.
    // This catches blank-page scenarios caused by CSP blocks, import errors, etc.
    if (jsErrors.length > 0) {
      throw new Error(
        `Uncaught JS error(s) during "${testInfo.title}":\n  • ${jsErrors.join('\n  • ')}`
      );
    }
  },
});

export { expect };
