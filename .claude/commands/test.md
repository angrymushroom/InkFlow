# Run tests and fix failures

$ARGUMENTS

## What to run

```bash
# Unit tests (fast, run first)
npm run test:run

# E2E tests (slower, run after unit tests pass)
npm run test:e2e
```

## Unit test locations
- DB layer: `src/db/__tests__/index.test.js`
- Services: `src/services/__tests__/*.test.js`
- Utils: `src/utils/__tests__/*.test.js`
- i18n coverage: `src/locales/__tests__/i18n.test.js` — catches missing locale keys

## E2E test locations
- Journey tests: `e2e/journey-*.spec.js`
- Feature tests: `e2e/*.spec.js`

## On failure

1. Read the full error output carefully before changing anything
2. For unit test failures: check if the test expectation is wrong or the implementation is wrong
3. For E2E failures: check if a selector changed, a route changed, or a timing issue — use `test:e2e:headed` to watch it fail
4. Fix the root cause; do not skip or comment out failing tests
5. Re-run the specific test file after fixing: `npx vitest run src/services/__tests__/pipActions.test.js`
