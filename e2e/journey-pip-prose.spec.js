/**
 * User Journey: Pip Phase 5 — Scene Prose Awareness & Generation
 *
 * Journey F — Writer opens a scene in the editor and asks Pip to generate
 * the prose. Pip responds with a generate_prose action chip. After confirming,
 * the generated prose appears immediately in the scene editor textarea.
 *
 * This tests the full chain:
 *   Pip chat → <pip-action>{"type":"generate_prose"} → Save chip
 *   → generateSceneProse() → inkflow-prose-generated event
 *   → SceneEditorView updates textarea
 */
import { test, expect } from '@playwright/test';
import { resetDB, seedStory } from './helpers.js';

async function seedSceneWithContent(page, storyId, { content = '' } = {}) {
  return page.evaluate(
    async ({ storyId, content }) => {
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
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return sceneId;
    },
    { storyId, content }
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await resetDB(page);
  await page.reload();
  await page.waitForLoadState('networkidle');
});

// ─── Journey F ────────────────────────────────────────────────────────────────
test('Journey F: Pip generates prose via action chip → prose appears in scene editor', async ({
  page,
}) => {
  const GENERATED_PROSE = 'The stars burned cold above the abandoned station.';
  const PIP_RESPONSE = "I'll write that scene right now!\n<pip-action>{\"type\":\"generate_prose\"}</pip-action>";

  const storyId = await seedStory(page, { title: 'Space Opera' });
  const sceneId = await seedSceneWithContent(page, storyId);

  // Route Gemini calls by URL:
  //   streamGenerateContent → Pip chat SSE (streaming path)
  //   generateContent       → generateSceneProse (non-streaming)
  await page.route('**/v1beta/models/**', (route) => {
    const isStreaming = route.request().url().includes('streamGenerateContent');
    if (isStreaming) {
      // Pip chat uses streaming — return SSE with the action
      const sseChunk = JSON.stringify({
        candidates: [{ content: { parts: [{ text: PIP_RESPONSE }] } }],
      });
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: `data: ${sseChunk}\n\n`,
      });
    } else {
      // generateSceneProse uses non-streaming generateContent
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{ content: { parts: [{ text: GENERATED_PROSE }] } }],
        }),
      });
    }
  });

  // Also intercept OpenAI-compatible endpoint (in case provider differs)
  const oaiSSE = (text) =>
    [
      `data: {"choices":[{"delta":{"role":"assistant","content":${JSON.stringify(text)}},"finish_reason":null}]}`,
      `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}`,
      'data: [DONE]',
    ].join('\n\n');
  await page.route('**/v1/chat/completions', (route) => {
    // OpenAI path: the second call (prose generation) will be a POST without SSE header expectation,
    // but both go through the same intercept — use the prose text for the second call
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: oaiSSE(PIP_RESPONSE),
    });
  });

  await page.goto(`/#/write/${sceneId}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.prose-textarea')).toBeVisible();

  // Open Pip and ask to write the scene
  await page.getByRole('button', { name: /open pip chat/i }).click();
  const input = page.getByPlaceholder(/talk to pip/i);
  await input.fill('Write this scene for me');
  await input.press('Enter');

  // Pip should respond with a message containing the generate_prose action chip
  await expect(
    page.locator('.otter-msg--assistant .otter-bubble').filter({ hasText: "I'll write that scene" })
  ).toBeVisible({ timeout: 15_000 });

  // The pending action chip should show "Generate scene prose"
  await expect(
    page.locator('.otter-action-pending-label').filter({ hasText: 'Generate scene prose' })
  ).toBeVisible({ timeout: 5_000 });

  // Confirm the action
  await page.locator('.otter-action-btn--save').first().click();

  // Wait for ✓ applied chip
  await expect(
    page.locator('.otter-action-chip').filter({ hasText: /✓/ })
  ).toBeVisible({ timeout: 15_000 });

  // Generated prose must appear in the editor textarea
  await expect(page.locator('.prose-textarea')).toHaveValue(GENERATED_PROSE, {
    timeout: 10_000,
  });
});
