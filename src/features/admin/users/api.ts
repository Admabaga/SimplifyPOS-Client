import { apiClient } from '@/shared/api/client'
import type { Usuario } from '@/shared/types'

export interface CreateUsuarioDto {
  email: string
  nombre: string
  role_id: number
}

export interface ResetPasswordResult {
  temp_password: string
  message: string
}

export interface CrearUsuarioResult {
  usuario: Usuario
  temp_password: string
  message: string
}

export const usuariosApi = {
  list: () =>
    apiClient.get<Usuario[]>('/users').then((r) =>
      r.data.map((u) => ({ ...u, role_name: u.role_name.toLowerCase() }))
    ),

  create: (dto: CreateUsuarioDto) =>
    apiClient.post<CrearUsuarioResult>('/users', dto).then((r) => r.data),

  lock: (id: number) =>
    apiClient.post(`/users/${id}/lock`).then(() => undefined),

  unlock: (id: number) =>
    apiClient.post(`/users/${id}/unlock`).then(() => undefined),

  resetPassword: (id: number) =>
    apiClient.post<ResetPasswordResult>(`/users/${id}/reset-password`).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/users/${id}`).then(() => undefined),

  changeRole: (id: number, role_id: number) =>
    apiClient.patch(`/users/${id}`, { role_id }).then((r) => r.data),
}
