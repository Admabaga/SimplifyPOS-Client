import { apiClient } from '@/shared/api/client'
import type { Cuenta, Venta, Pago, PaginationParams } from '@/shared/types'

export interface CreateCuentaDto {
  nombre: string
  cliente_id?: number    // si viene, copia el snapshot fiscal del cliente
}

export interface AddVentaDto {
  producto_id: number
  producto_precio_id: number
  cantidad: number
  precio_manual?: number   // override precio (descuento aplicado)
}

export interface AddPagoDto {
  medio_pago_id: number
  sub_total: number
  descripcion?: string
}

export interface AsignarClienteDto {
  tipo_doc?: string | null
  documento?: string | null
  nombre_fiscal?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
}

export interface CuentasStats {
  abiertas: number
  pagadas: number
  deuda_total: number
  recaudado: number
}

export const cuentasApi = {
  getAll: (params?: PaginationParams & { solo_abiertas?: boolean }) =>
    apiClient.get<Cuenta[]>('/accounts', { params }).then((r) => r.data),

  /** Agregados exactos del tenant (no dependen de paginación). */
  stats: () =>
    apiClient.get<CuentasStats>('/accounts/stats').then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<Cuenta>(`/accounts/${id}`).then((r) => r.data),

  create: (dto: CreateCuentaDto) =>
    apiClient.post<Cuenta>('/accounts', dto).then((r) => r.data),

  addVenta: (cuentaId: number, dto: AddVentaDto) =>
    apiClient.post<Venta>(`/accounts/${cuentaId}/ventas`, dto).then((r) => r.data),

  deleteVenta: (cuentaId: number, ventaId: number) =>
    apiClient.delete(`/accounts/${cuentaId}/ventas/${ventaId}`).then((r) => r.data),

  addPago: (cuentaId: number, dto: AddPagoDto) =>
    apiClient.post<Cuenta>(`/accounts/${cuentaId}/pagos`, { pagos: [dto] }).then((r) => r.data),

  deletePago: (cuentaId: number, pagoId: number) =>
    apiClient.delete(`/accounts/${cuentaId}/pagos/${pagoId}`).then((r) => r.data),

  asignarCliente: (cuentaId: number, dto: AsignarClienteDto) =>
    apiClient.patch<Cuenta>(`/accounts/${cuentaId}/cliente`, dto).then((r) => r.data),
}
