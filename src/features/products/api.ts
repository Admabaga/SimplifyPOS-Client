import { apiClient } from '@/shared/api/client'
import type { Producto, ProductoPrecio, PaginationParams } from '@/shared/types'

export interface CreateProductoDto {
  nombre: string
  codigo?: string
  descripcion?: string
  categoria_id?: number
  activo?: boolean
  stock_inicial?: number
  precio_costo_inicial?: number
}

export interface CreateProductoPrecioDto {
  nombre: string
  precio: number
  cantidad: number
}

export const productsApi = {
  getAll: (params?: PaginationParams) =>
    apiClient.get<Producto[]>('/products', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<Producto>(`/products/${id}`).then((r) => r.data),

  create: (dto: CreateProductoDto) =>
    apiClient.post<Producto>('/products', dto).then((r) => r.data),

  update: (id: number, dto: Partial<CreateProductoDto>) =>
    apiClient.patch<Producto>(`/products/${id}`, dto).then((r) => r.data),

  remove: (id: number) =>
    apiClient.delete(`/products/${id}`).then((r) => r.data),

  getPrices: (productId: number) =>
    apiClient.get<ProductoPrecio[]>(`/products/${productId}/prices`).then((r) => r.data),

  addPrice: (productId: number, dto: CreateProductoPrecioDto) =>
    apiClient.post<ProductoPrecio>(`/products/${productId}/prices`, dto).then((r) => r.data),

  removePrice: (productId: number, priceId: number) =>
    apiClient.delete(`/products/${productId}/prices/${priceId}`).then((r) => r.data),
}
