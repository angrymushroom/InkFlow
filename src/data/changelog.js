/**
 * Single source of truth for app version and changelog.
 * Keep APP_VERSION in sync with package.json on every release.
 *
 * Entry types: 'feat' | 'fix' | 'perf' | 'refactor'
 *
 * CHANGELOG         — latest version only; shown in the Settings UI
 * CHANGELOG_HISTORY — full version history; internal reference only, not rendered in the app
 */

export const APP_VERSION = '0.9.0'

// Shown in the app — current release only.
export const CHANGELOG = [
  {
    version: '0.9.0',
    date: '2026-03-27',
    changes: [
      {
        type: 'feat',
        text: 'Pip responses now stream token-by-token — text appears as it is generated instead of all at once',
      },
      {
        type: 'feat',
        text: 'Scene-aware welcome message in Pip shows title and word count when the scene editor is open',
      },
      {
        type: 'feat',
        text: 'Pip button shows a dot indicator when you navigate to a new scene while Pip is closed',
      },
      { type: 'feat', text: 'Cmd+S / Ctrl+S saves the current scene in the scene editor' },
      { type: 'feat', text: 'Keyboard shortcuts reference card added to Settings page' },
      {
        type: 'feat',
        text: 'Empty state cards in Characters and Outline now include a CTA button to add your first entry',
      },
    ],
  },
]

// Full version history — internal reference, not used in the UI.
export const CHANGELOG_HISTORY = [
  {
    version: '0.8.0',
    date: '2026-03-27',
    changes: [
      {
        type: 'feat',
        text: "Pip can now read the current scene's prose — ask for feedback, discuss pacing, reference specific lines",
      },
      {
        type: 'feat',
        text: 'Pip can generate scene prose on request via a new generate_prose action chip',
      },
      {
        type: 'fix',
        text: 'Written-scene count and outline ✓ markers now correctly reflect scenes with prose (was checking wrong field)',
      },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-03-27',
    changes: [
      {
        type: 'feat',
        text: 'Add DeepSeek, 通义千问 (Qwen), and MiniMax as AI providers alongside Gemini and OpenAI',
      },
      {
        type: 'feat',
        text: 'Privacy tooltip on API key field — explains keys are stored locally and never sent to servers',
      },
      {
        type: 'feat',
        text: "API key help link now links directly to each provider's key management page",
      },
      { type: 'feat', text: 'Content-Security-Policy header added to production deployment' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-03-25',
    changes: [
      {
        type: 'feat',
        text: 'Background consistency guardian — auto-scans for contradictions after each save and shows a non-intrusive warning banner',
      },
      {
        type: 'feat',
        text: 'Story facts now update automatically after each scene save — manual "Update story facts" button removed',
      },
      {
        type: 'fix',
        text: 'AI summaries and consistency warnings now respond in the same language as the scene text',
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-03-25',
    changes: [
      {
        type: 'feat',
        text: 'External Brain: AI-generated scene and chapter summaries keep context bounded regardless of story length',
      },
      {
        type: 'feat',
        text: 'BM25 smart retrieval — relevant earlier scenes are selected automatically, not just the last N',
      },
      {
        type: 'feat',
        text: 'Open plot thread tracking — unresolved mysteries injected into every generation prompt',
      },
      {
        type: 'feat',
        text: "Character state snapshots — each character's last known location, mood, and possessions tracked across scenes",
      },
      {
        type: 'feat',
        text: 'Auto entity recognition — Pip surfaces new Ideas while you write or update the outline',
      },
      {
        type: 'perf',
        text: 'Scene generation context is now O(1) — no longer grows with story length',
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-01-20',
    changes: [
      {
        type: 'feat',
        text: 'Pip AI assistant — chat with your story companion directly in the scene editor',
      },
      {
        type: 'feat',
        text: 'Pip can create and update chapters, scenes, and story spine from conversation',
      },
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
      {
        type: 'feat',
        text: 'Outline: collapsible beat sections, drag-to-reorder, AI draft per section',
      },
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
]
