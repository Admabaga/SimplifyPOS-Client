import { apiClient } from '@/shared/api/client'

export interface Tenant {
  id: number
  nombre: string
  email: string
  activo: boolean
  total_productos: number
  cuentas_abiertas: number
  saldo_pendiente: number
  total_ventas: number
}

export interface MasterAnalytics {
  tenants: {
    total: number
    activos: number
    inactivos: number
    nuevos_30d: number
    nuevos_30d_prev: number
    delta_pct: number | null
    serie_mensual: { ym: string; n: number }[]
    geo: { ciudad: string; n: number }[]
  }
  gmv: {
    total: number
    mes_actual: number
    mes_anterior: number
    delta_pct: number | null
    serie_mensual: { ym: string; gmv: number; n: number }[]
  }
  totales: {
    ventas: number
    pagos_recibidos: number
    gastos_registrados: number
    cuentas_por_cobrar: number
    usuarios: number
  }
  engagement: {
    dau: number
    wau: number
    mau: number
    dau_wau_ratio: number
    wau_mau_ratio: number
  }
  top_tenants: {
    admin_id: number
    nombre: string
    ciudad: string | null
    gmv: number
    ventas: number
  }[]
  audit: {
    serie_diaria: { d: string; n: number }[]
    top_acciones: { action: string; n: number }[]
  }
  generated_at: string
}

export type HealthLevel = 'green' | 'yellow' | 'red'

export interface HealthReason {
  severity: 'success' | 'warning' | 'danger' | 'info'
  key: string
  label: string
  penalty: number
}

export interface TenantHealth {
  admin_id: number
  nombre: string
  email: string
  score: number
  level: HealthLevel
  days_since_login: number | null
  days_since_sale: number | null
  caja_today: boolean
  dian_configured: boolean
  dian_errors_30d: number
  cuentas_morosas_30d: number
  reasons: HealthReason[]
}

export interface HealthAlert {
  admin_id: number
  nombre: string
  level: HealthLevel
  score: number
  main_reason: string
}

export interface HealthScores {
  tenants: TenantHealth[]
  summary: { green: number; yellow: number; red: number; total: number }
  alerts: HealthAlert[]
}

export const masterApi = {
  listTenants: () =>
    apiClient.get<Tenant[]>('/master/tenants').then((r) => r.data),

  toggleActivo: (adminId: number) =>
    apiClient.patch(`/master/tenants/${adminId}/toggle-activo`).then((r) => r.data),

  analytics: () =>
    // Timeout 60s: muchas queries cross-tenant + posible cold start de Render free.
    apiClient
      .get<MasterAnalytics>('/master/analytics', { timeout: 60_000 })
      .then((r) => r.data),

  healthScores: () =>
    apiClient
      .get<HealthScores>('/master/health-scores', { timeout: 60_000 })
      .then((r) => r.data),

  healthDetalle: (adminId: number) =>
    apiClient
      .get<TenantHealth>(`/master/health-scores/${adminId}`)
      .then((r) => r.data),
}
