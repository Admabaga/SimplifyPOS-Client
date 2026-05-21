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
import { useEffect } from 'react'
import { Printer, FileText, X } from 'lucide-react'
import { Button, Modal, Badge } from '@/shared/components/ui'
import { formatCOP, formatDateTime, formatDate } from '@/shared/lib/formatters'
import type { Ticket } from '../types'

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
  .pt-title  { font-size: 10.5pt !important; font-weight: bold !important; text-align: center !important; }
  .pt-sub    { font-size: 8pt !important; text-align: center !important; }
  .pt-num    { font-size: 11pt !important; font-weight: bold !important; text-align: center !important;
               border: 1px solid #000 !important; padding: 1.5mm 2mm !important; margin: 2mm 0 !important;
               letter-spacing: 1px !important; }
  .pt-sep    { text-align: center !important; margin: 2mm 0 !important; letter-spacing: 1px !important; }
  .pt-section{ font-weight: bold !important; text-decoration: underline !important; margin: 2mm 0 1mm !important; }
  .pt-row    { display: flex !important; justify-content: space-between !important; gap: 4mm !important; margin: 0.4mm 0 !important; }
  .pt-row-bold { display: flex !important; justify-content: space-between !important; gap: 4mm !important;
                 font-weight: bold !important; border-top: 1px solid #000 !important;
                 margin-top: 1mm !important; padding-top: 1mm !important; }
  .pt-tbl       { width: 100% !important; border-collapse: collapse !important; }
  .pt-tbl th    { font-weight: bold !important; text-align: left !important; font-size: 8pt !important;
                  border-bottom: 1px solid #000 !important; padding: 0.5mm 0 !important; }
  .pt-tbl td    { padding: 0.5mm 0 !important; font-size: 8pt !important; }
  .pt-tbl .num  { text-align: right !important; }
  .pt-small  { font-size: 7.5pt !important; }
  .pt-mono   { font-family: 'Courier New', monospace !important; }
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
          {ticket.estado === 'ANULADA' && (
            <Badge variant="red" dot>
              <X size={11} className="inline mr-0.5" /> Anulada
            </Badge>
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

          {/* Totales */}
          <div className="flex justify-end">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 w-full sm:min-w-[280px] sm:w-auto">
              {/* Subtotal original */}
              <Row label="Subtotal" value={formatCOP(ticket.subtotal)} />

              {/* Descuento — solo si aplica */}
              {ticket.descuento > 0 && (
                <div className="flex justify-between gap-3 items-center">
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    Descuento aplicado
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                    −{formatCOP(ticket.descuento)}
                  </span>
                </div>
              )}

              {/* Base gravable + IVA (solo facturas formales) */}
              {!esInformal && ticket.descuento > 0 && (
                <div className="border-t border-slate-200 pt-1.5 mt-1 space-y-1">
                  <Row label="Base gravable" value={formatCOP(ticket.base_gravable)} />
                  <Row label="IVA total" value={formatCOP(ticket.valor_iva)} />
                </div>
              )}
              {!esInformal && ticket.descuento === 0 && (
                <>
                  <Row label="Base gravable" value={formatCOP(ticket.base_gravable)} />
                  <Row label="IVA total" value={formatCOP(ticket.valor_iva)} />
                </>
              )}

              <div className="border-t-2 border-slate-300 pt-2 mt-1">
                <Row label="TOTAL" value={formatCOP(ticket.total)} bold />
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
  const tieneCliente = !!ticket.cliente_nombre || !!ticket.cliente_documento
  const tieneResolucion = !!ticket.resolucion_numero
  const esInformal = ticket.tipo_documento === 'INFORMAL'
  return (
    <div>
      <div className="pt-title">{ticket.empresa_razon_social}</div>
      <div className="pt-sub">NIT: {ticket.empresa_nit}</div>
      {ticket.empresa_direccion && <div className="pt-sub">{ticket.empresa_direccion}</div>}
      {ticket.empresa_telefono && <div className="pt-sub">Tel: {ticket.empresa_telefono}</div>}
      <div className="pt-sub">{REGIMEN_LABEL[ticket.empresa_regimen_iva]}</div>
      <div className="pt-sep">{SEP}</div>

      <div className="pt-title">{TIPO_DOC_TITLE[ticket.tipo_documento]}</div>
      <div className="pt-num">{ticket.numero_completo}</div>
      <div className="pt-sub">{formatDateTime(ticket.fecha_emision)}</div>

      {tieneResolucion && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-small">Resolución DIAN N° {ticket.resolucion_numero}</div>
          {ticket.resolucion_fecha && <div className="pt-small">del {formatDate(ticket.resolucion_fecha)}</div>}
          {ticket.resolucion_rango_desde && (
            <div className="pt-small">Rango: {ticket.resolucion_rango_desde} - {ticket.resolucion_rango_hasta}</div>
          )}
          {ticket.resolucion_vigencia_hasta && (
            <div className="pt-small">Vigente hasta: {formatDate(ticket.resolucion_vigencia_hasta)}</div>
          )}
        </>
      )}

      {tieneCliente && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-section">CLIENTE</div>
          <div className="pt-row"><span>Nombre</span><span>{ticket.cliente_nombre}</span></div>
          {ticket.cliente_documento && (
            <div className="pt-row">
              <span>{TIPO_DOC_CLIENTE_LABEL[ticket.cliente_tipo_doc!] ?? 'Doc'}</span>
              <span>{ticket.cliente_documento}</span>
            </div>
          )}
          {ticket.cliente_direccion && <div className="pt-row"><span>Dir.</span><span>{ticket.cliente_direccion}</span></div>}
          {ticket.cliente_telefono && <div className="pt-row"><span>Tel.</span><span>{ticket.cliente_telefono}</span></div>}
        </>
      )}

      <div className="pt-sep">{SEP}</div>
      <div className="pt-section">DETALLE</div>
      <table className="pt-tbl">
        <thead>
          <tr>
            <th>Descripción</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {ticket.items.map((it) => (
            <tr key={it.id}>
              <td>
                {it.descripcion}
                <div className="pt-small">
                  {it.cantidad} x {formatCOP(it.precio_unitario_con_iva)}
                  {it.tarifa_iva > 0 && ` (IVA ${it.tarifa_iva}%)`}
                </div>
              </td>
              <td className="num">{formatCOP(it.total_linea)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-sep">{SEP}</div>
      <div className="pt-row"><span>Subtotal</span><span>{formatCOP(ticket.subtotal)}</span></div>
      {ticket.descuento > 0 && (
        <div className="pt-row"><span>Descuento</span><span>-{formatCOP(ticket.descuento)}</span></div>
      )}
      {!esInformal && <div className="pt-row"><span>Base gravable</span><span>{formatCOP(ticket.base_gravable)}</span></div>}
      {!esInformal && <div className="pt-row"><span>IVA</span><span>{formatCOP(ticket.valor_iva)}</span></div>}
      <div className="pt-row-bold"><span>TOTAL</span><span>{formatCOP(ticket.total)}</span></div>

      {ticket.estado === 'ANULADA' && (
        <>
          <div className="pt-sep">{SEP}</div>
          <div className="pt-title">*** ANULADA ***</div>
          <div className="pt-small">{ticket.motivo_anulacion}</div>
        </>
      )}

      <div className="pt-sep">{SEP}</div>
      <div className="pt-sub pt-mono">Cód: {ticket.codigo_verificacion}</div>
      <div className="pt-sub pt-mono pt-small">Hash: {ticket.hash_integridad.slice(0, 16)}...</div>
      <div className="pt-sub">SimplifyPOS · simplifypos.app</div>
    </div>
  )
}
