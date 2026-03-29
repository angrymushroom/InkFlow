# Add i18n keys to all locale files

Add the following i18n key(s) to all four locale files: $ARGUMENTS

## Rules

- All user-visible strings must exist in **all four** locale files: `src/locales/en.js`, `src/locales/zh.js`, `src/locales/fr.js`, `src/locales/es.js`
- Place the new key in the correct logical group (match the existing structure)
- English (`en.js`) is the source of truth — translate accurately into zh, fr, es
- French strings containing apostrophes must use double quotes: `"Types d'idée"`
- Nested keys use dot notation in code: `t('group.subKey')`
- After adding, run `npm run test:run` — the i18n test (`src/locales/__tests__/i18n.test.js`) will catch any locale that is missing a key

## Format

```js
// en.js example
groupName: {
  existingKey: 'Existing value',
  newKey: 'New English value',   // ← add here
},
```

Translate each key with appropriate cultural/linguistic accuracy — do not use placeholder text.
