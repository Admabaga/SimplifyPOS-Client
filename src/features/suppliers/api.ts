import { apiClient } from '@/shared/api/client'
import type { Proveedor } from '@/shared/types'

export interface CreateProveedorDto {
  nombre: string
  telefono?: string
  email?: string
  direccion?: string
}

export const proveedoresApi = {
  getAll: () =>
    apiClient.get<Proveedor[]>('/suppliers').then((r) => r.data),

  create: (dto: CreateProveedorDto) =>
    apiClient.post<Proveedor>('/suppliers', dto).then((r) => r.data),

  update: (id: number, dto: Partial<CreateProveedorDto>) =>
    apiClient.patch<Proveedor>(`/suppliers/${id}`, dto).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/suppliers/${id}`).then((r) => r.data),
}
