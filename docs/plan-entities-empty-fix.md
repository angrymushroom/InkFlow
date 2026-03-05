# Plan: Fix Entities Page Empty + Other Pages Empty After Navigating From Entities

## Problem

- **Entities page**: Renders empty (no content in main area) when navigating to `/entities`.
- **Other pages**: After visiting Entities, navigating to Story, Outline, Write, or Settings also shows empty main content.
- Previous attempts (remove transition, sync import, router-view key, try/catch) did not fix the issue.

## Root-cause hypotheses (to be tested in order)

| ID | Hypothesis | How to test | Fix if confirmed |
|----|------------|-------------|------------------|
| H1 | EntitiesView throws or fails during **setup** (before first render), so Vue never mounts it and may leave the router-view in a bad state. | Replace EntitiesView with a **minimal stub** (only static template + useI18n). If stub works, the bug is inside EntitiesView. | Fix the failing line in EntitiesView or defer the failing logic (e.g. move useIdeaTypes to a child component). |
| H2 | **useIdeaTypes()** runs `onMounted(loadCustomTypes)`; if that or the composable’s setup throws, only EntitiesView is affected, but if it corrupts shared state (e.g. global refs), other pages break. | Stub works → add only useIdeaTypes to stub. If it breaks, isolate useIdeaTypes (e.g. wrap in try/catch, or load custom types in a child). | Isolate or fix useIdeaTypes; ensure it never mutates shared refs. |
| H3 | **Router-view key** (`route.path`) or **dynamic component** behavior causes the next route’s component to be undefined or not mount after leaving Entities. | Remove `:key="route.path"` and use only `<component :is="Component" />`. If other pages then show content after leaving Entities, key was the cause. | Use a key that does not break transitions (e.g. `route.name` only) or remove key and fix any duplicate-instance issues another way. |
| H4 | **App.vue** or **global CSS** hides `.main-content` or the router-view content when the route is `/entities` or when the previous route was `/entities`. | Inspect computed styles in devtools on Entities and after navigating away; check for `display: none`, `visibility: hidden`, `height: 0`, `opacity: 0` on `.main-content` or the view wrapper. | Remove or override the rule that hides content. |
| H5 | **useOutline** (or another shared composable) is used in a way that, when Entities is in the history, causes **chapters/scenes** (or other shared refs) to be empty for the next page. | Log `chapters.length` / `scenes.length` in App after each route change; log in OutlineView/WriteView on mount. If they are 0 after visiting Entities, trace who clears them. | Ensure no code path clears useOutline refs when mounting or leaving Entities; reload outline when entering Outline/Write. |
| H6 | **Vue Router** does not provide a valid `Component` for the entities route (e.g. wrong name, redirect, or async component not resolving). | Log `Component` and `route.name` in App’s router-view slot; ensure they are defined when path is `/entities`. | Fix route config or use a synchronous component for entities. |
| H7 | **Single EntitiesView is inherently problematic** (e.g. complexity, composable order, or reactivity). | If all above are rejected, **avoid a single EntitiesView**: implement Entities as a **wrapper page** that only contains two sub-views (Ideas + Characters) with tabs, reusing existing IdeasView and CharactersView. | New route component: `EntitiesPage.vue` = tabs + `<IdeasView v-if="tab==='ideas'" />` and `<CharactersView v-if="tab==='characters'" />`. No new logic, no useIdeaTypes in the route component. |

---

## Implementation phases

### Phase 1: Minimal stub (proves H1 / H6)

1. **Add a stub component** `src/views/EntitiesViewStub.vue`:
   - Template: single root `<div class="page"><h1 class="page-title">Entities (stub)</h1><p>If you see this, the route and router-view work.</p></div>`.
   - Script: only `import { useI18n } from '@/composables/useI18n'; const { t } = useI18n();` (no route, no DB, no useIdeaTypes).
2. **Point the router** at the stub: `component: EntitiesViewStub` for `/entities`.
3. **Test**: Navigate to Entities → expect “Entities (stub)” and the paragraph. Then navigate to Story / Outline / Write → expect their content.
4. **Result**:
   - If **stub shows and other pages show after** → bug is inside the real EntitiesView (or its imports). Go to Phase 2.
   - If **stub is empty or other pages still empty** → bug is in App or router (key, Component, or CSS). Go to Phase 3.

### Phase 2: Narrow down inside EntitiesView (if stub works)

5. **Step A – Add route + useIdeaTypes only**  
   In the stub: add `useRoute`, `useRouter`, and `useIdeaTypes()` (and use only `builtInTypes` / `customTypes` in the template, e.g. a simple `<select>`). No `getIdeas`/`getCharacters`, no `load()`.  
   - If this breaks (Entities or next page empty) → **H2** likely; fix or isolate useIdeaTypes.

6. **Step B – Add data load**  
   Add `getIdeas`, `getCharacters`, refs, and `load()` in onMounted; show counts in the template.  
   - If this breaks → bug in load or in reactivity (e.g. refs not updating UI). Fix load/error handling and ensure refs are used correctly in template.

7. **Step C – Restore full EntitiesView**  
   Once A and B work, replace stub with the full EntitiesView again and ensure nothing else was introduced (e.g. watch, computed, or component that could throw or corrupt state).

### Phase 3: Fix App / router (if stub fails)

8. **Remove key**  
   In App.vue, remove `:key="route.path"` from `<router-view>`. Test Entities stub and then Story/Outline/Write.  
   - If other pages now show content after Entities → **H3**; keep key removed or use `route.name` only and re-test.

9. **Ensure Component is used correctly**  
   Log in the slot: `const Comp = Component; console.log(route.path, route.name, !!Comp)`.  
   - If `Comp` is falsy for `/entities` or for the next route after Entities → **H6**; fix route config or component resolution (e.g. sync import, no lazy for entities).

10. **CSS audit**  
    In devtools, when Entities (or next page) is empty, inspect `.main-content` and the inner div; check computed styles. If something hides it → **H4**; remove or override that rule.

### Phase 4: Shared state (if pages are “mounted but empty”)

11. **Log shared refs on route change**  
    In App, in `onRouteChange`, log `chapters.value.length`, `scenes.value.length`, `route.path`. In OutlineView and WriteView, on mount log the same.  
    - If after visiting Entities these are 0 when they shouldn’t be → **H5**; find and remove the code that clears them (or reload outline when entering Outline/Write).

### Phase 5: Fallback – Entities without a single complex view (H7)

12. **Implement Entities as a tabbed wrapper**  
    - New file: `src/views/EntitiesPage.vue` (wrapper only).
    - Template: title “Entities”, tab buttons “Ideas” / “Characters”, and:
      - `<IdeasView v-show="tab === 'ideas'" />` and `<CharactersView v-show="tab === 'characters'" />` (or v-if if you prefer).
    - Script: `const tab = ref('ideas');` and import IdeasView, CharactersView. No useIdeaTypes, no getIdeas/getCharacters in the wrapper.
    - Router: `/entities` → `component: EntitiesPage`.
    - This reuses the two views that already work on their own routes; the wrapper only switches tabs. If this works, we know the issue was the single EntitiesView implementation, and we can later refine the UX (e.g. single list with type filter) without breaking the app.

---

## File checklist

| Action | File |
|--------|------|
| Create stub | `src/views/EntitiesViewStub.vue` |
| Router: use stub then restore or use wrapper | `src/router/index.js` |
| Optional: remove key, add logs | `src/App.vue` |
| Optional: add logs | `src/composables/useOutline.js`, OutlineView, WriteView |
| Fallback: tabbed wrapper | `src/views/EntitiesPage.vue` (new), router |

---

## Success criteria

- Navigating to `/entities` shows a non-empty page (stub, full EntitiesView, or tabbed Ideas + Characters).
- After visiting Entities, navigating to Story, Outline, Write, and Settings shows each page’s content (non-empty).
- No regression: Story, Outline, Write, Settings still work when navigated to without visiting Entities first.

---

## Execution order (must solve)

1. Run **Phase 1** (stub + router) and record result (stub works vs. stub fails).
2. If stub works → **Phase 2** (add useIdeaTypes, then load, then full view).
3. If stub fails → **Phase 3** (key, Component, CSS) and **Phase 4** (shared state logs).
4. If the full EntitiesView still cannot be fixed quickly → **Phase 5** (tabbed EntitiesPage with IdeasView + CharactersView) so the product works while we iterate on a unified Entities view later.
