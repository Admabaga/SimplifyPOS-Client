import { apiClient } from '@/shared/api/client'
import type { Factura, PaginationParams } from '@/shared/types'

export interface CompraItemDto {
  producto_id: number
  cantidad: number       // backend field name
  precio_total: number
}

export interface CreateFacturaDto {
  proveedor_id: number
  items: CompraItemDto[] // backend field name
}

export const facturasApi = {
  getAll: (params?: PaginationParams) =>
    apiClient.get<Factura[]>('/invoices', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<Factura>(`/invoices/${id}`).then((r) => r.data),

  create: (dto: CreateFacturaDto) =>
    apiClient.post<Factura>('/invoices', dto).then((r) => r.data),

  deleteCompra: (compraId: number) =>
    apiClient.delete(`/invoices/compras/${compraId}`).then((r) => r.data),
}
