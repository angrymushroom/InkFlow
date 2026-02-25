# InkFlow — MVP Plan (Snowflake Method)

A **lightweight, Snowflake-first web app** so hobbyist writers can go from loose ideas to a clear story framework quickly, then fill in the actual prose themselves (or with AI later). Think: **lightweight Novelcrafter** — no login for MVP, works in the browser on PC and phone.

---

## 1. Product Vision (One Paragraph)

Users **capture ideas in cards** (plot scraps, character traits, scene ideas). The app **guides them through the Snowflake Method** (one sentence → one paragraph → characters → chapters & scenes) so those ideas turn into a **structured outline**. Once the framework is in place, users **write the details** scene by scene (or leave placeholders for AI later). No accounts in MVP — one project per device, stored in the browser.

---

## 2. Snowflake Method (What We Implement)

We use a **simplified Snowflake** tailored to “finish a framework quickly”:

| Step | Name | What the user does | What we store |
|------|------|--------------------|---------------|
| 1 | **One-sentence summary** | One sentence: who, what, stakes. | `Story.oneSentence` |
| 2 | **One-paragraph summary** | Expand to ~5 beats: setup, disaster 1, disaster 2, disaster 3, ending. | `Story.paragraph` or structured `setup`, `disaster1..3`, `ending` |
| 3 | **Character synopses** | Per major character: name, one-sentence role, goal, motivation, conflict, epiphany. | `Character` records with these fields |
| 4 | **Chapter & scene outline** | Break the paragraph into chapters; each chapter into scenes. Each scene: title, one-sentence summary, POV, optional notes. | `Chapter` → `Scene[]`; `Scene.summary`, `Scene.pov`, `Scene.notes` |
| 5 | **Write** | Per scene: actual prose (or placeholder for AI). | `Scene.content` (full text) |

**Ideas** are the raw material: freeform cards (plot, character, world, scene idea) that the user can **attach** to story/character/chapter/scene as they build the framework. So: “type ideas in cards → stories organized in a good framework.”

---

## 3. Core User Flows

1. **Capture ideas**  
   User creates idea cards (title + body, optional type: plot / character / world / scene). No structure yet — just capture.

2. **Define the story spine**  
   Guided form:  
   - Step 1: One-sentence summary.  
   - Step 2: One-paragraph (or 5 fields: setup, disaster 1, 2, 3, ending).  
   Optional: “Suggest chapters from structure” (e.g. 3 acts → 3 chapters per act).

3. **Define characters**  
   For each major character: name, one-sentence, goal, motivation, conflict, epiphany. Optionally link idea cards to a character.

4. **Build outline**  
   Chapters (title + short summary). Under each chapter, scenes (title, one-sentence summary, POV character, notes). Optionally link idea cards to a scene.

5. **Write**  
   Scene list → click scene → write (or paste) prose in a simple editor. Save. Later: “AI expand” can be a separate phase.

6. **Export / backup**  
   Export project as JSON (and later .docx or similar). No cloud or login in MVP.

---

## 4. Data Model (MVP)

Single project in **IndexedDB** (one DB per “project”; for MVP, one project per app load or one saved project in localStorage key — your choice).

```
Project (or implicit)
├── Story
│   ├── oneSentence: string
│   ├── setup: string
│   ├── disaster1: string
│   ├── disaster2: string
│   ├── disaster3: string
│   └── ending: string
├── Idea[]
│   ├── id, title, body, type?: 'plot'|'character'|'world'|'scene', createdAt
│   └── (optional) linkedTo: 'story'|characterId|chapterId|sceneId
├── Character[]
│   ├── id, name, oneSentence, goal, motivation, conflict, epiphany, createdAt
│   └── (optional) ideaIds: string[]
├── Chapter[]
│   ├── id, title, summary?, order, createdAt
│   └── sceneIds: string[]  (or Scene[] embedded)
└── Scene[]
    ├── id, chapterId, title, oneSentenceSummary, povCharacterId?, notes?, content (prose), order, createdAt
    └── (optional) ideaIds: string[]
```

**MVP simplification:**  
- One project per browser (e.g. one Dexie DB or one localStorage key).  
- Ideas: `id`, `title`, `body`, `type`. Linking to story/character/chapter/scene can be Phase 2.  
- Chapters have `scenes` (array of scene objects) or a separate `Scene` table with `chapterId`. Separate table is cleaner for “scene list” and “scene editor.”

---

## 5. Screens / Pages (MVP)

| Screen | Purpose | Main elements |
|--------|--------|----------------|
| **Ideas** | Capture raw ideas | List/grid of cards; “Add idea” (title, body, type); simple list or masonry. |
| **Story** | Snowflake steps 1–2 | Form: one sentence; then setup, disaster 1–3, ending. Optional “Suggest chapters” later. |
| **Characters** | Snowflake step 3 | List of character cards; add/edit form: name, one-sentence, goal, motivation, conflict, epiphany. |
| **Outline** | Chapters & scenes (step 4) | List of chapters; expand chapter → list of scenes. Add chapter / add scene. Per scene: title, one-sentence, POV, notes. |
| **Write** | Step 5 | List of scenes (by chapter); click scene → full-screen or side-by-side scene editor (title + summary + text area for prose). |
| **Export** | Backup | Button: “Export project as JSON” (and optionally “Import” to replace current project). |

**Navigation:** Top or bottom nav: Ideas | Story | Characters | Outline | Write | Export (or Settings with Export inside). Responsive: on mobile, bottom nav or hamburger.

---

## 6. Tech Stack (MVP)

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | **Vue 3 + Vite** | You already use it; fast, simple. |
| Storage | **Dexie (IndexedDB)** | Same as current project; one DB, no backend. |
| Routing | **Vue Router** | Hash mode for static deploy; routes: `/`, `/ideas`, `/story`, `/characters`, `/outline`, `/write`, `/write/:sceneId`. |
| Prose editor | **textarea** or **TipTap** | Textarea is enough for MVP; TipTap if you want formatting. |
| Styles | **Plain CSS + variables** | Lightweight; one small design token set (spacing, radius, colors). |
| Deploy | **Static** (e.g. Vite build → GitHub Pages / Netlify) | No server; works on PC and smartphone in browser. |

No auth, no backend, no AI in MVP.

---

## 7. MVP Scope (What’s In / Out)

**In:**

- One project (IndexedDB).
- Ideas: create, list, edit, delete; optional type (plot/character/world/scene).
- Story: one-sentence + paragraph (5 fields).
- Characters: CRUD; fields above.
- Chapters: CRUD; order.
- Scenes: CRUD under a chapter; title, one-sentence, POV picker, notes, prose (`content`).
- Write view: scene list + scene editor (one scene at a time).
- Export project as JSON; optional Import to replace project.
- Responsive layout (usable on phone and PC).

**Out (for later):**

- Login / accounts / sync.
- AI generation.
- Linking idea cards to story/character/chapter/scene (can add in Phase 2).
- Rich text in prose (unless you add TipTap in MVP).
- Multiple projects (MVP = one project; we can add “New project” later and multi-DB or project selector).

---

## 8. Phased Build (MVP)

### Phase 1: Shell + data layer (Day 1)

- [ ] Vite + Vue 3 + Vue Router (hash) project.
- [ ] Dexie schema: `Project` (or singleton), `Idea`, `Character`, `Chapter`, `Scene`; `Story` can be one row in a `Story` table or part of `Project`.
- [ ] One “project” on load: create default if empty; load into a simple store (reactive refs or Pinia).
- [ ] Layout: shell with nav (Ideas | Story | Characters | Outline | Write); placeholder content per route.
- [ ] Responsive nav (e.g. bottom nav on mobile, top on desktop).

### Phase 2: Ideas + Story spine (Day 2)

- [ ] **Ideas**: List ideas; add/edit/delete; fields: title, body, type (dropdown or tags).
- [ ] **Story**: One screen with one-sentence input + 5 fields (setup, disaster1–3, ending). Save to DB.
- [ ] Persist and load on refresh.

### Phase 3: Characters (Day 3)

- [ ] **Characters**: List; add/edit/delete; form: name, one-sentence, goal, motivation, conflict, epiphany.
- [ ] Persist and load.

### Phase 4: Outline — Chapters & Scenes (Day 4)

- [ ] **Chapters**: List; add (title, optional summary); reorder (optional); delete.
- [ ] **Scenes**: Under each chapter, list scenes; add scene (title, one-sentence, POV from character list, notes); edit; delete; reorder (optional).
- [ ] Data: `Scene.chapterId`, `Scene.order`.

### Phase 5: Write view (Day 5)

- [ ] **Write**: Route `/write` shows flat or grouped (by chapter) scene list.
- [ ] Click scene → `/write/:sceneId`: show scene title, one-sentence, POV, notes; big text area (or TipTap) for `Scene.content`.
- [ ] Auto-save or Save button; persist to Dexie.

### Phase 6: Export + polish (Day 6)

- [ ] **Export**: Serialize project (story, ideas, characters, chapters, scenes) to JSON; download file.
- [ ] Optional: **Import** JSON to replace current project (confirm overwrite).
- [ ] Responsive and basic focus/click usability; optional “Empty state” copy for each screen.

---

## 9. File Structure (Suggested)

```
src/
├── main.js
├── App.vue
├── router/
│   └── index.js
├── db/
│   └── index.js          # Dexie schema + helpers
├── stores/
│   └── project.js        # Pinia or reactive refs for current project (optional)
├── views/
│   ├── Ideas.vue
│   ├── Story.vue
│   ├── Characters.vue
│   ├── Outline.vue       # Chapters + scenes
│   ├── Write.vue         # Scene list
│   └── SceneEditor.vue   # Or inline in Write with :sceneId
├── components/
│   ├── AppShell.vue      # Nav + layout
│   ├── IdeaCard.vue
│   ├── CharacterCard.vue
│   ├── ChapterCard.vue
│   └── SceneRow.vue
└── assets/
    └── (minimal CSS)
```

---

## 10. Success Criteria for MVP

- User can **add idea cards** and see them in a list.
- User can **fill story spine** (one sentence + 5 paragraph fields) and see it saved.
- User can **add characters** with the 6 key fields and see them in a list.
- User can **add chapters and scenes** under chapters, with title, one-sentence, POV, notes.
- User can **open any scene in Write** and type prose that persists.
- User can **export the project as JSON**.
- App works in **Chrome/Firefox/Safari on desktop and mobile** (responsive, no login).

---

## 11. After MVP (Backlog)

- Link **idea cards** to story / character / chapter / scene.
- **Multiple projects** (project selector or “New project”).
- **AI expand**: e.g. “Expand this scene summary into 500 words” (API key, optional).
- **Accounts + sync** (e.g. Firebase or custom backend).
- **Export to .docx** or PDF.
- **Themes** (light/dark) and better typography.

---

If you want to start building, the next step is **Phase 1: create the new Vite+Vue project**, define the Dexie schema, add the shell and routes, and one “project” load/save. I can generate the exact project scaffold and DB schema next.
