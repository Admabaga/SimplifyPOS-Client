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
import { Printer, FileText, X, FileMinus, RefreshCw } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button, Modal, Badge } from '@/shared/components/ui'
import { formatCOP, formatDateTime, formatDate } from '@/shared/lib/formatters'
import type { Ticket } from '../types'
import { billingApi } from '../api'
import DianEstadoBadge from './DianEstadoBadge'
import EmitirNotaCreditoModal from './EmitirNotaCreditoModal'

interface Props {
  open: boolean
  onClose: () => void
  ticket: Ticket
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

export default function TicketViewerModal({ open, onClose, ticket }: Props) {
  const printRootId = `ticket-view-print-${ticket.id}`
  const qc = useQueryClient()
  const [showNotaModal, setShowNotaModal] = useState(false)

  const reintentarMutation = useMutation({
    mutationFn: () => billingApi.reintentarDian(ticket.id),
    onSuccess: () => {
      toast.success('Reenvío DIAN encolado — actualiza en unos segundos')
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { detail?: string } } }
      toast.error(err?.response?.data?.detail || 'Error al reintentar')
    },
  })

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
      {/* Versión imprimible (térmica) */}
      <div
        id={printRootId}
        style={{ position: 'fixed', left: '-9999px', top: 0, width: '72mm', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <ThermalContent ticket={ticket} />
      </div>

      <Modal open={open} onClose={onClose} title={TIPO_DOC_TITLE[ticket.tipo_documento] ?? ticket.tipo_documento} size="xl">
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
          <Button size="sm" icon={<Printer size={13} />} onClick={() => window.print()}>
            Imprimir
          </Button>
          {ticket.tipo_documento === 'FACTURA_VENTA' && ticket.estado === 'EMITIDA' && (
            <Button
              size="sm"
              variant="secondary"
              icon={<FileMinus size={13} />}
              onClick={() => setShowNotaModal(true)}
            >
              Nota crédito/débito
            </Button>
          )}
          {ticket.estado === 'ANULADA' && (
            <Badge variant="red" dot>
              <X size={11} className="inline mr-0.5" /> Anulada
            </Badge>
          )}
          {ticket.estado_dian && ticket.estado_dian !== 'NO_APLICA' && (
            <DianEstadoBadge
              estado={ticket.estado_dian}
              mensaje={ticket.dian_mensaje}
              intentos={ticket.dian_intentos}
              size="md"
            />
          )}
          {(ticket.estado_dian === 'RECHAZADO_DIAN' || ticket.estado_dian === 'ERROR_DIAN') && (
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw size={12} />}
              onClick={() => reintentarMutation.mutate()}
              loading={reintentarMutation.isPending}
            >
              Reintentar DIAN
            </Button>
          )}
          <div className="flex-1" />
          <div className="text-[11px] text-slate-400 self-center">
            Cód: <span className="font-mono font-semibold text-slate-600">{ticket.codigo_verificacion}</span>
          </div>
        </div>

        {/* Preview moderno en pantalla */}
        <div className="text-slate-800 text-xs space-y-4">
          {/* Header empresa */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">{TIPO_DOC_TITLE[ticket.tipo_documento]}</p>
                <p className="text-lg font-bold leading-tight">{ticket.empresa_razon_social}</p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  NIT: {ticket.empresa_nit}{ticket.empresa_direccion && ` · ${ticket.empresa_direccion}`}
                </p>
                <p className="text-[10px] text-white/50 mt-0.5">{REGIMEN_LABEL[ticket.empresa_regimen_iva]}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/60 uppercase">Número</p>
                <p className="text-xl font-bold font-mono">{ticket.numero_completo}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{formatDateTime(ticket.fecha_emision)}</p>
              </div>
            </div>
          </div>

          {/* Resolución DIAN */}
          {tieneResolucion && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[9px] uppercase tracking-widest font-bold text-amber-700 mb-1">Resolución DIAN</p>
              <p className="text-[11px] text-amber-800">
                <span className="font-semibold">N°</span> {ticket.resolucion_numero}
                {ticket.resolucion_fecha && <> del {formatDate(ticket.resolucion_fecha)}</>}
                {ticket.resolucion_rango_desde && <>
                  {' · '}Rango: {ticket.resolucion_rango_desde} - {ticket.resolucion_rango_hasta}
                </>}
                {ticket.resolucion_vigencia_hasta && <>
                  {' · '}Vigencia hasta: {formatDate(ticket.resolucion_vigencia_hasta)}
                </>}
              </p>
            </div>
          )}

          {/* Cliente */}
          {tieneCliente && (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5">
                <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Cliente</p>
              </div>
              <div className="px-3 py-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-slate-400">Nombre / Razón social</p>
                  <p className="font-semibold text-slate-800">{ticket.cliente_nombre || '—'}</p>
                </div>
                {ticket.cliente_documento && (
                  <div>
                    <p className="text-slate-400">{TIPO_DOC_CLIENTE_LABEL[ticket.cliente_tipo_doc!] ?? 'Doc'}</p>
                    <p className="font-mono font-semibold text-slate-800">{ticket.cliente_documento}</p>
                  </div>
                )}
                {ticket.cliente_direccion && (
                  <div><p className="text-slate-400">Dirección</p><p className="text-slate-700">{ticket.cliente_direccion}</p></div>
                )}
                {ticket.cliente_telefono && (
                  <div><p className="text-slate-400">Teléfono</p><p className="text-slate-700">{ticket.cliente_telefono}</p></div>
                )}
              </div>
            </div>
          )}

          {/* Detalle */}
          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 px-3 py-1.5">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Detalle</p>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="text-left py-1.5 px-3 font-medium">Descripción</th>
                  <th className="text-right py-1.5 px-2 font-medium">Cant.</th>
                  <th className="text-right py-1.5 px-2 font-medium">P. Unit.</th>
                  {!esInformal && <th className="text-right py-1.5 px-2 font-medium">IVA%</th>}
                  <th className="text-right py-1.5 px-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ticket.items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-1.5 px-3">
                      <div className="text-slate-800 font-medium">{it.descripcion}</div>
                      {it.codigo_producto && <div className="text-[9px] text-slate-400 font-mono">{it.codigo_producto}</div>}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{it.cantidad}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatCOP(it.precio_unitario_con_iva)}</td>
                    {!esInformal && <td className="py-1.5 px-2 text-right tabular-nums text-slate-500">{it.tarifa_iva}%</td>}
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{formatCOP(it.total_linea)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Descuentos por línea (si aplican) ───────────────────────────── */}
          {(() => {
            const lineasConDesc = ticket.items.filter((it) => it.subtotal_linea > it.total_linea)
            if (lineasConDesc.length === 0) return null
            return (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600"><path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /></svg>
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                    Descuentos aplicados ({lineasConDesc.length} {lineasConDesc.length === 1 ? 'ítem' : 'ítems'})
                  </p>
                </div>
                <div className="space-y-1">
                  {lineasConDesc.map((it) => {
                    const desc = it.subtotal_linea - it.total_linea
                    const pct = it.subtotal_linea > 0 ? (desc / it.subtotal_linea) * 100 : 0
                    return (
                      <div key={it.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-700 truncate flex-1 pr-2">{it.descripcion}</span>
                        <span className="text-slate-500 tabular-nums mr-2">{formatCOP(it.subtotal_linea)}</span>
                        <span className="font-bold text-emerald-700 tabular-nums">−{formatCOP(desc)} ({pct.toFixed(1)}%)</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* ── Totales con desglose claro ──────────────────────────────────── */}
          <div className="flex justify-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 w-full sm:min-w-[320px] sm:w-auto">
              {/* Subtotal original (sin descuento) */}
              <Row label="Subtotal bruto" value={formatCOP(ticket.subtotal)} />

              {/* Descuento global con % calculado */}
              {ticket.descuento > 0 && (() => {
                const pct = ticket.subtotal > 0 ? (ticket.descuento / ticket.subtotal) * 100 : 0
                return (
                  <div className="flex justify-between gap-3 items-center bg-emerald-50 -mx-2 px-2 py-1.5 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        Descuento
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[12px] font-extrabold text-emerald-700 tabular-nums">
                      −{formatCOP(ticket.descuento)}
                    </span>
                  </div>
                )
              })()}

              {/* Subtotal después de descuento */}
              {ticket.descuento > 0 && (
                <Row label="Subtotal con descuento" value={formatCOP(ticket.subtotal - ticket.descuento)} />
              )}

              {/* Base + IVA (solo formales) */}
              {!esInformal && (
                <div className={ticket.descuento > 0 ? 'border-t border-slate-200 pt-2 mt-1 space-y-1' : 'space-y-1'}>
                  <Row label="Base gravable" value={formatCOP(ticket.base_gravable)} />
                  <Row label="IVA total" value={formatCOP(ticket.valor_iva)} />
                </div>
              )}

              {/* Total final destacado */}
              <div className="border-t-2 border-slate-300 pt-2 mt-1">
                <div className="flex justify-between gap-3 items-center">
                  <span className="text-[12px] font-extrabold text-slate-900 uppercase tracking-wide">Total a pagar</span>
                  <span className="text-[16px] font-extrabold text-slate-900 tabular-nums">{formatCOP(ticket.total)}</span>
                </div>
                {ticket.descuento > 0 && (
                  <p className="text-[10px] text-emerald-600 text-right mt-1 font-semibold">
                    Ahorro: {formatCOP(ticket.descuento)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Anulación */}
          {ticket.estado === 'ANULADA' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] uppercase font-bold text-red-700 mb-1">DOCUMENTO ANULADO</p>
              <p className="text-[11px] text-red-800">{ticket.motivo_anulacion}</p>
              {ticket.fecha_anulacion && <p className="text-[10px] text-red-600 mt-1">{formatDateTime(ticket.fecha_anulacion)}</p>}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2 space-y-0.5 text-slate-400">
            <p className="text-[10px] font-mono">Hash: {ticket.hash_integridad.slice(0, 32)}...</p>
            <p className="text-[10px] font-mono">{ticket.codigo_verificacion}</p>
            <p className="text-[9px]">Documento generado por SimplifyPOS</p>
          </div>
        </div>
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={bold ? 'text-[11px] font-bold text-slate-700' : 'text-[10px] text-slate-500'}>{label}</span>
      <span className={`text-right tabular-nums ${bold ? 'text-[13px] font-bold text-slate-900' : 'text-[11px] font-medium text-slate-700'}`}>{value}</span>
    </div>
  )
}

// ─── Contenido térmico (solo print) ───────────────────────────────────────────

function ThermalContent({ ticket }: { ticket: Ticket }) {
  const SEP = '─'.repeat(32)
  const SEP_DBL = '═'.repeat(32)
  const tieneCliente = !!ticket.cliente_nombre || !!ticket.cliente_documento
  const tieneResolucion = !!ticket.resolucion_numero
  const esInformal = ticket.tipo_documento === 'INFORMAL'

  // Resumen de unidades e ítems
  const totalUnidades = ticket.items.reduce((s, it) => s + it.cantidad, 0)
  const totalItems = ticket.items.length

  // Agrupar IVA por tarifa (DIAN best practice cuando hay múltiples tarifas)
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
      {/* ═══ HEADER EMPRESA ═══ */}
      <div className="pt-brand">{ticket.empresa_razon_social}</div>
      <div className="pt-sub">NIT {ticket.empresa_nit}</div>
      {ticket.empresa_direccion && <div className="pt-sub">{ticket.empresa_direccion}</div>}
      {ticket.empresa_telefono && <div className="pt-sub">Tel. {ticket.empresa_telefono}</div>}
      <div className="pt-sub pt-small">{REGIMEN_LABEL[ticket.empresa_regimen_iva]}</div>

      <div className="pt-sep-dbl">{SEP_DBL}</div>

      {/* ═══ TIPO DOCUMENTO + NÚMERO ═══ */}
      <div className="pt-doctype">{TIPO_DOC_TITLE[ticket.tipo_documento]}</div>
      <div className="pt-num-wrap"><span className="pt-num">{ticket.numero_completo}</span></div>
      <div className="pt-sub">{formatDateTime(ticket.fecha_emision)}</div>

      {/* ═══ RESOLUCIÓN DIAN ═══ */}
      {tieneResolucion && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">AUTORIZACIÓN DIAN</div>
          <div className="pt-small">N° {ticket.resolucion_numero}</div>
          {ticket.resolucion_fecha && (
            <div className="pt-small">Fecha: {formatDate(ticket.resolucion_fecha)}</div>
          )}
          {ticket.resolucion_rango_desde && (
            <div className="pt-small">
              Rango: {ticket.resolucion_rango_desde} - {ticket.resolucion_rango_hasta}
            </div>
          )}
          {ticket.resolucion_vigencia_hasta && (
            <div className="pt-small">Vigencia: {formatDate(ticket.resolucion_vigencia_hasta)}</div>
          )}
        </>
      )}

      {/* ═══ CLIENTE ═══ */}
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
          {ticket.cliente_direccion && (
            <div className="pt-row"><span>Dirección</span><span>{ticket.cliente_direccion}</span></div>
          )}
          {ticket.cliente_telefono && (
            <div className="pt-row"><span>Teléfono</span><span>{ticket.cliente_telefono}</span></div>
          )}
          {ticket.cliente_email && (
            <div className="pt-row"><span>Email</span><span>{ticket.cliente_email}</span></div>
          )}
        </>
      )}

      {/* ═══ DETALLE ═══ */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-section">DETALLE</div>
      {ticket.items.map((it) => {
        const descLinea = it.subtotal_linea > 0 ? (it.subtotal_linea - (it.total_linea - it.valor_iva_linea)) : 0
        return (
          <div key={it.id} className="pt-item">
            <div className="pt-item-name">{it.descripcion}</div>
            {it.codigo_producto && (
              <div className="pt-small pt-mono">Cód: {it.codigo_producto}</div>
            )}
            <div className="pt-item-line">
              <span>
                {it.cantidad} × {formatCOP(it.precio_unitario_con_iva)}
                {!esInformal && it.tarifa_iva > 0 && ` · IVA ${it.tarifa_iva}%`}
              </span>
              <span>{formatCOP(it.total_linea)}</span>
            </div>
            {descLinea > 0 && (
              <div className="pt-item-line pt-small">
                <span>Descuento aplicado</span>
                <span>−{formatCOP(descLinea)}</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Resumen unidades */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-row pt-small">
        <span>Total ítems</span>
        <span>{totalItems}</span>
      </div>
      <div className="pt-row pt-small">
        <span>Total unidades</span>
        <span>{totalUnidades}</span>
      </div>

      {/* ═══ TOTALES ═══ */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-row">
        <span>Subtotal</span>
        <span>{formatCOP(ticket.subtotal)}</span>
      </div>

      {ticket.descuento > 0 && (() => {
        const pct = ticket.subtotal > 0 ? (ticket.descuento / ticket.subtotal) * 100 : 0
        return (
          <>
            <div className="pt-row-strong">
              <span>Descuento ({pct.toFixed(1)}%)</span>
              <span>−{formatCOP(ticket.descuento)}</span>
            </div>
            <div className="pt-row pt-small">
              <span>Subtotal c/desc.</span>
              <span>{formatCOP(ticket.subtotal - ticket.descuento)}</span>
            </div>
          </>
        )
      })()}

      {!esInformal && (
        <>
          <div className="pt-row">
            <span>Base gravable</span>
            <span>{formatCOP(ticket.base_gravable)}</span>
          </div>
          {multiplesTarifas
            ? tarifasOrdenadas.map(([tar, val]) => (
              <div className="pt-row pt-small" key={tar}>
                <span>{tar === 0 ? 'Excluido IVA' : `IVA ${tar}%`}</span>
                <span>{formatCOP(val.iva)}</span>
              </div>
            ))
            : <div className="pt-row"><span>IVA</span><span>{formatCOP(ticket.valor_iva)}</span></div>}
        </>
      )}

      <div className="pt-row-bold">
        <span>TOTAL A PAGAR</span>
        <span>{formatCOP(ticket.total)}</span>
      </div>

      {ticket.descuento > 0 && (
        <div className="pt-row pt-small pt-center" style={{ justifyContent: 'center' }}>
          <span>★ Te ahorraste {formatCOP(ticket.descuento)} ★</span>
        </div>
      )}

      {/* ═══ NOTAS ═══ */}
      {ticket.notas && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">OBSERVACIONES</div>
          <div className="pt-small">{ticket.notas}</div>
        </>
      )}

      {/* ═══ ANULACIÓN ═══ */}
      {ticket.estado === 'ANULADA' && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-anulada">ANULADA</div>
          {ticket.motivo_anulacion && (
            <div className="pt-small pt-center">Motivo: {ticket.motivo_anulacion}</div>
          )}
          {ticket.fecha_anulacion && (
            <div className="pt-small pt-center">{formatDateTime(ticket.fecha_anulacion)}</div>
          )}
        </>
      )}

      {/* ═══ GRACIAS ═══ */}
      {ticket.estado !== 'ANULADA' && (
        <>
          <div className="pt-sep-dbl">{SEP_DBL}</div>
          <div className="pt-thanks">¡GRACIAS POR SU COMPRA!</div>
          <div className="pt-sub pt-tiny">Conserve este documento como soporte</div>
        </>
      )}

      {/* ═══ FOOTER VERIFICACIÓN ═══ */}
      <div className="pt-sep">{SEP}</div>
      <div className="pt-sub pt-mono">Cód: {ticket.codigo_verificacion}</div>
      <div className="pt-sub pt-mono pt-tiny">Hash: {ticket.hash_integridad.slice(0, 24)}...</div>
      <div className="pt-sub pt-tiny" style={{ marginTop: '2mm' }}>
        Documento generado por SimplifyPOS
      </div>
      <div className="pt-sub pt-tiny">simplifypos.app</div>
    </div>
  )
}
