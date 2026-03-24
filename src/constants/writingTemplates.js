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
      {
        key: 'oneSentence',
        label: 'One-sentence summary',
        coachQuestionKey: 'pip.coachQuestion.snowflake.oneSentence',
      },
      {
        key: 'setup',
        label: 'Setup',
        coachQuestionKey: 'pip.coachQuestion.snowflake.setup',
      },
      {
        key: 'disaster1',
        label: 'Disaster 1',
        coachQuestionKey: 'pip.coachQuestion.snowflake.disaster1',
      },
      {
        key: 'disaster2',
        label: 'Disaster 2',
        coachQuestionKey: 'pip.coachQuestion.snowflake.disaster2',
      },
      {
        key: 'disaster3',
        label: 'Disaster 3',
        coachQuestionKey: 'pip.coachQuestion.snowflake.disaster3',
      },
      {
        key: 'ending',
        label: 'Ending',
        coachQuestionKey: 'pip.coachQuestion.snowflake.ending',
      },
    ],
  },

  hero_journey: {
    id: 'hero_journey',
    name: "Hero's Journey",
    fields: [
      { key: 'premise', label: 'Story premise',          coachQuestionKey: 'pip.coachQuestion.hero_journey.premise' },
      { key: 'call',    label: 'Call to Adventure',      coachQuestionKey: 'pip.coachQuestion.hero_journey.call'    },
      { key: 'trials',  label: 'Road of Trials',         coachQuestionKey: 'pip.coachQuestion.hero_journey.trials'  },
      { key: 'ordeal',  label: 'Supreme Ordeal',         coachQuestionKey: 'pip.coachQuestion.hero_journey.ordeal'  },
      { key: 'elixir',  label: 'Return with the Elixir', coachQuestionKey: 'pip.coachQuestion.hero_journey.elixir'  },
    ],
  },

  kishotenketsu: {
    id: 'kishotenketsu',
    name: '起承转合',
    fields: [
      { key: 'ki',    label: '起 — Introduction', coachQuestionKey: 'pip.coachQuestion.kishotenketsu.ki'    },
      { key: 'sho',   label: '承 — Development',  coachQuestionKey: 'pip.coachQuestion.kishotenketsu.sho'   },
      { key: 'ten',   label: '转 — Twist',         coachQuestionKey: 'pip.coachQuestion.kishotenketsu.ten'   },
      { key: 'ketsu', label: '合 — Resolution',    coachQuestionKey: 'pip.coachQuestion.kishotenketsu.ketsu' },
    ],
  },
}

export const DEFAULT_TEMPLATE_ID = 'snowflake'
