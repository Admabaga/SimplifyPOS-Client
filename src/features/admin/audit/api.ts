import apiClient from '@/shared/api/client'
import type { AuditEntry } from '@/shared/types'

export interface AuditListResponse {
  items: AuditEntry[]
  total: number
  limit: number
  offset: number
}

export interface AuditListParams {
  limit?: number
  offset?: number
  user_id?: number
  resource?: string
  action?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface AuditAnomaly {
  type: 'delete_spike' | 'high_activity' | 'login_spike'
  severity: 'high' | 'medium' | 'low'
  message: string
  user_id?: number
  user_email?: string
  ip?: string
  count: number
}

export interface AuditStats {
  totals: { today: number; week: number; month: number }
  by_action: { action: string; count: number }[]
  top_users: { user_id: number; user_email: string; count: number }[]
  top_resources: { resource: string; count: number }[]
  hourly_24h: { hour: number; count: number }[]
  anomalies: AuditAnomaly[]
}

export const auditApi = {
  list: (params?: AuditListParams) =>
    apiClient.get<AuditListResponse>('/reports/audit', { params }).then((r) => r.data),
  stats: () =>
    apiClient.get<AuditStats>('/reports/audit/stats').then((r) => r.data),
}
