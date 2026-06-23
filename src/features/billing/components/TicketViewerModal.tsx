/**
 * TicketViewerModal — Visor / impresor de un Ticket ya emitido.
 *
 * Renderiza el documento legal con:
 *  - Identificación empresa (razón social, NIT, régimen)
 *  - Identificación cliente (si aplica)
 *  - Numeración + resolución DIAN (si aplica)
 *  - Detalle por línea con IVA discriminado
 *  - Totales: base + IVA + total
 *  - Código de verificación + hash de integridad
 *
 * Impresión: misma estrategia visibility-hidden con ID único por ticket.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, FileMinus, RefreshCw, CreditCard, Banknote, Smartphone, Repeat2, CheckCircle2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { Button, Modal, Badge } from '@/shared/components/ui'
import { formatCOP, formatDateTime, formatDate } from '@/shared/lib/formatters'
import type { Ticket } from '../types'
import type { Pago, Cuenta } from '@/shared/types/index'
import { billingApi } from '../api'
import { cuentasApi } from '@/features/accounts/api'
import DianEstadoBadge from './DianEstadoBadge'
import EmitirNotaCreditoModal from './EmitirNotaCreditoModal'

interface Props {
  open: boolean
  onClose: () => void
  ticket: Ticket
  /** Pagos registrados en la cuenta — si no se pasan, se obtienen automáticamente */
  pagos?: Pago[]
}

function buildPrintCss(rootId: string) {
  return `
@media print {
  @page { size: 80mm auto; margin: 3mm 4mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #${rootId}, #${rootId} * { visibility: visible !important; }
  #${rootId} {
    position: absolute !important; left: 0 !important; top: 0 !important;
    width: 72mm !important; margin: 0 !important; padding: 0 !important;
    background: #fff !important;
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 9pt !important; color: #000 !important; line-height: 1.3 !important;
  }
  #${rootId} * {
    font-family: 'Courier New', Courier, monospace !important;
    color: #000 !important; background: transparent !important;
    box-shadow: none !important; border-radius: 0 !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .pt-brand  { font-size: 13pt !important; font-weight: bold !important; text-align: center !important; letter-spacing: 1px !important; margin-bottom: 0.5mm !important; }
  .pt-title  { font-size: 10.5pt !important; font-weight: bold !important; text-align: center !important; }
  .pt-doctype{ font-size: 9.5pt !important; font-weight: bold !important; text-align: center !important; letter-spacing: 2px !important; margin: 1mm 0 !important; }
  .pt-sub    { font-size: 8pt !important; text-align: center !important; }
  .pt-num    { font-size: 13pt !important; font-weight: bold !important; text-align: center !important;
               border: 2px solid #000 !important; padding: 2mm 3mm !important; margin: 2mm auto !important;
               letter-spacing: 2px !important; display: inline-block !important; min-width: 30mm !important; }
  .pt-num-wrap { text-align: center !important; }
  .pt-sep    { text-align: center !important; margin: 2mm 0 !important; letter-spacing: 1px !important; }
  .pt-sep-dbl{ text-align: center !important; margin: 2mm 0 !important; letter-spacing: 0 !important; font-weight: bold !important; }
  .pt-section{ font-weight: bold !important; text-decoration: underline !important; margin: 2mm 0 1mm !important; font-size: 8.5pt !important; }
  .pt-row    { display: flex !important; justify-content: space-between !important; gap: 4mm !important; margin: 0.4mm 0 !important; }
  .pt-row-strong { display: flex !important; justify-content: space-between !important; gap: 4mm !important;
                 font-weight: bold !important; margin: 0.4mm 0 !important; }
  .pt-row-bold { display: flex !important; justify-content: space-between !important; gap: 4mm !important;
                 font-weight: bold !important; font-size: 11pt !important;
                 border-top: 2px solid #000 !important; border-bottom: 2px solid #000 !important;
                 margin: 1mm 0 !important; padding: 1.5mm 0 !important; }
  .pt-item     { margin: 1.5mm 0 !important; }
  .pt-item-name { font-weight: bold !important; font-size: 8.5pt !important; }
  .pt-item-line { display: flex !important; justify-content: space-between !important; gap: 2mm !important; font-size: 8pt !important; }
  .pt-thanks   { text-align: center !important; font-weight: bold !important; font-size: 10pt !important; margin: 3mm 0 1mm !important; letter-spacing: 1px !important; }
  .pt-small  { font-size: 7.5pt !important; }
  .pt-tiny   { font-size: 7pt !important; }
  .pt-mono   { font-family: 'Courier New', monospace !important; }
  .pt-center { text-align: center !important; }
  .pt-anulada{ text-align: center !important; font-weight: bold !important; font-size: 14pt !important;
               border: 3px solid #000 !important; padding: 3mm !important; margin: 2mm 0 !important;
               letter-spacing: 3px !important; }
}
`
}

const REGIMEN_LABEL = {
  RESPONSABLE_IVA: 'Responsable de IVA',
  NO_RESPONSABLE_IVA: 'No responsable de IVA',
}

const TIPO_DOC_TITLE: Record<string, string> = {
  INFORMAL: 'RECIBO INFORMAL',
  POS: 'FACTURA DE VENTA',        // legacy
  FACTURA_VENTA: 'FACTURA DE VENTA',
}

const TIPO_DOC_CLIENTE_LABEL = {
  CC: 'C.C.',
  NIT: 'NIT',
  CE: 'C.E.',
  PA: 'Pasaporte',
  TI: 'T.I.',
}

export default function TicketViewerModal({ open, onClose, ticket, pagos: pagosProp }: Props) {
  const printRootId = `ticket-view-print-${ticket.id}`
  const qc = useQueryClient()
  const [showNotaModal, setShowNotaModal] = useState(false)

  // Si no recibimos pagos por prop, los buscamos directo por cuenta_id
  const { data: cuentaData } = useQuery<Cuenta>({
    queryKey: ['accounts', ticket.cuenta_id],
    queryFn: () => cuentasApi.getById(ticket.cuenta_id),
    enabled: open && !pagosProp && !!ticket.cuenta_id,
    staleTime: 60_000,
  })
  const pagos: Pago[] | undefined = pagosProp ?? cuentaData?.pagos

  const enviarDianMutation = useMutation({
    mutationFn: () => billingApi.enviarADian(ticket.id),
    onSuccess: () => {
      toast.success('Factura enviada a la DIAN — quedará en estado Pendiente hasta su respuesta')
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['billing', 'cuenta-tickets'] })
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { detail?: string } } }
      toast.error(err?.response?.data?.detail || 'Error al enviar a DIAN')
    },
  })

  // Botón "Factura electrónica" — visible solo si el documento es elegible:
  // - Tipo POS o FACTURA_VENTA con CUFE y resolución (= documento fiscal real)
  // - Estado: NO_ENVIADA/NO_APLICA (primer envío) o ERROR/RECHAZADO (reintento)
  const esDocFiscal = ticket.tipo_documento === 'POS' || ticket.tipo_documento === 'FACTURA_VENTA'
  const tieneCufe = !!ticket.cufe && !!ticket.resolucion_numero
  const esPrimerEnvio = ticket.estado_dian === 'NO_ENVIADA' || ticket.estado_dian === 'NO_APLICA'
  const puedeEnviarDian =
    esDocFiscal && tieneCufe &&
    (esPrimerEnvio ||
     ticket.estado_dian === 'ERROR_DIAN' ||
     ticket.estado_dian === 'RECHAZADO_DIAN')
  const labelBotonDian = esPrimerEnvio ? 'Factura electrónica' : 'Reintentar envío DIAN'

  useEffect(() => {
    if (!open) return
    const style = document.createElement('style')
    style.textContent = buildPrintCss(printRootId)
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [open, printRootId])

  const tieneCliente = !!ticket.cliente_nombre || !!ticket.cliente_documento
  const tieneResolucion = !!ticket.resolucion_numero
  const esInformal = ticket.tipo_documento === 'INFORMAL'

  return (
    <>
      {/* Versión imprimible (térmica) — portal al body para evitar clip por overflow-x-hidden del layout */}
      {createPortal(
        <div
          id={printRootId}
          style={{ position: 'fixed', left: '-9999px', top: 0, width: '72mm', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <ThermalContent ticket={ticket} pagos={pagos} />
        </div>,
        document.body,
      )}

      <Modal open={open} onClose={onClose} title={TIPO_DOC_TITLE[ticket.tipo_documento] ?? ticket.tipo_documento} size="2xl">

        {/* ── Barra de acciones ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <Button size="sm" icon={<Printer size={13} />} onClick={() => window.print()}>
            Imprimir
          </Button>
          {ticket.tipo_documento === 'FACTURA_VENTA' && ticket.estado === 'EMITIDA' && (
            <Button size="sm" variant="secondary" icon={<FileMinus size={13} />} onClick={() => setShowNotaModal(true)}>
              Nota crédito/débito
            </Button>
          )}
          {ticket.estado === 'ANULADA' && <Badge variant="red" dot><X size={10} className="inline mr-0.5" />Anulada</Badge>}
          {ticket.estado_dian && ticket.estado_dian !== 'NO_APLICA' && (
            <DianEstadoBadge estado={ticket.estado_dian} mensaje={ticket.dian_mensaje} intentos={ticket.dian_intentos} size="md" />
          )}
          {puedeEnviarDian && (
            <Button size="sm" variant="ghost" icon={<RefreshCw size={12} />} onClick={() => enviarDianMutation.mutate()}
              loading={enviarDianMutation.isPending} disabled={enviarDianMutation.isPending}>
              {labelBotonDian}
            </Button>
          )}
          {ticket.estado_dian === 'PENDIENTE_DIAN' && (
            <Button size="sm" variant="ghost" disabled icon={<RefreshCw size={12} className="animate-spin" />}>Enviando…</Button>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-slate-400 font-mono hidden sm:block">{ticket.codigo_verificacion}</span>
        </div>

        {/* ══════════════════════════════════════════════════════
            LAYOUT: columna única en mobile · 2 col en lg
            Izquierda (60%): documento · Derecha (40%): resumen
        ══════════════════════════════════════════════════════ */}
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-6 text-xs">

          {/* ─────────── COL IZQUIERDA: DOCUMENTO ─────────── */}
          <div className="space-y-3">

            {/* ① Header empresa */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 text-white rounded-2xl px-5 py-4">
              {/* Círculo decorativo */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/[0.04]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/50 uppercase tracking-[0.15em] mb-1">{TIPO_DOC_TITLE[ticket.tipo_documento]}</p>
                  <p className="text-[15px] font-bold leading-snug truncate">{ticket.empresa_razon_social}</p>
                  <p className="text-[10px] text-white/60 mt-1">
                    NIT: <span className="font-semibold text-white/80">{ticket.empresa_nit}</span>
                    {ticket.empresa_direccion && <> · {ticket.empresa_direccion}</>}
                  </p>
                  <p className="text-[9px] text-white/40 mt-0.5">{REGIMEN_LABEL[ticket.empresa_regimen_iva]}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">N° Documento</p>
                  <p className="text-[13px] font-black font-mono tracking-wide bg-white/10 rounded-lg px-2.5 py-1">
                    {ticket.numero_completo}
                  </p>
                  <p className="text-[9px] text-white/40 mt-1.5">{formatDateTime(ticket.fecha_emision)}</p>
                </div>
              </div>
            </div>

            {/* ② Resolución DIAN */}
            {tieneResolucion && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-amber-700 mb-0.5">Resolución DIAN N° {ticket.resolucion_numero}</p>
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      {ticket.resolucion_fecha && <>Fecha: {formatDate(ticket.resolucion_fecha)}</>}
                      {ticket.resolucion_rango_desde && <> · Rango: {ticket.resolucion_rango_desde} – {ticket.resolucion_rango_hasta}</>}
                      {ticket.resolucion_vigencia_hasta && <> · Vigente hasta: <strong>{formatDate(ticket.resolucion_vigencia_hasta)}</strong></>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ③ Cliente */}
            {tieneCliente && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Adquiriente / Cliente</p>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Nombre / Razón social</p>
                    <p className="text-[12px] font-bold text-slate-900">{ticket.cliente_nombre || '—'}</p>
                  </div>
                  {ticket.cliente_documento && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">{TIPO_DOC_CLIENTE_LABEL[ticket.cliente_tipo_doc!] ?? 'Documento'}</p>
                      <p className="text-[11px] font-mono font-bold text-slate-800">{ticket.cliente_documento}</p>
                    </div>
                  )}
                  {ticket.cliente_direccion && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Dirección</p>
                      <p className="text-[10px] text-slate-700">{ticket.cliente_direccion}</p>
                    </div>
                  )}
                  {ticket.cliente_telefono && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Teléfono</p>
                      <p className="text-[10px] text-slate-700">{ticket.cliente_telefono}</p>
                    </div>
                  )}
                  {ticket.cliente_email && (
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Email</p>
                      <p className="text-[10px] text-slate-700">{ticket.cliente_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ④ Tabla de productos */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Detalle de productos</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="text-left py-2 px-4 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Descripción</th>
                    <th className="text-center py-2 px-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wide w-12">Cant.</th>
                    <th className="text-right py-2 px-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Precio unit.</th>
                    {!esInformal && <th className="text-right py-2 px-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wide w-12">IVA</th>}
                    <th className="text-right py-2 px-4 text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Total línea</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ticket.items.map((it, idx) => {
                    // descuento_linea (con IVA) viene del backend — fuente única de verdad.
                    // total_linea ya es NETO. Precio sin descuento = total_linea + descuento.
                    const descMonto = Math.round(it.descuento_linea ?? 0)
                    const tieneDesc = descMonto > 0
                    const originalTotal = it.total_linea + descMonto
                    const descPct = tieneDesc && originalTotal > 0
                      ? Math.round((descMonto / originalTotal) * 100) : 0
                    // Precio original por unidad CON IVA (para mostrar tachado)
                    const precioOriginalUnitario = tieneDesc
                      ? Math.round(originalTotal / it.cantidad) : 0
                    return (
                      <tr key={it.id} className={`group transition-colors ${tieneDesc ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : idx % 2 === 0 ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-50/80'}`}>
                        <td className="py-2.5 px-4">
                          <div className="flex items-start gap-2">
                            {tieneDesc && (
                              <div className="shrink-0 mt-0.5 w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-800 leading-snug">{it.descripcion}</p>
                              {it.codigo_producto && (
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">{it.codigo_producto}</p>
                              )}
                              {tieneDesc && (
                                <div className="mt-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
                                      Descuento aplicado
                                    </span>
                                    <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[9px] font-black text-emerald-800">
                                      {descPct}% OFF
                                    </span>
                                  </div>

                                  <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                                    <span className="text-slate-500">Precio anterior</span>
                                    <span className="text-right line-through text-slate-400">
                                      {formatCOP(precioOriginalUnitario)}
                                    </span>

                                    <span className="text-slate-500">Precio final</span>
                                    <span className="text-right font-bold text-slate-700">
                                      {formatCOP(it.precio_unitario_con_iva)}
                                    </span>

                                    <span className="font-bold text-emerald-700">
                                      💚 Ahorraste
                                    </span>
                                    <span className="text-right font-black text-emerald-700">
                                      {formatCOP(descMonto)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-[11px] font-semibold text-slate-700 tabular-nums">{it.cantidad}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums">
                          {tieneDesc ? (
                            <div>
                              <p className="text-[9px] text-slate-400 line-through">{formatCOP(precioOriginalUnitario)}</p>
                              <p className="text-[11px] font-semibold text-slate-700">{formatCOP(it.precio_unitario_con_iva)}</p>
                            </div>
                          ) : (
                            <p className="text-[11px] font-semibold text-slate-700">{formatCOP(it.precio_unitario_con_iva)}</p>
                          )}
                        </td>
                        {!esInformal && (
                          <td className="py-2.5 px-2 text-right text-[10px] text-slate-400 tabular-nums">{it.tarifa_iva}%</td>
                        )}
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {tieneDesc ? (
                            <div className="flex flex-col items-end">
                              <p className="text-[9px] text-slate-400 line-through">
                                {formatCOP(originalTotal)}
                              </p>

                              <p className="text-[13px] font-black text-emerald-700">
                                {formatCOP(it.total_linea)}
                              </p>

                              <span className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                Ahorró {formatCOP(descMonto)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[12px] font-bold text-slate-800">{formatCOP(it.total_linea)}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Pie de tabla */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                    <td colSpan={esInformal ? 3 : 4} className="py-2 px-4 text-[9px] text-slate-400">
                      {ticket.items.reduce((s, it) => s + it.cantidad, 0)} unidades · {ticket.items.length} {ticket.items.length === 1 ? 'producto' : 'productos'}
                    </td>
                    <td className="py-2 px-4 text-right text-[11px] font-bold text-slate-700 tabular-nums">
                      {formatCOP(ticket.subtotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ⑤ Anulación */}
            {ticket.estado === 'ANULADA' && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <X size={16} className="text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-red-700 tracking-widest mb-0.5">Documento Anulado</p>
                  <p className="text-[11px] text-red-800">{ticket.motivo_anulacion}</p>
                  {ticket.fecha_anulacion && <p className="text-[10px] text-red-500 mt-1">{formatDateTime(ticket.fecha_anulacion)}</p>}
                </div>
              </div>
            )}
          </div>
          {/* ─────────── FIN COL IZQUIERDA ─────────── */}

          {/* ─────────── COL DERECHA: PANEL RESUMEN ─────────── */}
          <div className="space-y-3 mt-4 lg:mt-0">

            {/* ① Caja de totales */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-white/60">Resumen financiero</p>
              </div>
              <div className="p-4 space-y-2.5 bg-white">

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Subtotal bruto</span>
                  <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{formatCOP(ticket.subtotal)}</span>
                </div>

                {/* Descuentos — cada producto en su fila */}
                {ticket.descuento > 0 && (() => {
                  const lineasConDesc = ticket.items.filter((it) => {
                    const ot = it.subtotal_linea * (1 + it.tarifa_iva / 100)
                    return ot - it.total_linea > 1
                  })
                  return (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 shrink-0"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>
                        <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wide">Descuentos por producto</span>
                      </div>
                      {lineasConDesc.map((it) => {
                        const ot = Math.round(it.subtotal_linea * (1 + it.tarifa_iva / 100))
                        const descMonto = ot - it.total_linea
                        const descPct = ot > 0 ? Math.round((descMonto / ot) * 100) : 0
                        return (
                          <div key={it.id} className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-8 text-[8px] font-black text-emerald-800 bg-emerald-200 rounded-full py-0.5 tabular-nums">
                                {descPct}%
                              </span>
                              <span className="text-[10px] text-emerald-800 leading-snug">{it.descripcion}</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 tabular-nums shrink-0">−{formatCOP(descMonto)}</span>
                          </div>
                        )
                      })}
                      <div className="pt-1.5 border-t border-emerald-200 flex justify-between items-center">
                        <span className="text-[9px] text-emerald-700 font-semibold">Total descuentos</span>
                        <span className="text-[11px] font-extrabold text-emerald-700 tabular-nums">−{formatCOP(ticket.descuento)}</span>
                      </div>
                    </div>
                  )
                })()}

                {ticket.descuento > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Subtotal c/descuento</span>
                    <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{formatCOP(ticket.subtotal - ticket.descuento)}</span>
                  </div>
                )}

                {!esInformal && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">Base gravable</span>
                      <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{formatCOP(ticket.base_gravable)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">IVA total</span>
                      <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{formatCOP(ticket.valor_iva)}</span>
                    </div>
                  </>
                )}

                {/* Total prominente */}
                <div className="rounded-xl border-2 t-border t-bg-xlt px-4 py-3 flex items-center justify-between mt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide t-text">Total a pagar</span>
                  <span className="text-[20px] font-black tabular-nums t-text-dk">{formatCOP(ticket.total)}</span>
                </div>

                {ticket.descuento > 0 && (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[10px] font-bold text-emerald-600">¡Ahorraste {formatCOP(ticket.descuento)} en esta compra!</span>
                  </div>
                )}
              </div>
            </div>

            {/* ② Medios de pago */}
            {pagos && pagos.length > 0 && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-100">
                  <CheckCircle2 size={12} className="text-slate-400" />
                  <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Forma de pago</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {pagos.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <PagoIcon nombre={p.nombre_medio_pago} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800">{p.nombre_medio_pago}</p>
                        {p.descripcion && <p className="text-[9px] text-slate-400 truncate">{p.descripcion}</p>}
                      </div>
                      <span className="text-[12px] font-bold text-slate-800 tabular-nums">{formatCOP(p.sub_total)}</span>
                    </div>
                  ))}
                  {pagos.length > 1 && (
                    <div className="flex justify-between items-center px-4 py-2 bg-slate-50">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">{pagos.length} pagos · total</span>
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                        {formatCOP(pagos.reduce((s, p) => s + p.sub_total, 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ③ CUFE + QR DIAN */}
            {ticket.cufe && ticket.tipo_documento === 'FACTURA_VENTA' && (
              <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-700">Factura electrónica DIAN</p>
                  {ticket.estado_dian === 'ACEPTADO_DIAN' && <Badge variant="green" dot>Aceptada</Badge>}
                </div>
                <div className="flex gap-3">
                  <div className="bg-white rounded-xl p-2 border border-violet-100 shrink-0 shadow-sm">
                    <QRCodeSVG
                      value={`https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${ticket.cufe}`}
                      size={80} level="M" marginSize={0}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-[9px] text-violet-600 leading-relaxed">
                      Escanea para verificar en{' '}
                      <a href="https://catalogo-vpfe.dian.gov.co" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                        catalogo-vpfe.dian.gov.co
                      </a>
                    </p>
                    <div className="bg-white rounded-lg border border-violet-100 px-2 py-1.5">
                      <p className="text-[8px] text-slate-400 uppercase tracking-wide font-bold mb-0.5">CUFE</p>
                      <p className="font-mono text-[8px] text-slate-600 break-all leading-relaxed">{ticket.cufe}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ④ Hash integridad */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-center space-y-1">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Integridad del documento</p>
              <p className="text-[9px] font-mono text-slate-500 break-all leading-relaxed">{ticket.hash_integridad}</p>
              <p className="text-[9px] font-mono font-bold text-slate-600">{ticket.codigo_verificacion}</p>
              <p className="text-[8px] text-slate-300">Generado por SimplifyPOS</p>
            </div>

          </div>
          {/* ─────────── FIN COL DERECHA ─────────── */}

        </div>{/* fin grid */}
      </Modal>

      <EmitirNotaCreditoModal
        open={showNotaModal}
        onClose={() => setShowNotaModal(false)}
        ticketId={ticket.id}
        ticketNumero={ticket.numero_completo}
        ticketTotal={ticket.total}
        ticketBaseGravable={ticket.base_gravable}
        ticketIva={ticket.valor_iva}
      />
    </>
  )
}

function PagoIcon({ nombre }: { nombre: string }) {
  const lower = nombre.toLowerCase()
  if (lower.includes('efectivo') || lower.includes('cash')) return <Banknote size={13} className="text-slate-500" />
  if (lower.includes('tarjeta') || lower.includes('card') || lower.includes('crédito') || lower.includes('débito')) return <CreditCard size={13} className="text-slate-500" />
  if (lower.includes('nequi') || lower.includes('daviplata') || lower.includes('transfiya') || lower.includes('transfer')) return <Smartphone size={13} className="text-slate-500" />
  return <Repeat2 size={13} className="text-slate-500" />
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={bold ? 'text-[11px] font-bold text-slate-700' : 'text-[10px] text-slate-500'}>{label}</span>
      <span className={`text-right tabular-nums ${bold ? 'text-[13px] font-bold text-slate-900' : 'text-[11px] font-medium text-slate-700'}`}>{value}</span>
    </div>
  )
}

// ─── Contenido térmico (solo print) ───────────────────────────────────────────

function ThermalContent({ ticket, pagos }: { ticket: Ticket; pagos?: Pago[] }) {
  const SEP = '─'.repeat(32)
  const SEP_DBL = '═'.repeat(32)
  const tieneCliente = !!ticket.cliente_nombre || !!ticket.cliente_documento
  const tieneResolucion = !!ticket.resolucion_numero
  const esInformal = ticket.tipo_documento === 'INFORMAL'
  const totalUnidades = ticket.items.reduce((s, it) => s + it.cantidad, 0)
  const totalItems = ticket.items.length
  // originalTotal = subtotal_linea × (1 + tarifa_iva/100) = precio sin descuento, con IVA
  // descMonto = originalTotal - total_linea = lo que el cliente ahorra (incluye IVA)
  // Umbral > 1 para absorber redondeos
  const lineasConDesc = ticket.items.filter((it) => (it.descuento_linea ?? 0) > 0)

  const ivaPorTarifa = new Map<number, { base: number; iva: number }>()
  ticket.items.forEach((it) => {
    const acc = ivaPorTarifa.get(it.tarifa_iva) ?? { base: 0, iva: 0 }
    acc.base += it.subtotal_linea
    acc.iva += it.valor_iva_linea
    ivaPorTarifa.set(it.tarifa_iva, acc)
  })
  const tarifasOrdenadas = Array.from(ivaPorTarifa.entries()).sort((a, b) => a[0] - b[0])
  const multiplesTarifas = tarifasOrdenadas.length > 1

  return (
    <div>
      {/* ══════════════════════════════════════
          EMPRESA
      ══════════════════════════════════════ */}
      <div className="pt-brand">{ticket.empresa_razon_social}</div>
      <div className="pt-sub">NIT: {ticket.empresa_nit}</div>
      {ticket.empresa_direccion && <div className="pt-sub">{ticket.empresa_direccion}</div>}
      {ticket.empresa_telefono && <div className="pt-sub">Tel: {ticket.empresa_telefono}</div>}
      <div className="pt-sub pt-small">{REGIMEN_LABEL[ticket.empresa_regimen_iva]}</div>

      <div className="pt-sep-dbl">{SEP_DBL}</div>

      {/* ══════════════════════════════════════
          TIPO + NÚMERO
      ══════════════════════════════════════ */}
      <div className="pt-doctype">{TIPO_DOC_TITLE[ticket.tipo_documento]}</div>
      <div className="pt-num-wrap"><span className="pt-num">{ticket.numero_completo}</span></div>
      <div className="pt-sub">{formatDateTime(ticket.fecha_emision)}</div>

      {/* ══════════════════════════════════════
          RESOLUCIÓN DIAN
      ══════════════════════════════════════ */}
      {tieneResolucion && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">AUTORIZACIÓN DIAN</div>
          <div className="pt-row pt-small"><span>Resolución N°</span><span>{ticket.resolucion_numero}</span></div>
          {ticket.resolucion_fecha && <div className="pt-row pt-small"><span>Fecha</span><span>{formatDate(ticket.resolucion_fecha)}</span></div>}
          {ticket.resolucion_rango_desde && (
            <div className="pt-row pt-small">
              <span>Rango</span>
              <span>{ticket.resolucion_rango_desde} – {ticket.resolucion_rango_hasta}</span>
            </div>
          )}
          {ticket.resolucion_vigencia_hasta && (
            <div className="pt-row pt-small"><span>Vigencia hasta</span><span>{formatDate(ticket.resolucion_vigencia_hasta)}</span></div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          ADQUIRENTE
      ══════════════════════════════════════ */}
      {tieneCliente && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">ADQUIRENTE</div>
          {ticket.cliente_nombre && (
            <div className="pt-row"><span>Nombre</span><span>{ticket.cliente_nombre}</span></div>
          )}
          {ticket.cliente_documento && (
            <div className="pt-row">
              <span>{TIPO_DOC_CLIENTE_LABEL[ticket.cliente_tipo_doc!] ?? 'Doc'}</span>
              <span>{ticket.cliente_documento}</span>
            </div>
          )}
          {ticket.cliente_direccion && <div className="pt-row pt-small"><span>Dirección</span><span>{ticket.cliente_direccion}</span></div>}
          {ticket.cliente_telefono && <div className="pt-row pt-small"><span>Teléfono</span><span>{ticket.cliente_telefono}</span></div>}
          {ticket.cliente_email && <div className="pt-row pt-small"><span>Email</span><span>{ticket.cliente_email}</span></div>}
        </>
      )}

      {/* ══════════════════════════════════════
          DETALLE DE PRODUCTOS
          Cada ítem muestra: nombre, código, qty×precio, y
          si tiene descuento: precio original tachado, dto% y monto ahorrado
      ══════════════════════════════════════ */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-section">DETALLE DE PRODUCTOS</div>
      {ticket.items.map((it) => {
        const descMonto = Math.round(it.descuento_linea ?? 0)
        const tieneDesc = descMonto > 0
        const originalTotalThermal = it.total_linea + descMonto
        const descPct = tieneDesc && originalTotalThermal > 0
          ? Math.round((descMonto / originalTotalThermal) * 100) : 0
        // Precio unitario original CON IVA (para mostrar en el ticket)
        const precioOrigUnit = tieneDesc
          ? Math.round(originalTotalThermal / it.cantidad) : 0
        return (
          <div key={it.id} className="pt-item">
            {/* Nombre + código */}
            <div className="pt-item-name">{it.descripcion}</div>
            {it.codigo_producto && <div className="pt-small pt-mono">  Cód: {it.codigo_producto}</div>}

            {/* Si tiene descuento: mostrar precio original y porcentaje */}
            {tieneDesc && (
              <div
                style={{
                  marginTop: '1mm',
                  marginBottom: '1mm',
                  padding: '1.2mm 0',
                  borderTop: '1px dashed #000',
                  borderBottom: '1px dashed #000',
                }}
              >
                <div className="pt-item-line pt-small">
                  <span>ANTES</span>
                  <span>{formatCOP(precioOrigUnit)}</span>
                </div>

                <div className="pt-item-line pt-small">
                  <span>DTO. {descPct}%</span>
                  <span>-{formatCOP(descMonto)}</span>
                </div>

                <div
                  className="pt-item-line"
                  style={{ fontWeight: 'bold', fontSize: '8.5pt' }}
                >
                  <span>PRECIO FINAL</span>
                  <span>{formatCOP(it.precio_unitario_con_iva)}</span>
                </div>

                <div
                  className="pt-center pt-small"
                  style={{
                    marginTop: '0.8mm',
                    fontWeight: 'bold',
                  }}
                >
                  ★ USTED AHORRÓ {formatCOP(descMonto)} ★
                </div>
              </div>
            )}

            {/* Línea principal: qty × precio_final */}
            <div className="pt-item-line">
              <span>
                {it.cantidad} × {formatCOP(it.precio_unitario_con_iva)}
              </span>
              <span>{formatCOP(it.total_linea)}</span>
            </div>

            {!esInformal && it.tarifa_iva > 0 && (
              <div className="pt-small" style={{ marginTop: '0.3mm' }}>
                IVA {it.tarifa_iva}% incluido
              </div>
            )}
          </div>
        )
      })}

      {/* Resumen cantidades */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-row pt-small"><span>Productos diferentes</span><span>{totalItems}</span></div>
      <div className="pt-row pt-small"><span>Total unidades</span><span>{totalUnidades}</span></div>

      {/* ══════════════════════════════════════
          TOTALES FINANCIEROS
      ══════════════════════════════════════ */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-section">TOTALES</div>
      <div className="pt-row"><span>Subtotal bruto</span><span>{formatCOP(ticket.subtotal)}</span></div>

      {/* Descuentos por producto — sección clara con % real de cada uno */}
      {ticket.descuento > 0 && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">DESCUENTOS APLICADOS</div>
          {lineasConDesc.map((it) => {
            const ot = Math.round(it.subtotal_linea * (1 + it.tarifa_iva / 100))
            const descMonto = ot - it.total_linea
            const descPct = ot > 0 ? Math.round((descMonto / ot) * 100) : 0
            return (
              <div key={it.id} className="pt-item-line pt-small">
                <span>  {it.descripcion} ({descPct}% dto.)</span>
                <span>-{formatCOP(descMonto)}</span>
              </div>
            )
          })}
          <div className="pt-sep">{SEP}</div>
          <div className="pt-row-strong"><span>Total descuentos</span><span>-{formatCOP(ticket.descuento)}</span></div>
          <div className="pt-row"><span>Subtotal con descuento</span><span>{formatCOP(ticket.subtotal - ticket.descuento)}</span></div>
        </>
      )}

      {!esInformal && (
        <>
          {(ticket.descuento === 0) && <div className="pt-sep">{SEP}</div>}
          <div className="pt-row"><span>Base gravable</span><span>{formatCOP(ticket.base_gravable)}</span></div>
          {multiplesTarifas
            ? tarifasOrdenadas.map(([tar, val]) => (
              <div className="pt-row pt-small" key={tar}>
                <span>{tar === 0 ? 'Excluido IVA' : `IVA ${tar}%`}</span>
                <span>{formatCOP(val.iva)}</span>
              </div>
            ))
            : <div className="pt-row"><span>IVA total</span><span>{formatCOP(ticket.valor_iva)}</span></div>}
        </>
      )}

      <div className="pt-row-bold"><span>TOTAL A PAGAR</span><span>{formatCOP(ticket.total)}</span></div>

      {ticket.descuento > 0 && (
        <div className="pt-center pt-small" style={{ marginTop: '1.5mm' }}>
          {'★'} Ahorro total en esta compra: {formatCOP(ticket.descuento)} {'★'}
        </div>
      )}

      {/* ══════════════════════════════════════
          FORMA DE PAGO (si viene de la cuenta)
      ══════════════════════════════════════ */}
      {pagos && pagos.length > 0 && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">FORMA DE PAGO</div>
          {pagos.map((p) => (
            <div key={p.id} className="pt-row">
              <span>{p.nombre_medio_pago}{p.descripcion ? ` (${p.descripcion})` : ''}</span>
              <span>{formatCOP(p.sub_total)}</span>
            </div>
          ))}
          {pagos.length > 1 && (
            <div className="pt-row-strong">
              <span>Total pagado</span>
              <span>{formatCOP(pagos.reduce((s, p) => s + p.sub_total, 0))}</span>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          OBSERVACIONES
      ══════════════════════════════════════ */}
      {ticket.notas && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">OBSERVACIONES</div>
          <div className="pt-small">{ticket.notas}</div>
        </>
      )}

      {/* ══════════════════════════════════════
          ANULACIÓN
      ══════════════════════════════════════ */}
      {ticket.estado === 'ANULADA' && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-anulada">DOCUMENTO ANULADO</div>
          {ticket.motivo_anulacion && <div className="pt-small pt-center">Motivo: {ticket.motivo_anulacion}</div>}
          {ticket.fecha_anulacion && <div className="pt-small pt-center">{formatDateTime(ticket.fecha_anulacion)}</div>}
        </>
      )}

      {/* ══════════════════════════════════════
          CIERRE
      ══════════════════════════════════════ */}
      {ticket.estado !== 'ANULADA' && (
        <>
          <div className="pt-sep-dbl">{SEP_DBL}</div>
          <div className="pt-thanks">¡GRACIAS POR SU COMPRA!</div>
          <div className="pt-sub pt-tiny">Conserve este documento como soporte de la transacción</div>
        </>
      )}

      {/* ══════════════════════════════════════
          CUFE + QR DIAN (Resolución 165/2023)
      ══════════════════════════════════════ */}
      {ticket.cufe && ticket.tipo_documento === 'FACTURA_VENTA' && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-thanks pt-tiny" style={{ marginBottom: '1mm' }}>FACTURA ELECTRÓNICA DE VENTA</div>
          <div className="pt-sub pt-tiny">Escanea el código QR para validar en DIAN</div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '2mm 0' }}>
            <QRCodeSVG
              value={`https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${ticket.cufe}`}
              size={140} level="M" marginSize={0}
            />
          </div>
          <div className="pt-sub pt-tiny">catalogo-vpfe.dian.gov.co</div>
          <div className="pt-mono pt-tiny" style={{ wordBreak: 'break-all', fontSize: '6pt', lineHeight: 1.3 }}>
            CUFE: {ticket.cufe}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          FOOTER VERIFICACIÓN
      ══════════════════════════════════════ */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-row pt-small"><span>Cód. verificación</span><span>{ticket.codigo_verificacion}</span></div>
      <div className="pt-sub pt-mono pt-tiny" style={{ wordBreak: 'break-all' }}>
        Hash: {ticket.hash_integridad}
      </div>
      <div className="pt-sub pt-tiny" style={{ marginTop: '2mm' }}>Generado por SimplifyPOS · simplifypos.app</div>
    </div>
  )
}
