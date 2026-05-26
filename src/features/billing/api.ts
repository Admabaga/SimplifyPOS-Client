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

  reintentarDian: (id: number) =>
    apiClient.post<Ticket>(`/billing/tickets/${id}/reintentar-dian`).then((r) => r.data),
}

// ─── Notas Crédito/Débito ─────────────────────────────────────────────────────

export type TipoNota = 'CREDITO' | 'DEBITO'

export interface Nota {
  id: number
  tipo: TipoNota
  ticket_original_id: number
  ticket_original_numero: string
  ticket_original_cufe: string | null
  numero_completo: string
  motivo: string
  motivo_codigo: string
  subtotal: number
  valor_iva: number
  total: number
  cufe: string | null
  estado_dian: string
  dian_tracking_id: string | null
  dian_mensaje: string | null
  dian_intentos: number
  fecha_emision: string
}

export interface EmitirNotaInput {
  ticket_original_id: number
  tipo: TipoNota
  motivo: string
  motivo_codigo: '1' | '2' | '3' | '4' | '5'
  subtotal: number
  valor_iva: number
  total: number
}

export const notasApi = {
  emitir: (data: EmitirNotaInput) =>
    apiClient.post<Nota>('/notas', data).then((r) => r.data),

  list: (limit = 100, offset = 0) =>
    apiClient.get<Nota[]>('/notas', { params: { limit, offset } }).then((r) => r.data),

  byTicket: (ticketId: number) =>
    apiClient.get<Nota[]>(`/notas/ticket/${ticketId}`).then((r) => r.data),

  reintentarDian: (id: number) =>
    apiClient.post<Nota>(`/notas/${id}/reintentar-dian`).then((r) => r.data),
}
