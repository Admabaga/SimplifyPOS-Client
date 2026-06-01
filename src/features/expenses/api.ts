import { apiClient } from '@/shared/api/client'
import type { Gasto, PaginationParams } from '@/shared/types'

export type MetodoPagoGasto = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'

export interface CreateGastoDto {
  descripcion: string
  monto: number
  fecha: string
  categoria?: string
  metodo_pago: MetodoPagoGasto
  comprobante_path?: string | null
}

export interface GastosStats {
  total: number
  total_mes: number
  max_gasto: number
  count: number
}

export const gastosApi = {
  getAll: (params?: PaginationParams) =>
    apiClient.get<Gasto[]>('/expenses', { params }).then((r) => r.data),

  /** Agregados exactos del tenant (no dependen de paginación). */
  stats: () =>
    apiClient.get<GastosStats>('/expenses/stats').then((r) => r.data),

  create: (dto: CreateGastoDto) =>
    apiClient.post<Gasto>('/expenses', dto).then((r) => r.data),

  update: (id: number, dto: Partial<CreateGastoDto>) =>
    apiClient.patch<Gasto>(`/expenses/${id}`, dto).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/expenses/${id}`).then((r) => r.data),

  /** Sube un archivo (foto/PDF) como comprobante. Devuelve el path para enviar al crear el gasto. */
  uploadComprobante: async (file: File): Promise<{ path: string }> => {
    const form = new FormData()
    form.append('file', file)
    const r = await apiClient.post<{ path: string }>('/expenses/upload-comprobante', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return r.data
  },
}
