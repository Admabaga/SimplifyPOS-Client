import apiClient from '@/shared/api/client'
import type { AuditEntry } from '@/shared/types'

export const auditApi = {
  list: (params?: { limit?: number; offset?: number; user_id?: number; resource?: string }) =>
    apiClient.get<AuditEntry[]>('/reports/audit', { params }).then((r) => r.data),
}
