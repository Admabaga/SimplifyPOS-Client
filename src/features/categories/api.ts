import { apiClient } from '@/shared/api/client'
import type { Categoria } from '@/shared/types'

export interface CreateCategoriaDto {
  nombre: string
  descripcion?: string
  iva?: number
  codigo_ciiu?: string
  codigo_arancelario_default?: string
}

export const categoriasApi = {
  getAll: () =>
    apiClient.get<Categoria[]>('/categories').then((r) => r.data),

  create: (dto: CreateCategoriaDto) =>
    apiClient.post<Categoria>('/categories', dto).then((r) => r.data),

  update: (id: number, dto: Partial<CreateCategoriaDto>) =>
    apiClient.patch<Categoria>(`/categories/${id}`, dto).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/categories/${id}`).then((r) => r.data),
}
