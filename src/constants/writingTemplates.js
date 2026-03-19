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

  // Future templates — uncomment and fill in when ready:
  //
  // threeAct: {
  //   id: 'threeAct',
  //   name: 'Three-Act Structure',
  //   fields: [
  //     { key: 'act1Setup',    label: 'Act 1 — Setup',    coachQuestion: '...' },
  //     { key: 'act1Break',    label: 'Act 1 Break',      coachQuestion: '...' },
  //     { key: 'act2Rising',   label: 'Act 2 — Rising',   coachQuestion: '...' },
  //     { key: 'midpoint',     label: 'Midpoint',         coachQuestion: '...' },
  //     { key: 'act2Break',    label: 'Act 2 Break',      coachQuestion: '...' },
  //     { key: 'act3Climax',   label: 'Act 3 — Climax',   coachQuestion: '...' },
  //     { key: 'resolution',   label: 'Resolution',       coachQuestion: '...' },
  //   ],
  // },
}

export const DEFAULT_TEMPLATE_ID = 'snowflake'
