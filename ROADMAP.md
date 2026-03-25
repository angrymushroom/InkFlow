# InkFlow — Product Roadmap

## Product Goal

Help ordinary users go from a raw idea → a structurally complete novel or screenplay outline entirely through conversation, with AI as the primary guide and the app as the persistent workspace.

---

## Current State Assessment

| Dimension | Status | Notes |
|-----------|--------|-------|
| Story spine (Snowflake) | ~80% | All 6 fields, AI expand, Pip can save spine |
| Characters | ~70% | CRUD + relationships; AI assist; Pip can upsert |
| Outline (chapters + scenes) | ~75% | Drag-reorder, beat grouping, AI draft; Pip can add/update |
| Scene prose writing | ~65% | Full editor, AI generation, continuity checks |
| AI coaching (Pip) | ~40% | Can answer, save data — but **passive** and **ephemeral** |
| Chat persistence | 0% | Messages lost on refresh — P0 blocker |
| Proactive onboarding | 0% | Generic greeting, no gap analysis — P0 blocker |
| Template system | 0% | Only Snowflake hardcoded — blocks future templates |
| Export | ~60% | JSON/MD/TXT; missing EPUB, DOCX quality polish |
| Mobile UX | ~50% | Responsive but not mobile-first |

---

## P0 — Must Ship (unblocks core user journey)

| Feature | Rationale |
|---------|-----------|
| **Chat history persistence** (IndexedDB) | Creative work spans days/weeks. Losing a breakthrough conversation is a hard UX failure. |
| **Proactive coaching welcome** (gap-based) | Ordinary users don't know what to ask. Pip waiting silently == user bouncing. First message must be intelligent, based on what's actually missing. |
| **Template system** (`writingTemplates.js`) | All coaching logic must work off a template definition. Snowflake is template #1; Three-Act, Hero's Journey, Beat Sheet follow. Hardcoding Snowflake field names now creates debt. |

---

## P1 — High Value (polish + retention)

| Feature | Rationale |
|---------|-----------|
| **Pip Phase 5** — Scene discussion | Pip updates scene metadata + triggers prose generation from chat |
| **Pip Phase 6** — Per-story history + onboarding | Persist chat per storyId; intro message; unread indicator; story progress summary |
| **Cmd+S to save** in SceneEditorView | Standard writing shortcut; reduces friction |
| **Keyboard shortcuts panel** in Settings | Discoverability |
| **Story progress dashboard** | Show % complete on spine, characters, scenes — motivation + direction |
| **Character → Ideas merge** | Characters as a type filter in Ideas; remove redundant nav item |
| **Pip scene generation from chat** | "Write scene 3 now" → prose appears in editor |

---

## P2 — Expand Platform

| Feature | Rationale |
|---------|-----------|
| **Three-Act Structure template** | Most common non-Snowflake framework |
| **Hero's Journey template** | Popular for fantasy/adventure |
| **Beat Sheet template** (Save the Cat) | Screenwriting-first users |
| **EPUB / DOCX export polish** | Proper formatting, chapter breaks, metadata |
| **Multi-device sync** | Currently local-only; cloud sync via optional backend |
| **Collaboration** | Share story + outline; co-author mode |
| **Mobile-first redesign** | Responsive is not enough for sustained writing on phone |
| **Version history** | Scene-level undo beyond the current session |

---

## Future Direction: AI Short Drama / Screenplay

Growing creator economy around AI-assisted short-form video scripts and micro-dramas (3–15 min episodes). InkFlow's snowflake-style spine maps cleanly onto episode structure.

**Potential additions:**
- Screenplay format export (Fountain / FDX)
- Scene-by-scene dialogue mode in Pip
- Episode arc template (teaser → act 1 → act 2 → cliffhanger)
- Character voice profiles (Pip maintains distinct voices per character)
- Shot list / visual direction layer

This is a natural P3 direction once the core writing loop is solid.

---

## Implementation Notes

- **No backend** — all persistence via Dexie (IndexedDB). Cloud sync would require a new backend service.
- **Template system** (`src/constants/writingTemplates.js`) is the single source of truth for all writing frameworks. Coaching logic in Pip reads field labels from the template, never hardcodes field names.
- **fr.js is fragile** — use `python3` for string replacements, never `node -e` with template literals (curly quote bug).
