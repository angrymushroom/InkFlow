# CLAUDE.md — InkFlow Codebase Guide

This file explains the codebase structure, conventions, and development workflows for AI assistants working on InkFlow.

---

## What is InkFlow?

InkFlow (branded as "OtterFlow" in UI) is a browser-based novel-writing assistant. All data is stored locally in IndexedDB (via Dexie). There is no backend — AI calls go directly from the browser to the user's chosen provider using their own API key.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 5 |
| Router | Vue Router 4 (hash history) |
| State | Pinia 3 |
| Database | Dexie 3 (IndexedDB wrapper) |
| i18n | Custom `useI18n` composable (CSP-safe, no vue-i18n) |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Styling | Custom CSS with design tokens (no Tailwind, no component library) |

---

## Project Structure

```
src/
├── App.vue                  # Root layout: nav bar, sidebar, router-view
├── main.js                  # App entry point
├── router/index.js          # Route definitions + navigation guards
│
├── views/                   # Page-level components (one per route)
│   ├── EntitiesPage.vue     # /ideas — split-panel idea manager
│   ├── CharactersView.vue   # /characters — character + relationship editor
│   ├── StoryView.vue        # /story — story spine form
│   ├── OutlineView.vue      # /outline — drag-and-drop chapter/scene outline
│   ├── WriteView.vue        # /write — scene list with AI generation
│   ├── SceneEditorView.vue  # /write/:sceneId — prose editor with AI
│   └── ExportView.vue       # /settings — settings, export, import
│
├── components/              # Reusable components
│   ├── NavIcon.vue          # SVG icon set for navigation
│   ├── OtterChat.vue        # Pip AI chat sidebar
│   ├── OtterIllustration.vue # Mascot empty-state illustrations
│   ├── ResizableTextarea.vue # Auto-resizing textarea
│   ├── AiExpandButton.vue   # AI content expansion trigger
│   ├── IdeaFormCard.vue     # Idea creation/edit form card
│   ├── OutlineEditPanel.vue # Chapter/scene edit modal
│   ├── OutlineDraftModal.vue # AI outline draft preview
│   ├── StorySwitcher.vue    # Story selection modal
│   ├── SearchModal.vue      # Global search (Cmd+K)
│   ├── ConfirmModal.vue     # Reusable delete confirmation
│   ├── FeedbackModal.vue    # User feedback form
│   ├── ChangelogModal.vue   # What's new modal
│   ├── AppToast.vue         # Toast notification display
│   ├── NovelImportModal.vue # Novel import wizard (sidebar entry point)
│   ├── EntitySuggestionBanner.vue   # Auto-detected entity suggestions
│   └── ConsistencyWarningBanner.vue # Story consistency alerts
│
├── stores/                  # Pinia stores
│   ├── story.js             # Current story, story list, CRUD
│   ├── outline.js           # Chapters and scenes
│   ├── ideas.js             # Ideas with type filtering
│   ├── characters.js        # Characters and relationships
│   └── unsaved.js           # Dirty state for navigation guards
│
├── composables/             # Vue composition utilities
│   ├── useI18n.js           # CSP-safe i18n composable (no vue-i18n — see Known Architectural Notes)
│   ├── useTheme.js          # Theme (light/dark/system) management
│   ├── useIdeaTypes.js      # Built-in + custom idea type logic
│   ├── useOutline.js        # Outline data utilities
│   ├── useOutlineDraft.js   # AI-powered outline generation
│   ├── useOutlinePanel.js   # Edit panel open/close state
│   ├── useToast.js          # Toast notification helpers
│   ├── useEntitySuggestions.js  # Entity auto-detection from prose
│   └── useConsistencyWarnings.js # Fact consistency checking
│
├── db/index.js              # Dexie DB schema and initialization
├── services/                # Business logic (AI calls, export, etc.)
│   ├── ai.js                # LLM provider abstraction (OpenAI/Gemini/DeepSeek/…)
│   ├── novelIngestion.js    # Novel import pipeline (chapter detect → analyze → merge → DB write)
│   ├── epubParser.js        # EPUB → plain text extraction (uses JSZip)
│   ├── generation.js        # Scene prose generation
│   ├── summarization.js     # Scene/chapter AI summarization
│   ├── consistency.js       # Story consistency checks
│   ├── outlineAi.js         # AI outline drafting
│   ├── retrieval.js         # RAG retrieval helpers
│   ├── entityExtraction.js  # Auto-detect new characters/ideas from prose
│   └── pipActions.js        # Pip (AI chat) action handlers
├── styles/global.css        # Design tokens + all global CSS
├── locales/                 # Translation JS files (en.js, es.js, fr.js, zh.js) + index.js
├── utils/                   # Utility functions
├── constants/               # App-wide constants
├── data/                    # Static data (story templates, built-in idea types)
└── types/                   # TypeScript type definitions
```

---

## Routes

```
/               → redirect to /ideas
/ideas          → EntitiesPage.vue
/entities       → redirect to /ideas (legacy alias)
/characters     → CharactersView.vue
/story          → StoryView.vue
/outline        → OutlineView.vue
/write          → WriteView.vue
/write/:sceneId → SceneEditorView.vue
/settings       → ExportView.vue
/export         → redirect to /settings (legacy alias)
```

**Navigation guards** in `router/index.js`:
- Leaving `/story` with unsaved changes → confirm dialog
- Leaving `/write/:sceneId` with unsaved changes → confirm dialog

---

## Layout Architecture (`App.vue`)

```
┌─────────────────────────────────────────────┐
│  nav.nav (top on desktop / bottom on mobile) │
├──────────────┬──────────────────────────────┤
│ aside.sidebar│ main.main-content            │
│ (260px fixed)│ <router-view>                │
│              │                              │
└──────────────┴──────────────────────────────┘
```

- **Breakpoint**: 768px. Below = mobile layout.
- **Mobile sidebar**: full-width overlay, toggled via hamburger button.
- **Sidebar content**: story switcher, "Import novel" button, chapter/scene outline navigation, search, feedback.
- **OtterChat** (`Pip`): slides in from the right as a separate panel.

---

## Styling Conventions

All styles live in `src/styles/global.css` as CSS custom properties. **No Tailwind, no component library.**

### Design tokens (key ones)

```css
--bg            Background surface
--bg-elevated   Cards and modals
--text          Primary text
--text-muted    Secondary/hint text
--border        Border color
--accent        #6366f1 (indigo) — primary actions
--danger        #e11d48 — destructive actions
--radius        14px — default border radius
--space-{1-7}   4px scale (4, 8, 12, 16, 24, 32, 40px)
```

### Utility classes

```css
.btn            Base button (min-height 44px, touch-safe)
.btn-primary    Accent-filled button
.btn-ghost      Transparent button
.btn-danger     Red destructive button
.btn-sm         Smaller button variant
.btn-icon       Square icon button
.card           Bordered card with shadow
.page           Content wrapper (max-width 720px, auto margins)
.modal-backdrop Full-screen overlay
.modal-card     Centered modal container
```

### Themes

Themes are set via `data-theme` attribute on `<html>`:
- `light` — explicit light
- `dark` — explicit dark
- `system` — follows `prefers-color-scheme`

Managed by `useTheme.js` composable, stored in `localStorage`.

---

## State Management (Pinia)

All stores are in `src/stores/`. Each wraps Dexie calls and exposes reactive refs.

- **`story.js`** — `currentStory`, `stories[]`, `createStory()`, `deleteStory()`
- **`outline.js`** — `chapters[]`, sorted scenes, chapter/scene CRUD, reordering
- **`ideas.js`** — `ideas[]`, filtering by type, CRUD
- **`characters.js`** — `characters[]`, `relationships[]`, CRUD
- **`unsaved.js`** — `storyDirty`, `sceneDirty` (booleans for nav guards)

---

## Database (Dexie / IndexedDB)

Schema defined in `src/db/index.js`. All data is local to the user's browser. There is no sync or cloud storage.

When adding a new entity type:
1. Add table to Dexie schema with new version number
2. Update the relevant Pinia store
3. Add migration if modifying existing tables

---

## i18n

All user-facing strings must use `t('key')` via `useI18n()` composable (`src/composables/useI18n.js`). Translation files are in `src/locales/*.js` (plain JS objects, not JSON — avoids CSP issues with the vue-i18n runtime compiler).

**Do NOT install vue-i18n.** Its runtime compiler calls `new Function()`, which is blocked by the production Content-Security-Policy and causes a blank page. The custom composable calls `getMessage(locale, key)` directly and is the only viable path.

When adding new strings:
1. Add the key to `src/locales/en.js` first
2. Run the `add-locale` skill to propagate to all other locale files: `/add-locale`

---

## Novel Import Pipeline

Entry point: sidebar "Import novel" button → `NovelImportModal.vue` → `src/services/novelIngestion.js`.

**4-layer pipeline** (`runIngestionPipeline`):

| Layer | Function | Description |
|-------|----------|-------------|
| 1 | `detectChapters` | Regex patterns first; AI fallback if < 2 found |
| 2 | `analyzeChapters` | Per-chapter: scenes, characters (with goal/motivation/conflict/epiphany), summary — 5 concurrent LIGHT calls |
| 3a | `mergeCharacters` | Dedup + alias merge across all chapters |
| 3b | `extractCharacterRelationships` | Relationship graph from merged chars + summaries |
| 3c | `detectTemplate` | Match to a spine template; fill spine fields |
| Write | `writeIngestionToDb` | Clear old data, write new story spine/chars/chapters/scenes/relationships |

**Import flow** in `NovelImportModal.vue`:
1. User uploads `.txt`, `.md`, or `.epub` — EPUB parsed by `src/services/epubParser.js` (JSZip-based)
2. `runIngestionPipeline` runs → preview shown (chapters, characters, template)
3. On confirm: `storyStore.create()` makes a **new** story (existing stories untouched), then `writeIngestionToDb` writes everything

**Test fixtures**: `tests/fixtures/test-novel.txt` — 3-chapter synthetic mystery with named characters, used by `src/services/__tests__/novelIngestion.test.js`.

---

## Adding New Features — Key Skills

These project-specific Claude Code skills accelerate common tasks:

| Skill | Use case |
|-------|---------|
| `/new-view` | Add a new page/view with route wiring |
| `/new-template` | Add a story structure template |
| `/pip-action` | Add a new Pip (AI chat) action |
| `/add-locale` | Propagate new i18n keys to all locale files |
| `/db-migration` | Add a Dexie schema migration |

---

## Development Commands

```bash
npm run dev          # Start dev server (opens browser)
npm run build        # Production build
npm run test:run     # Run unit tests (Vitest, no watch)
npm run test         # Run unit tests in watch mode
npm run test:e2e     # Run Playwright E2E tests (headless)
npm run test:e2e:ui  # Run Playwright with UI
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier
```

---

## CI / GitHub Actions

Defined in `.github/workflows/`:

- **CI** runs on **every push to any branch**:
  1. `npm run test:run` — unit tests
  2. Playwright E2E tests (Chromium only, `VITE_E2E=true`)
- **Deploy** runs only on push to `main`:
  - Deploys to Vercel via `VERCEL_TOKEN` secret

---

## Key Conventions

### Vue components
- Use `<script setup>` syntax (Composition API).
- Reactive state: `ref()` for primitives, `reactive()` for objects when needed.
- Emit events with `defineEmits`, expose with `defineExpose` only when necessary.

### Async / data loading
- Load data in `onMounted()`.
- Show loading/error states explicitly — don't silently swallow errors.
- Auto-save uses a 1.8s debounce timer pattern (see `StoryView.vue`, `SceneEditorView.vue`).

### AI integration
- All AI calls go through `src/services/` — views should not call AI APIs directly.
- The user's API key and provider are stored in `localStorage` via the settings page.

### Mobile-first
- All interactive elements must be at least 44px tall/wide (CSS: `min-height: 44px`).
- Use `env(safe-area-inset-*)` for fixed elements near screen edges.
- Test at 375px width minimum.

### No unused files
- `IdeasView.vue` was a legacy alternative to `EntitiesPage.vue` and has been removed.
- The active Ideas page is `EntitiesPage.vue` (router points here).

---

## AI Quality Eval Framework

Offline evaluation suite for the ingestion pipeline. Lives in `tests/eval/` — **not** run by regular CI (too slow/expensive).

```
tests/eval/
├── metrics.js                    # Pure functions: F1, ROUGE-L, fuzzyMatch, threshold checks
├── chapter-detection.eval.js     # Precision/recall for detectChapters()
├── character-extraction.eval.js  # Full detect→analyze→merge pipeline character accuracy
├── template-detection.eval.js    # Template classification accuracy
├── run-all.js                    # Orchestrator — outputs JSON to tests/eval/results/
├── compare.js                    # Regression diff between two result JSON files (fails if any metric drops >5%)
└── __tests__/metrics.test.js     # 24 unit tests for pure metric functions (run in regular CI)

tests/fixtures/eval-corpus/
├── corpus-manifest.json          # Ground-truth schema documentation
├── pride-and-prejudice/ground-truth.json
└── time-machine/ground-truth.json
```

To run evals (requires `VITE_RUN_EVALS=true` and an AI API key):
```bash
VITE_RUN_EVALS=true node tests/eval/run-all.js
# Compare two result files for regression:
node tests/eval/compare.js tests/eval/results/baseline.json tests/eval/results/new.json
```

Source texts are not committed (gitignored). See `_note` in each `ground-truth.json` for Project Gutenberg download links.

---

## Known Architectural Notes

- **Hash routing**: The app uses `createWebHashHistory()`, so URLs look like `/#/ideas`. This is intentional for static hosting compatibility.
- **`ExportView.vue`** is the Settings page (named before settings was expanded beyond export).
- **Sidebar** is context-aware: on `/outline` it emits scroll events; on `/write` it renders router-links to scene editors.
- **Pip (🦦)**: The AI chat assistant. The `OtterChat.vue` component manages its own conversation state. `pipBadge` in `App.vue` shows a dot indicator for unread messages.
- **vue-i18n is NOT installed and must NOT be added.** Its runtime compiler calls `new Function()`, which is blocked by the production CSP and causes a blank white page. Use the custom `useI18n.js` composable exclusively.
