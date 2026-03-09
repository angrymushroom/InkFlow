import { getStoryById, getIdeas, getCharacters, getChapters, getScenes } from '@/db';
import { completeWithAi, TIERS, getLanguageRule } from '@/services/ai';

export const OUTLINE_BEATS = Object.freeze(['setup', 'disaster1', 'disaster2', 'disaster3', 'ending']);

const STORAGE_LOCALE = 'inkflow_locale';

function getSettingsLocale() {
  try { return localStorage.getItem(STORAGE_LOCALE) || 'en'; } catch { return 'en'; }
}

const CJK_RE = /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/g;
const LATIN_WORD_RE = /[a-zA-ZÀ-ÿ]+/g;

/**
 * Detect the dominant writing language from actual user content.
 * Counts CJK characters (each ≈ 1 word) vs Latin words in the combined
 * text of the story spine, characters, and ideas.
 * Falls back to the Settings locale when content is absent or ambiguous.
 */
function detectContentLocale(story, ideas, characters, settingsLocale) {
  const sample = [
    story?.oneSentence, story?.setup, story?.disaster1, story?.disaster2, story?.disaster3, story?.ending,
    ...(ideas || []).map((i) => `${i.title || ''} ${i.body || ''}`),
    ...(characters || []).map((c) =>
      [c.name, c.oneSentence, c.goal, c.motivation, c.conflict, c.epiphany].filter(Boolean).join(' ')
    ),
  ].filter(Boolean).join(' ');

  const cjkWords = (sample.match(CJK_RE) || []).length;
  const latinWords = (sample.match(LATIN_WORD_RE) || []).length;

  // If CJK characters are a clear majority, the user is writing in Chinese.
  // Otherwise trust the Settings locale (handles en/es/fr distinctions).
  if (cjkWords > 0 && cjkWords >= latinWords) return 'zh';
  return settingsLocale || 'en';
}

function stripCodeFences(s) {
  return (s || '').replace(/```[\s\S]*?\n/g, '```').replace(/```/g, '').trim();
}

function extractJsonObject(s) {
  const text = (s || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export function parseOutlineDraftJson(raw) {
  const base = extractJsonObject(stripCodeFences(raw));
  try {
    return JSON.parse(base);
  } catch {
    const fixed = base.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(fixed);
  }
}

export function validateOutlineDraft(draft, scope = 'all') {
  if (!draft || typeof draft !== 'object') throw new Error('AI draft is not an object.');
  if (!draft.sections || typeof draft.sections !== 'object') throw new Error('AI draft JSON must include "sections".');

  const beats = OUTLINE_BEATS;
  for (const b of beats) {
    const v = draft.sections[b];
    if (v == null) continue;
    if (!Array.isArray(v)) throw new Error(`AI draft sections.${b} must be an array.`);
    for (const ch of v) {
      if (!ch || typeof ch !== 'object') throw new Error(`AI draft sections.${b} contains an invalid chapter.`);
      if (ch.chapterTitle != null && typeof ch.chapterTitle !== 'string')
        throw new Error(`AI draft chapterTitle must be a string (section ${b}).`);
      if (ch.chapterSummary != null && typeof ch.chapterSummary !== 'string')
        throw new Error(`AI draft chapterSummary must be a string (section ${b}).`);
      if (ch.scenes != null && !Array.isArray(ch.scenes))
        throw new Error(`AI draft scenes must be an array (section ${b}).`);
      if (Array.isArray(ch.scenes)) {
        for (const sc of ch.scenes) {
          if (!sc || typeof sc !== 'object') throw new Error(`AI draft has an invalid scene (section ${b}).`);
          if (sc.title != null && typeof sc.title !== 'string') throw new Error(`AI draft scene title must be a string (section ${b}).`);
          if (sc.oneSentence != null && typeof sc.oneSentence !== 'string') throw new Error(`AI draft scene oneSentence must be a string (section ${b}).`);
          if (sc.notes != null && typeof sc.notes !== 'string') throw new Error(`AI draft scene notes must be a string (section ${b}).`);
        }
      }
    }
  }

  if (scope !== 'all' && !beats.includes(scope)) {
    throw new Error('Invalid scope. Must be "all" or one of setup/disaster1/disaster2/disaster3/ending.');
  }

  return true;
}

function buildExistingOutlineBlurb(chapters, scenes) {
  if (!chapters?.length) return '(No chapters yet)';
  const scenesByChapter = new Map();
  for (const sc of scenes || []) {
    const list = scenesByChapter.get(sc.chapterId) || [];
    list.push(sc);
    scenesByChapter.set(sc.chapterId, list);
  }
  const lines = [];
  for (const ch of chapters) {
    const beat = ch.beat || 'ungrouped';
    const chTitle = (ch.title || 'Untitled').slice(0, 80);
    const chSummary = (ch.summary || '').slice(0, 180);
    lines.push(`- [${beat}] ${chTitle}${chSummary ? ` — ${chSummary}` : ''}`);
    const scs = scenesByChapter.get(ch.id) || [];
    for (const sc of scs) {
      const st = (sc.title || 'Untitled scene').slice(0, 80);
      const one = (sc.oneSentenceSummary || '').slice(0, 140);
      lines.push(`  - Scene: ${st}${one ? ` — ${one}` : ''}`);
    }
  }
  return lines.join('\n');
}

const SECTION_LABELS = {
  setup: 'Setup',
  disaster1: 'Disaster 1',
  disaster2: 'Disaster 2',
  disaster3: 'Disaster 3',
  ending: 'Ending',
};

function buildDraftPrompt({ story, ideas, characters, existingOutline, scope, locale }) {
  const langRule = getLanguageRule(locale || 'en');

  const oneSentence = story?.oneSentence || '';
  const setup = story?.setup || '';
  const d1 = story?.disaster1 || '';
  const d2 = story?.disaster2 || '';
  const d3 = story?.disaster3 || '';
  const ending = story?.ending || '';

  // Full Snowflake character sheets for richer arc planning
  const charsBlurb = characters?.length
    ? characters.map((c) => {
        const lines = [`- ${c.name || 'Unnamed'}: ${(c.oneSentence || '').slice(0, 180)}`];
        if (c.goal?.trim()) lines.push(`  Goal: ${c.goal.slice(0, 140)}`);
        if (c.motivation?.trim()) lines.push(`  Motivation: ${c.motivation.slice(0, 140)}`);
        if (c.conflict?.trim()) lines.push(`  Conflict: ${c.conflict.slice(0, 140)}`);
        if (c.epiphany?.trim()) lines.push(`  Epiphany: ${c.epiphany.slice(0, 140)}`);
        return lines.join('\n');
      }).join('\n\n')
    : '(No characters yet)';

  const ideasBlurb = ideas?.length
    ? ideas.map((i) => `- [${i.type}] ${i.title || 'Untitled'}: ${(i.body || '').slice(0, 400)}`).join('\n')
    : '(No idea cards yet)';

  // Scope instruction — focused for section drafts, broad for all
  let scopeInstruction;
  if (scope === 'all') {
    scopeInstruction =
      'Draft chapters and scenes for ALL 5 sections: setup, disaster1, disaster2, disaster3, ending.\n' +
      'Ensure each section flows logically into the next, forming a complete arc. ' +
      'Aim for 2–4 chapters per section with 2–4 scenes each.';
  } else {
    const sectionLabel = SECTION_LABELS[scope] || scope;
    const spineForSection =
      { setup, disaster1: d1, disaster2: d2, disaster3: d3, ending }[scope] || '(Not filled)';
    scopeInstruction =
      `Your task: draft chapters and scenes ONLY for the "${sectionLabel}" section.\n` +
      `This section's spine text: "${spineForSection}"\n` +
      `The full spine above gives you the complete narrative context — do NOT draft content for any other section.\n` +
      `Return empty arrays [] for all other sections in the JSON.\n` +
      `Aim for 2–4 chapters with 2–4 scenes each, each scene advancing this specific beat.`;
  }

  const systemPrompt =
    'You are an expert fiction story outliner specializing in the Snowflake Method. ' +
    'First read the full story spine to understand the complete narrative arc. ' +
    'Then generate a structural outline: chapter summaries describe what happens and why it matters (2–3 sentences). ' +
    'Scene one-sentences describe one complete dramatic beat (who does what, what changes). ' +
    'Scene notes give specific writing guidance: POV hints, key dialogue beats, or turning-point details. ' +
    'Stay consistent with all characters, ideas, and the spine. ' +
    'Return VALID JSON only — no markdown, no code fences, no text outside the JSON object. ' +
    langRule;

  const userPrompt =
    `=== FULL STORY SPINE (read to understand the complete arc before drafting) ===\n` +
    `One-sentence: ${oneSentence || '(Not filled)'}\n` +
    `Setup: ${setup || '(Not filled)'}\n` +
    `Disaster 1: ${d1 || '(Not filled)'}\n` +
    `Disaster 2: ${d2 || '(Not filled)'}\n` +
    `Disaster 3: ${d3 || '(Not filled)'}\n` +
    `Ending: ${ending || '(Not filled)'}\n\n` +
    `=== CHARACTERS (Snowflake sheets — use for POV, arc, and consistency) ===\n${charsBlurb}\n\n` +
    `=== IDEA CARDS (weave in when relevant; do not invent unrelated lore) ===\n${ideasBlurb}\n\n` +
    `=== EXISTING OUTLINE (complement gaps; do not duplicate) ===\n${existingOutline}\n\n` +
    `=== YOUR TASK ===\n${scopeInstruction}\n\n` +
    `Output this exact JSON schema (all text values must be in the required language):\n` +
    `{\n` +
    `  "sections": {\n` +
    `    "setup": [\n` +
    `      { "chapterTitle": "...", "chapterSummary": "...", "scenes": [\n` +
    `        { "title": "...", "oneSentence": "...", "notes": "..." }\n` +
    `      ]}\n` +
    `    ],\n` +
    `    "disaster1": [],\n` +
    `    "disaster2": [],\n` +
    `    "disaster3": [],\n` +
    `    "ending": []\n` +
    `  }\n` +
    `}\n`;

  return { systemPrompt, userPrompt };
}

/**
 * Draft a structured outline from a story spine.
 *
 * Cost model:
 *   scope='all'  → ADVANCED tier (must reason across the full 5-beat arc; higher quality needed)
 *   scope=<beat> → LIGHT tier (focused single-section task; fast and cheap)
 *
 * @param {{ storyId: string, scope?: 'all'|'setup'|'disaster1'|'disaster2'|'disaster3'|'ending' }} opts
 * @returns {Promise<{ sections: Record<string, any[]> }>}
 */
export async function draftOutlineFromSpine({ storyId, scope = 'all' }) {
  const [story, ideas, characters, chapters, scenes] = await Promise.all([
    getStoryById(storyId),
    getIdeas(storyId),
    getCharacters(storyId),
    getChapters(storyId),
    getScenes(storyId),
  ]);
  if (!story) throw new Error('Story not found.');

  const locale = detectContentLocale(story, ideas, characters, getSettingsLocale());
  const existingOutline = buildExistingOutlineBlurb(chapters, scenes);
  const { systemPrompt, userPrompt } = buildDraftPrompt({
    story, ideas, characters, existingOutline, scope, locale,
  });

  // Cost optimization: section drafts are focused → LIGHT is sufficient and much cheaper.
  // Full outline drafts require planning the whole arc → ADVANCED for better coherence.
  const tier = scope === 'all' ? TIERS.ADVANCED : TIERS.LIGHT;
  const maxTokens = scope === 'all' ? 4000 : 2000;

  const raw = await completeWithAi({ systemPrompt, userPrompt, tier, maxTokens });

  let draft;
  try {
    draft = parseOutlineDraftJson(raw);
  } catch (e) {
    throw new Error('AI returned invalid JSON. Try again or switch to a stronger model in Settings → AI.');
  }
  validateOutlineDraft(draft, scope);

  // Normalize missing sections to empty arrays so UI is predictable
  const normalized = { sections: {} };
  for (const b of OUTLINE_BEATS) {
    normalized.sections[b] = Array.isArray(draft.sections?.[b]) ? draft.sections[b] : [];
  }
  return normalized;
}
