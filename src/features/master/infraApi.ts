import { apiClient } from '@/shared/api/client'

export interface TableRows {
  [table: string]: number
}

export interface InfraMetrics {
  db: {
    engine: string
    source: string
    size_mb: number
    size_bytes: number
    tabla_rows: TableRows
    total_rows: number
  }
  crecimiento: {
    audit_mes_actual: number
    audit_mes_prev: number
    audit_growth_pct: number
    ventas_mes_actual: number
    ventas_mes_prev: number
    ventas_growth_pct: number
    monthly_growth_mb_estimado: number
    audit_serie_mensual: { ym: string; n: number }[]
  }
  actividad: {
    ultimas_24h: { h: string; n: number }[]
    peak_eventos_hora: number
    avg_eventos_hora: number
    errores_mes: number
  }
  tenants: {
    carga_por_tenant: { admin_id: number; eventos: number; pct: number }[]
    top_tenant_concentracion_pct: number
  }
  proyecciones: {
    months_to_500mb: number | null
    months_to_2gb: number | null
    months_to_5m_rows: number | null
    rows_growth_monthly_estimado: number
  }
  salud: {
    score: number
    issues: string[]
  }
  generated_at: string
}

export interface InfraAnalysis {
  analysis: string
  metrics_snapshot: {
    db_size_mb: number
    health_score: number
    issues_count: number
    growth_pct_monthly: number
  }
  generated_at: string
}

export const infraApi = {
  getMetrics: () =>
    apiClient.get<InfraMetrics>('/master/infra/metrics').then((r) => r.data),

  analyze: () =>
    apiClient.post<InfraAnalysis>('/master/infra/analyze').then((r) => r.data),
}
