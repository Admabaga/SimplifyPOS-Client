import { apiClient } from '@/shared/api/client'

export interface Tenant {
  id: number
  nombre: string
  email: string
  activo: boolean
  total_productos: number
  cuentas_abiertas: number
  saldo_pendiente: number
  total_ventas: number
}

export const masterApi = {
  listTenants: () =>
    apiClient.get<Tenant[]>('/master/tenants').then((r) => r.data),

  toggleActivo: (adminId: number) =>
    apiClient.patch(`/master/tenants/${adminId}/toggle-activo`).then((r) => r.data),
}
