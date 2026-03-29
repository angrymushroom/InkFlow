# Add a new page/view

Create a new page view for: $ARGUMENTS

## Steps

1. **`src/views/MyView.vue`** — create the Vue 3 component
   - Use `<script setup>` composition API
   - Import `useI18n` for all user-visible strings
   - Import `getCurrentStoryId` from `src/db/index.js` if story-scoped
   - Follow the layout pattern of an existing simple view (e.g. `IdeasView.vue`)

2. **`src/router/index.js`** — add the route
   ```js
   { path: '/my-route', component: () => import('../views/MyView.vue') }
   ```

3. **`src/App.vue`** — add a nav item in the sidebar with the correct `NavIcon` and i18n label

4. **`src/locales/*.js`** — add nav label and any page strings to all 4 locale files (en, zh, fr, es)

5. **Tests** — if the view has meaningful logic, add a Playwright journey in `e2e/` following the pattern in `e2e/story-creation.spec.js`

## Conventions

- Component name: PascalCase matching the file (`MyView.vue` → `<MyView>`)
- Fetch data in `onMounted` using db functions; store in `ref()`
- Use `useToast()` for success/error feedback
- Reactive state managed in a composable if complex (create `src/composables/useMyFeature.js`)
