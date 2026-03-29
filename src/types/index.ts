// InkFlow data model interfaces
// These match the Dexie schema defined in src/db/index.js (v6)

export interface Story {
  id: string
  title: string
  template: string
  oneSentence?: string
  setup?: string
  disaster1?: string
  disaster2?: string
  disaster3?: string
  ending?: string
  templateFields?: Record<string, string>
  updatedAt: number
  createdAt: number
}

export interface Chapter {
  id: string
  storyId: string
  title: string
  summary?: string
  aiSummary?: string
  aiSummaryAt?: number
  beat?: string
  order: number
  createdAt: number
}

export interface Scene {
  id: string
  chapterId: string
  title: string
  prose?: string
  oneSentenceSummary?: string
  aiSummary?: string
  aiSummaryAt?: number
  povCharacterId?: string
  notes?: string
  order: number
  createdAt: number
}

export interface Character {
  id: string
  storyId: string
  name: string
  oneSentence?: string
  goal?: string
  motivation?: string
  conflict?: string
  epiphany?: string
  createdAt: number
}

export interface CharacterRelationship {
  id: string
  storyId: string
  fromCharId: string
  toCharId: string
  relationship: string
  createdAt: number
}

export interface Idea {
  id: string
  storyId: string
  type: string
  title: string
  body?: string
  createdAt: number
}

export interface IdeaCustomType {
  id: string
  name: string
  createdAt: number
}

export interface StoryFact {
  id: string
  storyId: string
  factType: 'character_state' | 'location' | 'event' | 'open_thread'
  characterId?: string
  content: string
  resolved?: boolean
  createdAt: number
}

export interface ChatMessage {
  id?: number
  storyId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type Theme = 'light' | 'dark' | 'system'
export type Locale = 'en' | 'zh' | 'fr' | 'es'
