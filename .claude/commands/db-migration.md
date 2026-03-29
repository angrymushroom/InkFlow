# Add a Dexie DB schema migration

Implement a database schema change for: $ARGUMENTS

## Rules

- **Never modify an existing Dexie version block** — always add a new version
- Increment the version number sequentially (check the current highest version in `src/db/index.js`)
- Add a descriptive comment above the version block explaining what changed and why
- If renaming or removing a field, provide an `upgrade()` migration function to transform existing data
- If adding a new table, define its index schema in the version block

## Pattern

```js
// src/db/index.js

// v6: Added X to support Y feature
db.version(6).stores({
  existing_table: 'id, storyId, ...',   // unchanged tables must be repeated
  new_table: '++id, storyId, fieldA',
}).upgrade(async tx => {
  // migrate existing data if needed
  await tx.table('existing_table').toCollection().modify(record => {
    record.newField = record.newField ?? 'defaultValue';
  });
});
```

## Checklist

- [ ] Version number incremented
- [ ] All existing tables repeated in the new version's `.stores({})` call
- [ ] Migration function added if data transformation needed
- [ ] New CRUD functions added/updated in `src/db/index.js`
- [ ] Unit tests updated in `src/db/__tests__/index.test.js`
- [ ] Run `npm run test:run` to verify no regressions
