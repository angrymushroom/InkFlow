// AI provider and context interfaces
// These types match the structures in src/services/ai.js

export type AiTier = 'light' | 'advanced'
export type ProviderFormat = 'gemini' | 'openai'
export type QualityBias = 'faster' | 'best'

export interface AiProvider {
  id: string
  name: string
  format: ProviderFormat
  baseUrl?: string
  placeholder: string
  keyHelpUrl: string
  keyHelpLabel: string
  defaultModels: Record<AiTier, string>
  fallbackChain: string[]
  modelOptions: Array<{ id: string; name: string }>
}

export interface AiRequestOptions {
  context: string
  tier?: AiTier
  qualityBias?: QualityBias
  systemPrompt?: string
  stream?: boolean
  onChunk?: (chunk: string) => void
}

export interface AiResponse {
  text: string
  model: string
  provider: string
}
