/**
 * Writing template definitions — single source of truth for all writing frameworks.
 *
 * Each template defines the structural fields a story should fill in, along with
 * a coach question Pip uses when that field is the next missing one.
 *
 * Pip reads field labels and coachQuestions from the active template, so adding
 * a new template automatically gives Pip the right vocabulary without touching
 * any coaching logic.
 */

export const WRITING_TEMPLATES = {
  snowflake: {
    id: 'snowflake',
    name: 'Snowflake Method',
    fields: [
      { key: 'oneSentence', prop: 'oneSentence', label: 'One-sentence summary', coachQuestionKey: 'pip.coachQuestion.snowflake.oneSentence' },
      { key: 'setup', prop: 'setup', label: 'Setup', coachQuestionKey: 'pip.coachQuestion.snowflake.setup' },
      { key: 'disaster1', prop: 'disaster1', label: 'Disaster 1', coachQuestionKey: 'pip.coachQuestion.snowflake.disaster1' },
      { key: 'disaster2', prop: 'disaster2', label: 'Disaster 2', coachQuestionKey: 'pip.coachQuestion.snowflake.disaster2' },
      { key: 'disaster3', prop: 'disaster3', label: 'Disaster 3', coachQuestionKey: 'pip.coachQuestion.snowflake.disaster3' },
      { key: 'ending', prop: 'ending', label: 'Ending', coachQuestionKey: 'pip.coachQuestion.snowflake.ending' },
    ],
  },

  save_the_cat: {
    id: 'save_the_cat',
    name: 'Save the Cat',
    fields: [
      { key: 'logline', prop: 'templateFields.logline', label: 'Logline', coachQuestionKey: 'pip.coachQuestion.save_the_cat.logline' },
      { key: 'catalyst', prop: 'templateFields.catalyst', label: 'Catalyst / Break Into Two', coachQuestionKey: 'pip.coachQuestion.save_the_cat.catalyst' },
      { key: 'debate', prop: 'templateFields.debate', label: 'Fun & Games', coachQuestionKey: 'pip.coachQuestion.save_the_cat.debate' },
      { key: 'midpoint', prop: 'templateFields.midpoint', label: 'Midpoint', coachQuestionKey: 'pip.coachQuestion.save_the_cat.midpoint' },
      { key: 'allIsLost', prop: 'templateFields.allIsLost', label: 'All Is Lost', coachQuestionKey: 'pip.coachQuestion.save_the_cat.allIsLost' },
      { key: 'finale', prop: 'templateFields.finale', label: 'Finale', coachQuestionKey: 'pip.coachQuestion.save_the_cat.finale' },
    ],
  },

  story_circle: {
    id: 'story_circle',
    name: 'Story Circle',
    fields: [
      { key: 'you', prop: 'templateFields.you', label: 'You — Stasis', coachQuestionKey: 'pip.coachQuestion.story_circle.you' },
      { key: 'need', prop: 'templateFields.need', label: 'Need', coachQuestionKey: 'pip.coachQuestion.story_circle.need' },
      { key: 'go', prop: 'templateFields.go', label: 'Go — Into the Unknown', coachQuestionKey: 'pip.coachQuestion.story_circle.go' },
      { key: 'search', prop: 'templateFields.search', label: 'Search', coachQuestionKey: 'pip.coachQuestion.story_circle.search' },
      { key: 'find', prop: 'templateFields.find', label: 'Find', coachQuestionKey: 'pip.coachQuestion.story_circle.find' },
      { key: 'take', prop: 'templateFields.take', label: 'Take — Pay the Price', coachQuestionKey: 'pip.coachQuestion.story_circle.take' },
      { key: 'return', prop: 'templateFields.return', label: 'Return', coachQuestionKey: 'pip.coachQuestion.story_circle.return' },
      { key: 'change', prop: 'templateFields.change', label: 'Change', coachQuestionKey: 'pip.coachQuestion.story_circle.change' },
    ],
  },

  hero_journey: {
    id: 'hero_journey',
    name: "Hero's Journey",
    fields: [
      { key: 'premise', prop: 'templateFields.premise', label: 'Story premise', coachQuestionKey: 'pip.coachQuestion.hero_journey.premise' },
      { key: 'call', prop: 'templateFields.call', label: 'Call to Adventure', coachQuestionKey: 'pip.coachQuestion.hero_journey.call' },
      { key: 'trials', prop: 'templateFields.trials', label: 'Road of Trials', coachQuestionKey: 'pip.coachQuestion.hero_journey.trials' },
      { key: 'ordeal', prop: 'templateFields.ordeal', label: 'Supreme Ordeal', coachQuestionKey: 'pip.coachQuestion.hero_journey.ordeal' },
      { key: 'elixir', prop: 'templateFields.elixir', label: 'Return with the Elixir', coachQuestionKey: 'pip.coachQuestion.hero_journey.elixir' },
    ],
  },

  kishotenketsu: {
    id: 'kishotenketsu',
    name: '起承转合',
    fields: [
      { key: 'ki', prop: 'templateFields.ki', label: '起 — Introduction', coachQuestionKey: 'pip.coachQuestion.kishotenketsu.ki' },
      { key: 'sho', prop: 'templateFields.sho', label: '承 — Development', coachQuestionKey: 'pip.coachQuestion.kishotenketsu.sho' },
      { key: 'ten', prop: 'templateFields.ten', label: '转 — Twist', coachQuestionKey: 'pip.coachQuestion.kishotenketsu.ten' },
      { key: 'ketsu', prop: 'templateFields.ketsu', label: '合 — Resolution', coachQuestionKey: 'pip.coachQuestion.kishotenketsu.ketsu' },
    ],
  },
}

export const DEFAULT_TEMPLATE_ID = 'snowflake'

/**
 * Read a template field value from a story object.
 * Handles both direct props (snowflake) and nested templateFields (all others).
 */
export function getTemplateFieldValue(story, field) {
  const prop = field.prop ?? field.key
  if (prop.startsWith('templateFields.')) {
    const k = prop.slice('templateFields.'.length)
    return story?.templateFields?.[k] ?? ''
  }
  return story?.[prop] ?? ''
}
