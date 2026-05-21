import { apiClient } from './client'

export interface AIResponse {
  analysis: string
  context?: Record<string, unknown>
  generated_at?: string
}

export const aiApi = {
  posAdvisor: () =>
    apiClient.post<AIResponse>('/ai/pos-advisor').then((r) => r.data),

  marketing: (analytics: Record<string, unknown>) =>
    apiClient.post<AIResponse>('/ai/marketing', { analytics }).then((r) => r.data),
}
