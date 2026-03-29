# Add a new story structure template

Implement a new writing template for: $ARGUMENTS

## Steps

1. **`src/data/templates.js`** — define the template object:
   ```js
   {
     id: 'my-template',
     name: 'Template Name',
     spineFields: [
       { key: 'fieldKey', labelKey: 'story.fieldLabel', type: 'textarea' },
       // ...
     ],
     beats: [
       { key: 'beat1', labelKey: 'outline.beat1Label', color: '#hex' },
       // ...
     ],
   }
   ```

2. **`src/locales/*.js`** — add display names for:
   - Template name: `templates.myTemplate`
   - Each spine field label: `story.fieldKey`
   - Each beat label: `outline.beatKey`
   - Add to all 4 locale files (en, zh, fr, es)

3. **`src/services/pipContext.js`** — ensure the template's spine fields are included in the context string built for Pip. Follow how Snowflake fields are loaded.

4. **`src/components/OtterChat.vue`** — update `BASE_SYSTEM_PROMPT` template info section so Pip understands the new template's field names and structure.

5. **`src/services/outlineAi.js`** — if the template has beats with specific AI behaviour (e.g. different prompts per beat), add the beat logic here.

6. **`src/views/StoryView.vue`** — verify the spine fields render correctly via the template's `spineFields` definition (should be automatic if template follows the schema).

7. **Tests** — add a unit test confirming the template's fields are included in Pip context output.

## Template field types
- `textarea` — multi-line prose field
- `text` — single-line input
- `select` — dropdown (must include `options` array)
