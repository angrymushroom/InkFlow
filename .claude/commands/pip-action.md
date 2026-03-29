# Add a new Pip action

Implement a new Pip action end-to-end given the action name: $ARGUMENTS

## Steps

1. **`src/services/pipActions.js`**
   - Add a new case for `type === '$ARGUMENTS'` inside `applySingleAction()`
   - Call the appropriate DB function from `src/db/index.js`
   - After the DB write, dispatch the correct `inkflow-*` DOM event:
     - Story data changed → `window.dispatchEvent(new Event('inkflow-story-saved'))`
     - Characters changed → `window.dispatchEvent(new Event('inkflow-characters-changed'))`
     - Outline changed → `window.dispatchEvent(new Event('inkflow-outline-changed'))`
     - Ideas changed → `window.dispatchEvent(new Event('inkflow-ideas-changed'))`

2. **Relevant views** — add an event listener for the dispatched event so the view refreshes live. Follow the pattern already used in `CharactersView.vue` or `IdeasView.vue`.

3. **`src/components/OtterChat.vue`** — add a new `### Action name` section to `BASE_SYSTEM_PROMPT` with a pip-action example and clear instructions for when Pip should emit it.

4. **`src/services/__tests__/pipActions.test.js`** — add at least two unit tests:
   - Happy path: action applies correctly
   - Edge case: missing required field is handled gracefully

5. **`src/locales/*.js`** — if the action surfaces any new UI text, add i18n keys to en.js, zh.js, fr.js, es.js.

After implementing, run `npm run test:run` to verify all tests pass.
