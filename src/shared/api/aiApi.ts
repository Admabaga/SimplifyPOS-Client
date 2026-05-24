import { apiClient } from './client'

export interface AIResponse {
  analysis: string
  context?: Record<string, unknown>
  generated_at?: string
}

// Timeout extendido para IA: Render free cold start (50s) + Anthropic Haiku (10-30s).
// Sin esto axios mata la request a los 15s globales y el server nunca termina de procesar.
const AI_TIMEOUT = 120_000 // 2 min

export const aiApi = {
  posAdvisor: () =>
    apiClient
      .post<AIResponse>('/ai/pos-advisor', undefined, { timeout: AI_TIMEOUT })
      .then((r) => r.data),

  marketing: (analytics: Record<string, unknown>) =>
    apiClient
      .post<AIResponse>('/ai/marketing', { analytics }, { timeout: AI_TIMEOUT })
      .then((r) => r.data),
}
