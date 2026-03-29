/**
 * Writing template definitions.
 * Each template defines spine fields (StoryView) and beats (OutlineView chapter grouping).
 *
 * spineFields[].prop:
 *   - Direct story property: 'setup', 'disaster1', etc.  (Snowflake only, backwards-compat)
 *   - Nested templateFields: 'templateFields.you'         (all other templates)
 *
 * beats[].spineRef: key of a spineField whose text is shown as reference in OutlineView.
 */

export const TEMPLATES = {
  snowflake: {
    id: 'snowflake',
    spineFields: [
      { key: 'oneSentence', prop: 'oneSentence', type: 'input' },
      { key: 'setup', prop: 'setup', type: 'textarea' },
      { key: 'disaster1', prop: 'disaster1', type: 'textarea' },
      { key: 'disaster2', prop: 'disaster2', type: 'textarea' },
      { key: 'disaster3', prop: 'disaster3', type: 'textarea' },
      { key: 'ending', prop: 'ending', type: 'textarea' },
    ],
    beats: [
      { key: 'setup', color: '#6366f1', spineRef: 'setup' },
      { key: 'disaster1', color: '#f97316', spineRef: 'disaster1' },
      { key: 'disaster2', color: '#ef4444', spineRef: 'disaster2' },
      { key: 'disaster3', color: '#a855f7', spineRef: 'disaster3' },
      { key: 'ending', color: '#16a34a', spineRef: 'ending' },
    ],
    // Description injected into AI prompts
    aiDescription:
      'Snowflake Method: one-sentence premise, then Setup (ordinary world), three escalating Disasters (turning points), and Ending (resolution).',
  },

  save_the_cat: {
    id: 'save_the_cat',
    spineFields: [
      { key: 'logline', prop: 'templateFields.logline', type: 'input' },
      { key: 'catalyst', prop: 'templateFields.catalyst', type: 'textarea' },
      { key: 'debate', prop: 'templateFields.debate', type: 'textarea' },
      { key: 'midpoint', prop: 'templateFields.midpoint', type: 'textarea' },
      { key: 'allIsLost', prop: 'templateFields.allIsLost', type: 'textarea' },
      { key: 'finale', prop: 'templateFields.finale', type: 'textarea' },
    ],
    beats: [
      { key: 'act1', color: '#6366f1', spineRef: 'catalyst' },
      { key: 'act2a', color: '#f97316', spineRef: 'debate' },
      { key: 'midpoint', color: '#ef4444', spineRef: 'midpoint' },
      { key: 'act2b', color: '#a855f7', spineRef: 'allIsLost' },
      { key: 'act3', color: '#16a34a', spineRef: 'finale' },
    ],
    aiDescription:
      'Save the Cat (Blake Snyder): Logline → Act 1 (Catalyst/Break Into Two) → Act 2A (Fun & Games) → Midpoint → Act 2B (Bad Guys Close In / All Is Lost) → Act 3 (Finale). Focus on commercial pacing and clear character arc.',
  },

  story_circle: {
    id: 'story_circle',
    spineFields: [
      { key: 'you', prop: 'templateFields.you', type: 'textarea' },
      { key: 'need', prop: 'templateFields.need', type: 'textarea' },
      { key: 'go', prop: 'templateFields.go', type: 'textarea' },
      { key: 'search', prop: 'templateFields.search', type: 'textarea' },
      { key: 'find', prop: 'templateFields.find', type: 'textarea' },
      { key: 'take', prop: 'templateFields.take', type: 'textarea' },
      { key: 'return', prop: 'templateFields.return', type: 'textarea' },
      { key: 'change', prop: 'templateFields.change', type: 'textarea' },
    ],
    beats: [
      { key: 'you', color: '#6366f1', spineRef: 'you' },
      { key: 'need', color: '#3b82f6', spineRef: 'need' },
      { key: 'go', color: '#f97316', spineRef: 'go' },
      { key: 'search', color: '#ef4444', spineRef: 'search' },
      { key: 'find', color: '#a855f7', spineRef: 'find' },
      { key: 'take', color: '#ec4899', spineRef: 'take' },
      { key: 'return', color: '#14b8a6', spineRef: 'return' },
      { key: 'change', color: '#16a34a', spineRef: 'change' },
    ],
    aiDescription:
      "Dan Harmon's Story Circle (8 segments): You (stasis) → Need (what they lack) → Go (into unfamiliar situation) → Search (adapt, try) → Find (what they sought) → Take (pay the price) → Return (back to familiar world) → Change (transformed). Ideal for character-driven internal journeys.",
  },

  hero_journey: {
    id: 'hero_journey',
    spineFields: [
      { key: 'premise', prop: 'templateFields.premise', type: 'input' },
      { key: 'call', prop: 'templateFields.call', type: 'textarea' },
      { key: 'trials', prop: 'templateFields.trials', type: 'textarea' },
      { key: 'ordeal', prop: 'templateFields.ordeal', type: 'textarea' },
      { key: 'elixir', prop: 'templateFields.elixir', type: 'textarea' },
    ],
    beats: [
      { key: 'departure', color: '#6366f1', spineRef: 'call' },
      { key: 'road_of_trials', color: '#f97316', spineRef: 'trials' },
      { key: 'ordeal', color: '#ef4444', spineRef: 'ordeal' },
      { key: 'return', color: '#16a34a', spineRef: 'elixir' },
    ],
    aiDescription:
      "Hero's Journey (Campbell/Vogler): Premise → Call to Adventure → Road of Trials (tests, allies, enemies) → Supreme Ordeal (death/rebirth) → Return with the Elixir (transformed). Best for epic, adventure, fantasy, and quest narratives.",
  },

  kishotenketsu: {
    id: 'kishotenketsu',
    spineFields: [
      { key: 'ki', prop: 'templateFields.ki', type: 'textarea' },
      { key: 'sho', prop: 'templateFields.sho', type: 'textarea' },
      { key: 'ten', prop: 'templateFields.ten', type: 'textarea' },
      { key: 'ketsu', prop: 'templateFields.ketsu', type: 'textarea' },
    ],
    beats: [
      { key: 'ki', color: '#6366f1', spineRef: 'ki' },
      { key: 'sho', color: '#3b82f6', spineRef: 'sho' },
      { key: 'ten', color: '#f97316', spineRef: 'ten' },
      { key: 'ketsu', color: '#16a34a', spineRef: 'ketsu' },
    ],
    aiDescription:
      '起承转合: 起 (introduce characters/world) → 承 (develop the situation) → 转 (unexpected twist or shift in perspective — NOT a conflict) → 合 (reconcile and resolve). Ideal for literary fiction, slice-of-life, cozy stories, and East Asian narratives that do not require conflict.',
  },
}

/** Get the template config for a story (defaults to snowflake). */
export function getTemplate(story) {
  return TEMPLATES[story?.template] ?? TEMPLATES.snowflake
}

/** Read a spine field value from a story object. */
export function getSpineFieldValue(story, prop) {
  if (prop.startsWith('templateFields.')) {
    const key = prop.slice('templateFields.'.length)
    return story?.templateFields?.[key] ?? ''
  }
  return story?.[prop] ?? ''
}

/**
 * Return a partial update object that sets a spine field value.
 * Handles both direct props and nested templateFields.
 */
export function setSpineFieldPatch(story, prop, value) {
  if (prop.startsWith('templateFields.')) {
    const key = prop.slice('templateFields.'.length)
    return { templateFields: { ...(story?.templateFields ?? {}), [key]: value } }
  }
  return { [prop]: value }
}

/** Get the spine reference text for a beat section (used in OutlineView). */
export function getSpineTextForBeat(story, beatKey) {
  const tpl = getTemplate(story)
  const beat = tpl.beats.find((b) => b.key === beatKey)
  if (!beat?.spineRef) return ''
  const field = tpl.spineFields.find((f) => f.key === beat.spineRef)
  if (!field) return ''
  return getSpineFieldValue(story, field.prop)
}

/** Get the beat color for a beat key (returns grey if not found). */
export function getBeatColor(story, beatKey) {
  const tpl = getTemplate(story)
  return tpl.beats.find((b) => b.key === beatKey)?.color ?? '#a1a1aa'
}

/** Get valid beat keys for a story's template. */
export function getValidBeatKeys(story) {
  return getTemplate(story).beats.map((b) => b.key)
}

/**
 * Build a human-readable spine summary for AI prompts.
 * Returns a multi-line string with all non-empty spine fields.
 */
export function buildSpineSummary(story) {
  const tpl = getTemplate(story)
  const lines = []
  for (const field of tpl.spineFields) {
    const val = getSpineFieldValue(story, field.prop)
    if (val?.trim()) lines.push(`${field.key}: ${val.trim()}`)
  }
  return lines.length ? lines.join('\n') : '(Story spine not filled yet)'
}
