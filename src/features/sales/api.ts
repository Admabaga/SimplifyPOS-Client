import { apiClient } from '@/shared/api/client'

export interface VentaItem {
  id: number
  cuenta_id: number
  producto_id: number
  producto_precio_id: number
  cantidad_unidades: number
  precio_unitario: number
  precio_venta: number
  ganancia: number
  fecha_venta: string
  // Trazabilidad de caja
  vendido_por: number | null
  sesion_caja_id: number | null
  nombre_cajero: string | null
}

export const ventasApi = {
  getAll: (params?: { desde?: string; hasta?: string; limit?: number; offset?: number }) =>
    apiClient.get<VentaItem[]>('/ventas', { params }).then((r) => r.data),
}
