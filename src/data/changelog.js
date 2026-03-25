/**
 * Single source of truth for app version and changelog.
 * Keep APP_VERSION in sync with package.json on every release.
 *
 * Entry types: 'feat' | 'fix' | 'perf' | 'refactor'
 */

export const APP_VERSION = '0.6.0';

export const CHANGELOG = [
  {
    version: '0.6.0',
    date: '2026-03-25',
    changes: [
      { type: 'feat', text: 'Background consistency guardian — auto-scans for contradictions after each save and shows a non-intrusive warning banner' },
      { type: 'feat', text: 'Story facts now update automatically after each scene save — manual "Update story facts" button removed' },
      { type: 'fix', text: 'AI summaries and consistency warnings now respond in the same language as the scene text' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-03-25',
    changes: [
      { type: 'feat', text: 'External Brain: AI-generated scene and chapter summaries keep context bounded regardless of story length' },
      { type: 'feat', text: 'BM25 smart retrieval — relevant earlier scenes are selected automatically, not just the last N' },
      { type: 'feat', text: 'Open plot thread tracking — unresolved mysteries injected into every generation prompt' },
      { type: 'feat', text: 'Character state snapshots — each character\'s last known location, mood, and possessions tracked across scenes' },
      { type: 'feat', text: 'Auto entity recognition — Pip surfaces new Ideas while you write or update the outline' },
      { type: 'perf', text: 'Scene generation context is now O(1) — no longer grows with story length' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-01-20',
    changes: [
      { type: 'feat', text: 'Pip AI assistant — chat with your story companion directly in the scene editor' },
      { type: 'feat', text: 'Pip can create and update chapters, scenes, and story spine from conversation' },
      { type: 'feat', text: 'Multi-language feedback collection (EN / ZH / FR / ES)' },
      { type: 'fix', text: 'Fixed OutlineView scene destructure and fr.js string escaping' },
    ],
  },
  {
    version: '0.3.0',
    date: '2025-11-15',
    changes: [
      { type: 'feat', text: 'Cmd+K global search across ideas, characters, chapters, and scenes' },
      { type: 'feat', text: 'Story Switcher — manage multiple stories with word counts and dates' },
      { type: 'feat', text: 'Export formats: EPUB, DOCX, Markdown, TXT, and PDF' },
      { type: 'feat', text: 'Outline: collapsible beat sections, drag-to-reorder, AI draft per section' },
      { type: 'feat', text: 'Consistency checker and story fact extraction from prose' },
    ],
  },
  {
    version: '0.2.0',
    date: '2025-09-01',
    changes: [
      { type: 'feat', text: 'AI scene generation with continuity hooks and prior-scene context' },
      { type: 'feat', text: 'Write dashboard — total, per-chapter, and per-scene word counts' },
      { type: 'feat', text: 'Scene editor: live word count, autosave, and focus mode' },
      { type: 'feat', text: 'Toast notifications and confirm dialogs' },
      { type: 'feat', text: 'SVG icon system and Settings / Export pages' },
    ],
  },
];
