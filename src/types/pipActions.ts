// Pip AI action discriminated union
// These types match the action shapes parsed in src/services/pipActions.js

export type IdeaType =
  | 'plot'
  | 'subplot'
  | 'scene'
  | 'event'
  | 'character'
  | 'relationship'
  | 'faction'
  | 'world'
  | 'location'
  | 'culture'
  | 'item'
  | 'creature'
  | 'magic_system'
  | 'technology'
  | 'concept'
  | 'conflict'
  | 'mystery'
  | 'symbol'
  | 'prophecy'
  | 'other'

export type PipAction =
  | { type: 'update_spine'; fields: Record<string, string> }
  | { type: 'recommend_template'; template: string }
  | {
      type: 'upsert_character'
      name: string
      fields?: Partial<{
        oneSentence: string
        goal: string
        motivation: string
        conflict: string
        epiphany: string
      }>
    }
  | {
      type: 'add_chapter'
      title: string
      fields?: { beat?: string; summary?: string }
      after_chapter_title?: string
    }
  | {
      type: 'update_chapter'
      title_match: string
      fields?: { title?: string; beat?: string; summary?: string }
    }
  | {
      type: 'add_scene'
      title: string
      chapter_title_match: string
      after_scene_title?: string
      fields?: { oneSentenceSummary?: string; notes?: string }
    }
  | {
      type: 'update_scene'
      title_match: string
      chapter_title_match?: string
      fields?: { title?: string; oneSentenceSummary?: string; notes?: string }
    }
  | { type: 'add_idea'; title: string; idea_type?: IdeaType; body?: string }
  | { type: 'generate_prose' }
