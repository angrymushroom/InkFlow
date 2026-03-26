/**
 * E2E test helpers for InkFlow
 */

/**
 * Deletes the InkFlow IndexedDB and clears the current story from localStorage.
 * Must be called after page.goto() so Dexie has already opened the DB.
 * Follow with page.reload() so the app re-initializes against a fresh DB.
 */
export async function resetDB(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('InkFlow');
      req.onsuccess = resolve;
      req.onerror = reject;
      req.onblocked = resolve; // treat blocked as success for test purposes
    });
    localStorage.removeItem('inkflow_current_story_id');
    // Set a fake Gemini key so Pip's input is not hidden behind the "no API key" gate.
    // Default provider is "gemini", so getApiKey() reads inkflow_ai_gemini_key.
    // The actual network request is always intercepted by mockAiResponse() / page.route().
    localStorage.setItem('inkflow_ai_gemini_key', 'fake-gemini-key-e2e');
  });
}

/**
 * Seeds a story directly into IndexedDB via window.__inkflow_db.
 * Returns the new storyId and sets it as the current story in localStorage.
 */
export async function seedStory(page, { title = 'Test Story' } = {}) {
  return page.evaluate(async (title) => {
    // Wait up to 2s for the test hook to be available
    for (let i = 0; i < 20; i++) {
      if (window.__inkflow_db) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const db = window.__inkflow_db;
    if (!db) throw new Error('__inkflow_db not available — check src/main.js test hook');

    const id = crypto.randomUUID();
    await db.stories.add({
      id,
      oneSentence: title,
      template: 'snowflake',
      templateFields: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    localStorage.setItem('inkflow_current_story_id', id);
    return id;
  }, title);
}

/**
 * Intercepts AI API calls (OpenAI chat completions + Gemini) and returns
 * a fixed response string. Must be called before page.goto() to the view
 * that triggers the AI request.
 */
export async function mockAiResponse(page, responseText) {
  // OpenAI-compatible streaming (SSE)
  const sseBody = [
    `data: {"choices":[{"delta":{"role":"assistant","content":${JSON.stringify(responseText)}},"finish_reason":null}]}`,
    `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}`,
    'data: [DONE]',
  ].join('\n\n');

  await page.route('**/v1/chat/completions', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream; charset=utf-8',
      body: sseBody,
    })
  );

  // Gemini streaming REST
  await page.route('**/v1beta/models/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: responseText }] } }],
      }),
    })
  );
}
