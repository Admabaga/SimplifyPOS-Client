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

/** Notificación genérica del feed unificado (/notifications/all). Incluye
 *  alertas de stock + negocio (suscripción, cupo DIAN, caja sin cerrar). */
export interface AppNotification {
  type: 'low_stock' | 'subscription' | 'dian_quota' | 'caja'
  severity: 'critical' | 'warning' | 'info'
  titulo: string
  mensaje: string
  key?: string
  /** Ruta a la que navegar al hacer clic (ej. /cuenta/suscripcion, /caja). */
  action_url?: string
  // Campos específicos de stock (presentes solo cuando type === 'low_stock')
  product_id?: number
  product_nombre?: string
  product_codigo?: string
  stock_actual?: number
  dias_restantes?: number
  avg_semanal?: number
}

export interface AllAlertsResponse {
  count: number
  critical: number
  warning: number
  info: number
  notifications: AppNotification[]
}

export const notificationsApi = {
  getStockAlerts: (days = 90, force = false) =>
    apiClient
      .get<StockAlertsResponse>('/notifications/stock', { params: { days, force } })
      .then((r) => r.data),

  /** Feed unificado: stock + suscripción + cupo DIAN + caja. */
  getAll: () =>
    apiClient.get<AllAlertsResponse>('/notifications/all').then((r) => r.data),
}
