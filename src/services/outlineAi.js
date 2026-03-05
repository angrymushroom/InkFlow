import { getStoryById, getIdeas, getCharacters, getChapters, getScenes } from '@/db';
import { completeWithAi, TIERS } from '@/services/ai';

export const OUTLINE_BEATS = Object.freeze(['setup', 'disaster1', 'disaster2', 'disaster3', 'ending']);

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
    // Try a tolerant parse by removing trailing commas before } or ]
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

function buildDraftPrompt({ story, ideas, characters, existingOutline, scope }) {
  const oneSentence = story?.oneSentence || '';
  const setup = story?.setup || '';
  const d1 = story?.disaster1 || '';
  const d2 = story?.disaster2 || '';
  const d3 = story?.disaster3 || '';
  const ending = story?.ending || '';

  const ideasBlurb =
    ideas?.length
      ? ideas.map((i) => `- [${i.type}] ${i.title || 'Untitled'}: ${(i.body || '').slice(0, 220)}`).join('\n')
      : '(No idea cards yet)';

  const charsBlurb =
    characters?.length
      ? characters.map((c) => `- ${c.name || 'Unnamed'}: ${(c.oneSentence || '').slice(0, 180)}`).join('\n')
      : '(No characters yet)';

  const scopeInstruction =
    scope === 'all'
      ? 'Draft chapters and scenes for ALL 5 sections: setup, disaster1, disaster2, disaster3, ending.'
      : `Draft chapters and scenes ONLY for section "${scope}". For all other sections, return empty arrays.`;

  const systemPrompt =
    'You are a fiction outliner. The writer uses the Snowflake Method. ' +
    'You must produce a structured outline aligned to the given story spine. ' +
    'Return VALID JSON only (no markdown, no code fences, no commentary).';

  const userPrompt = `Story spine (author-defined, must follow strictly):\n` +
    `One-sentence: ${oneSentence || '(Not filled)'}\n` +
    `Setup: ${setup || '(Not filled)'}\n` +
    `Disaster 1: ${d1 || '(Not filled)'}\n` +
    `Disaster 2: ${d2 || '(Not filled)'}\n` +
    `Disaster 3: ${d3 || '(Not filled)'}\n` +
    `Ending: ${ending || '(Not filled)'}\n\n` +
    `Characters:\n${charsBlurb}\n\n` +
    `Idea cards (use when relevant; do not invent random lore):\n${ideasBlurb}\n\n` +
    `Existing outline (avoid duplicating; you may complement gaps):\n${existingOutline}\n\n` +
    `${scopeInstruction}\n\n` +
    `Output JSON schema:\n` +
    `{\n` +
    `  \"sections\": {\n` +
    `    \"setup\": [\n` +
    `      {\n` +
    `        \"chapterTitle\": \"...\",\n` +
    `        \"chapterSummary\": \"...\",\n` +
    `        \"scenes\": [\n` +
    `          { \"title\": \"...\", \"oneSentence\": \"...\", \"notes\": \"...\" }\n` +
    `        ]\n` +
    `      }\n` +
    `    ],\n` +
    `    \"disaster1\": [],\n` +
    `    \"disaster2\": [],\n` +
    `    \"disaster3\": [],\n` +
    `    \"ending\": []\n` +
    `  }\n` +
    `}\n\n` +
    `Quality rules:\n` +
    `- Keep it practical and structural, not prose.\n` +
    `- Each scene oneSentence must be a complete beat (no mid-sentence).\n` +
    `- Keep it consistent with the spine; make sure each section clearly leads toward its corresponding disaster/ending.\n`;

  return { systemPrompt, userPrompt };
}

/**
 * Draft a structured outline from a story spine.
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

  const existingOutline = buildExistingOutlineBlurb(chapters, scenes);
  const { systemPrompt, userPrompt } = buildDraftPrompt({
    story,
    ideas,
    characters,
    existingOutline,
    scope,
  });

  const maxTokens = scope === 'all' ? 2400 : 1600;
  const raw = await completeWithAi({
    systemPrompt,
    userPrompt,
    tier: TIERS.ADVANCED,
    maxTokens,
  });

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

