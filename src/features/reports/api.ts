import { apiClient } from '@/shared/api/client'
import type { ReporteMensual, AuditEntry, Gasto } from '@/shared/types'

export const reportesApi = {
  monthly: (year: number, month: number) =>
    apiClient.get<ReporteMensual>('/reports/monthly', { params: { year, month } }).then((r) => r.data),

  audit: (params?: { limit?: number; offset?: number; user_id?: number; resource?: string }) =>
    apiClient.get<AuditEntry[]>('/reports/audit', { params }).then((r) => r.data),

  expensesMonthly: (year: number, month: number) =>
    apiClient.get<Gasto[]>('/reports/expenses/monthly', { params: { year, month } }).then((r) => r.data),
}
