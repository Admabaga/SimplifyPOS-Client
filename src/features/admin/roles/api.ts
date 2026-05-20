import { apiClient } from '@/shared/api/client'
import type { Rol } from '@/shared/types'

export interface CreateRolDto {
  name: string
  description?: string
}

export interface PermissionsCatalog {
  permissions: string[]
  grouped: Record<string, string[]>
}

export const rolesApi = {
  list: () =>
    apiClient.get<Rol[]>('/roles').then((r) => r.data),

  create: (dto: CreateRolDto) =>
    apiClient.post<Rol>('/roles', dto).then((r) => r.data),

  update: (id: number, dto: Partial<CreateRolDto>) =>
    apiClient.patch<Rol>(`/roles/${id}`, dto).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/roles/${id}`).then((r) => r.data),

  listPermissions: () =>
    apiClient.get<PermissionsCatalog>('/roles/permissions').then((r) => r.data),

  setPermissions: (id: number, permissions: string[]) =>
    apiClient.put<Rol>(`/roles/${id}/permissions`, { permissions }).then((r) => r.data),
}
