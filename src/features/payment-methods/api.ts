import { apiClient } from '@/shared/api/client'
import type { MedioPago } from '@/shared/types'

export interface CreateMedioPagoDto {
  nombre: string
  descripcion?: string
  comision_porcentaje: number
  tipo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'  // requerido — campo real en backend
}

export interface UpdateMedioPagoDto extends Partial<CreateMedioPagoDto> {
  activo?: boolean  // solo en update
}

export const mediosPagoApi = {
  getAll: () =>
    apiClient.get<MedioPago[]>('/payment-methods').then((r) => r.data),

  create: (dto: CreateMedioPagoDto) =>
    apiClient.post<MedioPago>('/payment-methods', dto).then((r) => r.data),

  update: (id: number, dto: UpdateMedioPagoDto) =>
    apiClient.patch<MedioPago>(`/payment-methods/${id}`, dto).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/payment-methods/${id}`).then((r) => r.data),
}
