/**
 * ZReportModal — Cuadre Z.
 *
 * Impresión / PDF (térmica 80mm):
 *  - El recibo se renderiza SIEMPRE en el DOM pero fuera de pantalla
 *    (`position:fixed;left:-9999px`) — así está disponible al imprimir.
 *  - El CSS @media print usa `visibility:hidden` (no `display:none`) para
 *    ocultar todo MENOS el print root y sus descendientes.
 *  - El ID del print-root incluye el sesionId para evitar colisiones cuando
 *    hay múltiples instancias abiertas simultáneamente.
 *  - Ambos botones llaman `window.print()`. El usuario elige destino
 *    (impresora térmica o "Guardar como PDF") en el diálogo nativo.
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Printer, FileText } from 'lucide-react'
import { Button, Modal, Spinner } from '@/shared/components/ui'
import { formatCOP, formatDateTime } from '@/shared/lib/formatters'
import { cajaApi, type ZReport } from '../api'
import { useAuthStore } from '@/stores/auth'

interface Props {
  open: boolean
  onClose: () => void
  sesionId: number
}

/**
 * Genera el CSS @media print usando el ID único del print-root.
 * Así, cuando hay varios modales en el DOM, solo imprime el que
 * corresponde a esta instancia.
 */
function buildPrintCss(rootId: string) {
  return `
@media print {
  @page { size: 80mm auto; margin: 3mm 4mm; }

  html, body { background: #fff !important; }

  /* Ocultar absolutamente todo */
  body * { visibility: hidden !important; }

  /* Re-mostrar únicamente el recibo de ESTA sesión */
  #${rootId},
  #${rootId} * { visibility: visible !important; }

  /* Posicionar el recibo en el origen de la página */
  #${rootId} {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 72mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 9pt !important;
    color: #000 !important;
  }

  /* Tipografía térmica */
  #${rootId} * {
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 9pt !important;
    color: #000 !important;
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .rct-title         { font-size: 11pt !important; font-weight: bold !important; text-align: center !important; }
  .rct-sub           { font-size: 8pt !important; text-align: center !important; }
  .rct-sep           { text-align: center !important; letter-spacing: 1px !important; margin: 2mm 0 !important; }
  .rct-cut           { text-align: center !important; font-size: 8pt !important; margin: 4mm 0 !important; padding: 1mm 0 !important;
                       border-top: 1px dashed #000 !important; border-bottom: 1px dashed #000 !important; }
  .rct-row           { display: flex !important; justify-content: space-between !important; margin: 0.5mm 0 !important; gap: 4mm !important; }
  .rct-row-bold      { display: flex !important; justify-content: space-between !important; font-weight: bold !important;
                       border-top: 1px solid #000 !important; margin-top: 1mm !important; padding-top: 1mm !important; gap: 4mm !important; }
  .rct-section-title { font-weight: bold !important; text-decoration: underline !important; margin: 2mm 0 1mm !important; }
  .rct-center        { text-align: center !important; }
  .rct-firma-grid    { display: flex !important; justify-content: space-between !important; margin-top: 6mm !important; gap: 2mm !important; }
  .rct-firma-col     { width: 45% !important; border-top: 1px solid #000 !important; padding-top: 1mm !important; text-align: center !important; font-size: 7.5pt !important; }
  .rct-indent        { padding-left: 3mm !important; }
}
`
}

export default function ZReportModal({ open, onClose, sesionId }: Props) {
  const user = useAuthStore((s) => s.user)
  const printRootId = `zreport-print-root-${sesionId}`

  const { data: z, isLoading } = useQuery({
    queryKey: ['caja', 'z-report', sesionId],
    queryFn: () => cajaApi.zReport(sesionId),
    enabled: open,
    staleTime: 30_000,
  })

  // Inyectar CSS de impresión específico para esta sesión
  useEffect(() => {
    if (!open) return
    const style = document.createElement('style')
    style.id = `zreport-print-style-${sesionId}`
    style.textContent = buildPrintCss(printRootId)
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [open, sesionId, printRootId])

  /** Abre el diálogo nativo → el usuario elige impresora térmica o "Guardar como PDF" */
  function printReceipt() {
    if (!z) return
    window.print()
  }

  return (
    <>
      <div
        id={printRootId}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '72mm',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {z && (
          <>
            <ReceiptContent z={z} empresaNombre={user?.nombre} empresaNit={user?.nit} copy={1} />
            <div className="rct-cut">{'═'.repeat(24)} CORTAR {'═'.repeat(24)}</div>
            <ReceiptContent z={z} empresaNombre={user?.nombre} empresaNit={user?.nit} copy={2} />
          </>
        )}
      </div>

      <Modal open={open} onClose={onClose} title="Reporte Z — Cuadre de caja" size="lg">
        {isLoading || !z ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
              <Button size="sm" icon={<Printer size={13} />} onClick={printReceipt}>
                Imprimir
              </Button>
            </div>

            <ReportContent
              z={z}
              empresaNombre={user?.nombre}
              empresaNit={user?.nit}
            />
          </>
        )}
      </Modal>
    </>
  )
}

// ─── Recibo para impresora térmica (solo print) ───────────────────────────────

function ReceiptContent({
  z,
  empresaNombre,
  empresaNit,
  copy,
}: {
  z: ZReport
  empresaNombre?: string | null
  empresaNit?: string | null
  copy?: number
}) {
  const esCerrada = z.sesion.estado === 'cerrada'
  const SEP = '─'.repeat(32)

  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9pt', color: '#000', width: '72mm', lineHeight: '1.3' }}>
      {/* Encabezado */}
      <div className="rct-title">SimplifyPOS</div>
      <div className="rct-title">{empresaNombre ?? 'Mi Negocio'}</div>
      {empresaNit && <div className="rct-sub">NIT: {empresaNit}</div>}
      <div className="rct-sep">{SEP}</div>
      <div className="rct-center">** REPORTE Z — CUADRE DE CAJA **</div>
      <div className="rct-center">Sesion #{z.sesion.id} · {esCerrada ? 'CERRADA' : 'PREVIEW'}</div>
      {copy && <div className="rct-center">{copy === 1 ? 'Copia 1 - Original' : 'Copia 2 - Establecimiento'}</div>}
      <div className="rct-sep">{SEP}</div>

      {/* Turno */}
      <div className="rct-section-title">TURNO</div>
      <div className="rct-row"><span>Cajero</span><span>{z.sesion.nombre_abierta_por}</span></div>
      <div className="rct-row"><span>Apertura</span><span>{formatDateTime(z.sesion.fecha_apertura)}</span></div>
      {z.sesion.fecha_cierre && <>
        <div className="rct-row"><span>Cerrado por</span><span>{z.sesion.nombre_cerrada_por}</span></div>
        <div className="rct-row"><span>Cierre</span><span>{formatDateTime(z.sesion.fecha_cierre)}</span></div>
      </>}
      {z.sesion.notas_apertura && <div className="rct-row rct-indent"><span>Nota ap.</span><span>{z.sesion.notas_apertura}</span></div>}
      {z.sesion.notas_cierre && <div className="rct-row rct-indent"><span>Nota cierre</span><span>{z.sesion.notas_cierre}</span></div>}
      <div className="rct-sep">{SEP}</div>

      {/* Ventas */}
      <div className="rct-section-title">VENTAS DEL TURNO</div>
      <div className="rct-row"><span>Efectivo</span><span>{formatCOP(z.sesion.resumen_efectivo ?? 0)}</span></div>
      <div className="rct-row"><span>Transferencia</span><span>{formatCOP(z.sesion.resumen_transferencia ?? 0)}</span></div>
      <div className="rct-row"><span>Tarjeta</span><span>{formatCOP(z.sesion.resumen_tarjeta ?? 0)}</span></div>
      {(z.sesion.resumen_otros ?? 0) > 0 && <div className="rct-row"><span>Otros</span><span>{formatCOP(z.sesion.resumen_otros ?? 0)}</span></div>}
      <div className="rct-row-bold"><span>TOTAL VENDIDO</span><span>{formatCOP(z.sesion.resumen_total ?? 0)}</span></div>
      <div className="rct-sep">{SEP}</div>

      {/* Flujo de efectivo */}
      <div className="rct-section-title">EFECTIVO EN CAJA</div>
      <div className="rct-row"><span>Base inicial</span><span>+ {formatCOP(z.sesion.monto_inicial)}</span></div>
      <div className="rct-row"><span>Ventas efectivo</span><span>+ {formatCOP(z.sesion.resumen_efectivo ?? 0)}</span></div>
      {(z.sesion.resumen_ingresos ?? 0) > 0 && <div className="rct-row"><span>Ingresos extra</span><span>+ {formatCOP(z.sesion.resumen_ingresos)}</span></div>}
      {(z.sesion.resumen_gastos_efectivo ?? 0) > 0 && <div className="rct-row"><span>Gastos</span><span>- {formatCOP(z.sesion.resumen_gastos_efectivo)}</span></div>}
      {(z.sesion.resumen_sangrias ?? 0) > 0 && <div className="rct-row"><span>Retiros</span><span>- {formatCOP(z.sesion.resumen_sangrias)}</span></div>}
      {(z.sesion.resumen_devoluciones ?? 0) > 0 && <div className="rct-row"><span>Devoluciones</span><span>- {formatCOP(z.sesion.resumen_devoluciones)}</span></div>}
      <div className="rct-row-bold"><span>ESPERADO</span><span>{formatCOP(z.efectivo_esperado)}</span></div>
      {esCerrada && z.sesion.monto_real_efectivo !== null && <>
        <div className="rct-row"><span>Contado</span><span>{formatCOP(z.sesion.monto_real_efectivo)}</span></div>
        <div className="rct-row-bold">
          <span>DIFERENCIA</span>
          <span>{(z.diferencia ?? 0) >= 0 ? '+' : ''}{formatCOP(z.diferencia)}</span>
        </div>
      </>}

      {/* Movimientos */}
      {z.movimientos.length > 0 && <>
        <div className="rct-sep">{SEP}</div>
        <div className="rct-section-title">MOVIMIENTOS ({z.movimientos.length})</div>
        {z.movimientos.map((m) => (
          <div key={m.id} style={{ marginBottom: '1.5mm' }}>
            <div className="rct-row">
              <span style={{ fontWeight: 'bold' }}>{m.tipo === 'SANGRIA' ? 'RETIRO' : m.tipo}</span>
              <span>{m.tipo === 'INGRESO' ? '+' : '-'} {formatCOP(m.monto)}</span>
            </div>
            <div className="rct-row rct-indent">
              <span>{m.motivo}</span>
              <span style={{ fontSize: '7.5pt' }}>{formatDateTime(m.created_at)}</span>
            </div>
          </div>
        ))}
      </>}

      {/* Firmas */}
      {esCerrada && <>
        <div className="rct-sep" style={{ marginTop: '4mm' }}>{SEP}</div>
        <div className="rct-firma-grid">
          <div className="rct-firma-col">
            <div>{z.sesion.nombre_abierta_por}</div>
            <div>Cajero</div>
          </div>
          <div className="rct-firma-col">
            <div>{z.sesion.nombre_cerrada_por}</div>
            <div>Supervisor</div>
          </div>
        </div>
      </>}

      {/* Pie */}
      <div className="rct-sep" style={{ marginTop: '3mm' }}>{SEP}</div>
      <div className="rct-sub">SimplifyPOS · simplifypos.app</div>
      <div className="rct-sub">{formatDateTime(z.generado_en)}</div>
    </div>
  )
}

// ─── Preview en pantalla (modal) ──────────────────────────────────────────────

function ReportContent({
  z,
  empresaNombre,
  empresaNit,
}: {
  z: ZReport
  empresaNombre?: string | null
  empresaNit?: string | null
}) {
  const esCerrada = z.sesion.estado === 'cerrada'

  return (
    <div className="text-slate-800 text-xs font-sans">
      {/* ── Encabezado oscuro ── */}
      <div className="bg-slate-800 text-white rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-white/60 uppercase tracking-widest leading-none mb-0.5">SimplifyPOS</p>
            <p className="text-sm font-bold leading-tight">{empresaNombre ?? 'Mi Negocio'}</p>
            {empresaNit && (
              <p className="text-[10px] text-white/60 leading-none mt-0.5">NIT: {empresaNit}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/60 uppercase tracking-wider">Reporte Z</p>
          <p className="text-[11px] font-semibold">Sesión #{z.sesion.id}</p>
        </div>
      </div>

      {/* Estado + generado */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          esCerrada ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
        }`}>
          {esCerrada ? '✓ CERRADA' : '◉ ABIERTA — preview'}
        </span>
        <span className="text-[10px] text-slate-400">
          {esCerrada ? 'Cierre' : 'Generado'}: {formatDateTime(z.generado_en)}
        </span>
      </div>

      <div className="space-y-3">
        {/* TURNO */}
        <Section title="Datos del turno">
          <Row label="Cajero / Apertura" value={z.sesion.nombre_abierta_por} />
          <Row label="Fecha apertura" value={formatDateTime(z.sesion.fecha_apertura)} />
          {z.sesion.fecha_cierre && (
            <>
              <Row label="Cerrada por" value={z.sesion.nombre_cerrada_por} />
              <Row label="Fecha cierre" value={formatDateTime(z.sesion.fecha_cierre)} />
            </>
          )}
          {z.sesion.notas_apertura && <Row label="Notas apertura" value={z.sesion.notas_apertura} small />}
          {z.sesion.notas_cierre && <Row label="Notas cierre" value={z.sesion.notas_cierre} small />}
        </Section>

        {/* VENTAS */}
        <Section title="Ventas del turno">
          <Row label="Efectivo"      value={formatCOP(z.sesion.resumen_efectivo ?? 0)}      mono />
          <Row label="Transferencia" value={formatCOP(z.sesion.resumen_transferencia ?? 0)} mono />
          <Row label="Tarjeta"       value={formatCOP(z.sesion.resumen_tarjeta ?? 0)}       mono />
          <Row label="Otros"         value={formatCOP(z.sesion.resumen_otros ?? 0)}         mono />
          <Row label="TOTAL VENDIDO" value={formatCOP(z.sesion.resumen_total ?? 0)}         mono bold />
        </Section>

        {/* FLUJO DE EFECTIVO */}
        <Section title="Flujo de efectivo">
          <Row label="Base inicial"    value={`+ ${formatCOP(z.sesion.monto_inicial)}`}             mono />
          <Row label="Ventas efectivo" value={`+ ${formatCOP(z.sesion.resumen_efectivo ?? 0)}`}     mono />
          {(z.sesion.resumen_ingresos ?? 0) > 0 && (
            <Row label="Ingresos extra"      value={`+ ${formatCOP(z.sesion.resumen_ingresos)}`}    mono />
          )}
          {(z.sesion.resumen_gastos_efectivo ?? 0) > 0 && (
            <Row label="Gastos efectivo"     value={`− ${formatCOP(z.sesion.resumen_gastos_efectivo)}`} mono />
          )}
          {(z.sesion.resumen_sangrias ?? 0) > 0 && (
            <Row label="Retiros"             value={`− ${formatCOP(z.sesion.resumen_sangrias)}`}    mono />
          )}
          {(z.sesion.resumen_devoluciones ?? 0) > 0 && (
            <Row label="Devoluciones"        value={`− ${formatCOP(z.sesion.resumen_devoluciones)}`} mono />
          )}
          <Row label="EFECTIVO ESPERADO" value={formatCOP(z.efectivo_esperado)} mono bold />
          {esCerrada && z.sesion.monto_real_efectivo !== null && (
            <>
              <Row label="Efectivo contado" value={formatCOP(z.sesion.monto_real_efectivo)} mono />
              <Row
                label="Diferencia"
                value={`${(z.diferencia ?? 0) >= 0 ? '+' : ''}${formatCOP(z.diferencia)}`}
                mono bold
                highlight={z.diferencia === 0 ? 'green' : (z.diferencia ?? 0) > 0 ? 'green' : 'red'}
              />
            </>
          )}
        </Section>

        {/* MOVIMIENTOS */}
        {z.movimientos.length > 0 && (
          <Section title={`Movimientos de caja (${z.movimientos.length})`}>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="text-left py-1 pr-2 font-medium">Fecha</th>
                  <th className="text-left py-1 pr-2 font-medium">Tipo</th>
                  <th className="text-left py-1 pr-2 font-medium">Motivo</th>
                  <th className="text-right py-1 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {z.movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-1 pr-2 text-slate-500 tabular-nums">{formatDateTime(m.created_at)}</td>
                    <td className="py-1 pr-2">
                      <span className={`font-bold uppercase ${
                        m.tipo === 'SANGRIA' ? 'text-orange-600' :
                        m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {m.tipo === 'SANGRIA' ? 'RETIRO' : m.tipo}
                      </span>
                    </td>
                    <td className="py-1 pr-2 text-slate-700">{m.motivo}</td>
                    <td className={`py-1 text-right tabular-nums font-semibold ${
                      m.tipo === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {m.tipo === 'INGRESO' ? '+' : '−'} {formatCOP(m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* FIRMAS */}
        {esCerrada && (
          <>
            <div className="border-t border-dashed border-slate-200 my-3" />
            <div className="grid grid-cols-2 gap-8 pt-2 text-[10px] text-slate-500">
              <div className="border-t border-slate-300 pt-2 text-center">
                <p className="font-semibold text-slate-700">{z.sesion.nombre_abierta_por}</p>
                <p className="text-slate-400">Cajero / Apertura</p>
              </div>
              <div className="border-t border-slate-300 pt-2 text-center">
                <p className="font-semibold text-slate-700">{z.sesion.nombre_cerrada_por}</p>
                <p className="text-slate-400">Supervisor / Cierre</p>
              </div>
            </div>
          </>
        )}

        {/* Pie */}
        <div className="text-center pt-2">
          <p className="text-[9px] text-slate-300">Generado con SimplifyPOS · simplifypos.app</p>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-3 py-1.5">
        <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">{title}</p>
      </div>
      <div className="px-3 py-2 space-y-0.5">{children}</div>
    </div>
  )
}

function Row({
  label, value, mono, bold, small, highlight,
}: {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
  small?: boolean
  highlight?: 'green' | 'red'
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${bold ? 'pt-1 border-t border-slate-100 mt-1' : ''}`}>
      <span className={[
        bold ? 'font-bold text-slate-700' : 'text-slate-500',
        small ? 'text-[9px]' : 'text-[11px]',
      ].join(' ')}>
        {label}
      </span>
      <span className={[
        mono ? 'tabular-nums' : '',
        bold ? 'font-bold' : 'font-medium',
        small ? 'text-[9px] italic' : 'text-[11px]',
        highlight === 'green' ? 'text-emerald-700' : highlight === 'red' ? 'text-rose-700' : 'text-slate-800',
        'text-right',
      ].join(' ')}>
        {value}
      </span>
    </div>
  )
}
