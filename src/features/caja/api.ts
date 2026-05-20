import { apiClient } from '@/shared/api/client'

export type TipoMovimientoCaja = 'SANGRIA' | 'INGRESO' | 'DEVOLUCION'

export interface SesionCaja {
  id: number
  admin_id: number
  abierta_por: number
  nombre_abierta_por: string
  estado: 'abierta' | 'cerrada'
  monto_inicial: number
  fecha_apertura: string
  cerrada_por: number | null
  nombre_cerrada_por: string
  monto_real_efectivo: number | null
  notas_apertura: string
  notas_cierre: string
  fecha_cierre: string | null
  resumen_efectivo: number | null
  resumen_transferencia: number | null
  resumen_tarjeta: number | null
  resumen_otros: number | null
  resumen_total: number | null
  resumen_gastos_efectivo: number
  resumen_sangrias: number
  resumen_ingresos: number
  resumen_devoluciones: number
  diferencia_efectivo: number | null
  created_at: string
}

export interface ResumenTiempoReal {
  efectivo: number
  transferencia: number
  tarjeta: number
  otros: number
  total: number
  num_pagos: number
  gastos_efectivo: number
  sangrias: number
  ingresos: number
  devoluciones: number
}

export interface MovimientoCaja {
  id: number
  sesion_caja_id: number
  tipo: TipoMovimientoCaja
  monto: number
  motivo: string
  referencia: string
  creado_por: number
  nombre_creado_por: string
  created_at: string
}

export interface CrearMovimientoDto {
  tipo: TipoMovimientoCaja
  monto: number
  motivo: string
  referencia?: string
}

export interface ZReport {
  sesion: SesionCaja
  movimientos: MovimientoCaja[]
  efectivo_esperado: number
  diferencia: number
  generado_en: string
}

export interface ResumenCajaActiva {
  sesion: SesionCaja
  resumen: ResumenTiempoReal
}

export interface CajasActivasTotales {
  sesiones: ResumenCajaActiva[]
  total_efectivo: number
  total_transferencia: number
  total_tarjeta: number
  total_otros: number
  total_ventas: number
  num_sesiones: number
}

export const cajaApi = {
  estado: () =>
    apiClient.get<SesionCaja | null>('/caja/estado').then((r) => r.data),

  activas: () =>
    apiClient.get<CajasActivasTotales>('/caja/activas').then((r) => r.data),

  abrir: (data: { monto_inicial: number; notas?: string }) =>
    apiClient.post<SesionCaja>('/caja/abrir', data).then((r) => r.data),

  cerrar: (sesionId: number, data: { monto_real_efectivo: number; notas?: string }) =>
    apiClient.post<SesionCaja>(`/caja/${sesionId}/cerrar`, data).then((r) => r.data),

  resumen: (sesionId: number) =>
    apiClient.get<ResumenTiempoReal>(`/caja/${sesionId}/resumen`).then((r) => r.data),

  historial: (limit = 30) =>
    apiClient.get<SesionCaja[]>('/caja/historial', { params: { limit } }).then((r) => r.data),

  obtener: (sesionId: number) =>
    apiClient.get<SesionCaja>(`/caja/${sesionId}`).then((r) => r.data),

  // ─── Movimientos ─────────────────────────────────────────────────────────

  listarMovimientos: (sesionId: number) =>
    apiClient.get<MovimientoCaja[]>(`/caja/${sesionId}/movimientos`).then((r) => r.data),

  crearMovimiento: (sesionId: number, dto: CrearMovimientoDto) =>
    apiClient.post<MovimientoCaja>(`/caja/${sesionId}/movimientos`, dto).then((r) => r.data),

  eliminarMovimiento: (sesionId: number, movId: number) =>
    apiClient.delete(`/caja/${sesionId}/movimientos/${movId}`).then((r) => r.data),

  // ─── Z-Report ────────────────────────────────────────────────────────────

  zReport: (sesionId: number) =>
    apiClient.get<ZReport>(`/caja/${sesionId}/z-report`).then((r) => r.data),

  zReportCsvUrl: (sesionId: number) =>
    `/api/v1/caja/${sesionId}/z-report.csv`,

  /** Descarga el CSV del Z-report como blob (con auth del axios client). */
  downloadZReportCsv: async (sesionId: number): Promise<void> => {
    const resp = await apiClient.get(`/caja/${sesionId}/z-report.csv`, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zreport_caja_${sesionId}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
