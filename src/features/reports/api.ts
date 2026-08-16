import { apiClient } from '@/shared/api/client'
import type { ReporteMensual, ReporteRango, AuditEntry, Gasto } from '@/shared/types'

export const reportesApi = {
  monthly: (year: number, month: number) =>
    apiClient.get<ReporteMensual>('/reports/monthly', { params: { year, month } }).then((r) => r.data),

  /** P&L de un rango arbitrario (YYYY-MM-DD, inclusive en ambos extremos). */
  range: (desde: string, hasta: string) =>
    apiClient.get<ReporteRango>('/reports/range', { params: { desde, hasta } }).then((r) => r.data),

  audit: (params?: { limit?: number; offset?: number; user_id?: number; resource?: string }) =>
    apiClient.get<AuditEntry[]>('/reports/audit', { params }).then((r) => r.data),

  expensesMonthly: (year: number, month: number) =>
    apiClient.get<Gasto[]>('/reports/expenses/monthly', { params: { year, month } }).then((r) => r.data),
}
