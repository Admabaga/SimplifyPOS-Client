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

export interface AuditVerifyIssue {
  type: 'TAMPERED' | 'CHAIN_BROKEN'
  entry_id: number
  user_id: number
  action?: string
  resource?: string
  created_at: string | null
  stored_hash?: string
  expected_hash?: string
  stored_prev?: string
  expected_prev?: string
}

export interface AuditVerifyResult {
  verified_at: string
  total_entries: number
  valid_entries: number
  issues_count: number
  integrity: 'OK' | 'COMPROMISED'
  issues: AuditVerifyIssue[]
  users_checked: number
}

export const auditApi = {
  list: (params?: AuditListParams) =>
    apiClient.get<AuditListResponse>('/reports/audit', { params }).then((r) => r.data),
  stats: () =>
    apiClient.get<AuditStats>('/reports/audit/stats').then((r) => r.data),
  // Timeout largo: recorre toda la tabla audit_log y recalcula SHA-256
  verify: () =>
    apiClient
      .get<AuditVerifyResult>('/reports/audit/verify', { timeout: 60_000 })
      .then((r) => r.data),
  exportCsv: (params?: Omit<AuditListParams, 'limit' | 'offset'>) =>
    apiClient
      .get<Blob>('/reports/audit/export', { params, responseType: 'blob', timeout: 60_000 })
      .then((r) => r.data),
}
