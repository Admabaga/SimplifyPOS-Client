import { apiClient } from '@/shared/api/client'

export interface StockNotification {
  type: 'low_stock'
  severity: 'critical' | 'warning'
  titulo: string
  product_id: number
  product_nombre: string
  product_codigo: string
  stock_actual: number
  threshold_qty: number
  threshold_pct: number
  ventas_periodo: number
  dias_periodo: number
  avg_semanal: number
  dias_restantes: number
  high_seller: boolean
  mensaje: string
}

export interface StockAlertsResponse {
  count: number
  critical: number
  warning: number
  notifications: StockNotification[]
  periodo_dias: number
}

export const notificationsApi = {
  getStockAlerts: (days = 90) =>
    apiClient
      .get<StockAlertsResponse>('/notifications/stock', { params: { days } })
      .then((r) => r.data),
}
