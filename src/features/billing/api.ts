import { apiClient } from '@/shared/api/client'
import type {
  EmpresaConfig, EmpresaConfigInput,
  ResolucionDian, ResolucionInput,
  Ticket, EmitirTicketInput,
} from './types'

export const billingApi = {
  // Empresa
  getEmpresa: () =>
    apiClient.get<EmpresaConfig | null>('/billing/empresa').then((r) => r.data),

  upsertEmpresa: (data: EmpresaConfigInput) =>
    apiClient.put<EmpresaConfig>('/billing/empresa', data).then((r) => r.data),

  // Resoluciones
  listResoluciones: () =>
    apiClient.get<ResolucionDian[]>('/billing/resoluciones').then((r) => r.data),

  createResolucion: (data: ResolucionInput) =>
    apiClient.post<ResolucionDian>('/billing/resoluciones', data).then((r) => r.data),

  activarResolucion: (id: number) =>
    apiClient.post<ResolucionDian>(`/billing/resoluciones/${id}/activar`).then((r) => r.data),

  deleteResolucion: (id: number) =>
    apiClient.delete(`/billing/resoluciones/${id}`).then((r) => r.data),

  // Tickets
  listTickets: (limit = 50, offset = 0) =>
    apiClient.get<Ticket[]>('/billing/tickets', { params: { limit, offset } }).then((r) => r.data),

  getTicket: (id: number) =>
    apiClient.get<Ticket>(`/billing/tickets/${id}`).then((r) => r.data),

  listByCuenta: (cuentaId: number) =>
    apiClient.get<Ticket[]>(`/billing/cuentas/${cuentaId}/tickets`).then((r) => r.data),

  emitir: (cuentaId: number, data: EmitirTicketInput) =>
    apiClient.post<Ticket>(`/billing/cuentas/${cuentaId}/tickets`, data).then((r) => r.data),

  anular: (id: number, motivo: string) =>
    apiClient.post<Ticket>(`/billing/tickets/${id}/anular`, { motivo }).then((r) => r.data),
}
