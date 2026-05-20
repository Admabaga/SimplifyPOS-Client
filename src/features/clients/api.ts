import { apiClient } from '@/shared/api/client'
import type { Cliente } from '@/shared/types'

export interface ClienteDto {
  nombre_fiscal: string
  tipo_doc?: string | null
  documento?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
}

export const clientesApi = {
  getAll: (solo_activos = true) =>
    apiClient.get<Cliente[]>('/clients', { params: { solo_activos } }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<Cliente>(`/clients/${id}`).then((r) => r.data),

  create: (dto: ClienteDto) =>
    apiClient.post<Cliente>('/clients', dto).then((r) => r.data),

  update: (id: number, dto: ClienteDto) =>
    apiClient.put<Cliente>(`/clients/${id}`, dto).then((r) => r.data),

  deactivate: (id: number) =>
    apiClient.delete(`/clients/${id}`).then((r) => r.data),

  seedGenericos: () =>
    apiClient.post<Cliente[]>('/clients/seed-genericos').then((r) => r.data),
}
