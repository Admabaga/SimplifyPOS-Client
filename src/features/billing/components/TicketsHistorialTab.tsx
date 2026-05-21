import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScrollText, Eye, Receipt, FileText, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  Card, Spinner, Badge, EmptyState, Table, Th, Td, Button, Modal,
} from '@/shared/components/ui'
import Can from '@/shared/components/Can'
import { billingApi } from '../api'
import { formatCOP, formatDateTime } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { useAuthStore } from '@/stores/auth'
import TicketViewerModal from './TicketViewerModal'
import type { Ticket } from '../types'

type SubTab = 'recibos' | 'dian'

export default function TicketsHistorialTab() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const canAnnul = user?.permissions?.includes('facturacion:annul') ?? false

  const [subTab, setSubTab] = useState<SubTab>('recibos')
  const [viewing, setViewing] = useState<Ticket | null>(null)
  const [annulTarget, setAnnulTarget] = useState<Ticket | null>(null)
  const [annulMotivo, setAnnulMotivo] = useState('')

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['billing', 'tickets'],
    queryFn: () => billingApi.listTickets(200, 0),
  })

  const annulMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      billingApi.anular(id, motivo),
    onSuccess: () => {
      toast.success('Documento anulado correctamente')
      qc.invalidateQueries({ queryKey: ['billing', 'tickets'] })
      qc.invalidateQueries({ queryKey: ['cuenta'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'stock'] })
      setAnnulTarget(null)
      setAnnulMotivo('')
    },
    onError: (err) => toast.error(apiError(err, 'No se pudo anular el documento')),
  })

  const handleAnnul = () => {
    if (!annulTarget) return
    if (annulMotivo.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres')
      return
    }
    annulMutation.mutate({ id: annulTarget.id, motivo: annulMotivo.trim() })
  }

  const recibos = tickets.filter((t) => t.tipo_documento === 'INFORMAL')
  const dian    = tickets.filter((t) => t.tipo_documento !== 'INFORMAL')

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>

  const lista = subTab === 'recibos' ? recibos : dian

  return (
    <>
      <Card>
        {/* Sub-tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-100 pb-3">
          <SubTabBtn
            active={subTab === 'recibos'}
            icon={<Receipt size={13} />}
            label="Recibos informales"
            count={recibos.length}
            onClick={() => setSubTab('recibos')}
          />
          <SubTabBtn
            active={subTab === 'dian'}
            icon={<FileText size={13} />}
            label="Documentos DIAN"
            count={dian.length}
            onClick={() => setSubTab('dian')}
          />
        </div>

        {lista.length === 0 ? (
          <EmptyState
            icon={<ScrollText size={32} />}
            title={subTab === 'recibos' ? 'Sin recibos informales' : 'Sin documentos DIAN emitidos'}
            description={
              subTab === 'dian'
                ? 'Configura una resolución DIAN activa para emitir documentos POS o facturas de venta.'
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  {subTab === 'dian' && <Th>Tipo</Th>}
                  <Th>Número</Th>
                  <Th className="hidden sm:table-cell">Cliente</Th>
                  <Th>Total</Th>
                  {subTab === 'dian' && <Th className="hidden md:table-cell">IVA</Th>}
                  <Th className="hidden sm:table-cell">Estado</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {lista.map((t) => (
                  <tr key={t.id} className={`border-b border-slate-100 ${t.estado === 'ANULADA' ? 'opacity-60 bg-red-50/30' : ''}`}>
                    <Td>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{formatDateTime(t.fecha_emision)}</span>
                      {/* Estado mobile-only inline */}
                      <span className="sm:hidden block mt-0.5">
                        {t.estado === 'EMITIDA'
                          ? <Badge variant="green" dot>Emitida</Badge>
                          : <Badge variant="red" dot>Anulada</Badge>}
                      </span>
                    </Td>
                    {subTab === 'dian' && (
                      <Td><Badge variant="purple">Factura</Badge></Td>
                    )}
                    <Td><span className="font-mono text-xs font-semibold whitespace-nowrap">{t.numero_completo}</span></Td>
                    <Td className="hidden sm:table-cell"><span className="text-xs">{t.cliente_nombre ?? '—'}</span></Td>
                    <Td><span className="text-xs font-bold tabular-nums whitespace-nowrap">{formatCOP(t.total)}</span></Td>
                    {subTab === 'dian' && (
                      <Td className="hidden md:table-cell"><span className="text-xs tabular-nums text-slate-500">{formatCOP(t.valor_iva)}</span></Td>
                    )}
                    <Td className="hidden sm:table-cell">
                      {t.estado === 'EMITIDA'
                        ? <Badge variant="green" dot>Emitida</Badge>
                        : <Badge variant="red" dot>Anulada</Badge>}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => setViewing(t)} />
                        {canAnnul && t.estado === 'EMITIDA' && (
                          <Can permission="facturacion:annul">
                            <button
                              onClick={() => setAnnulTarget(t)}
                              title="Anular documento"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          </Can>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {viewing && (
        <TicketViewerModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          ticket={viewing}
        />
      )}

      {/* Modal de anulación con motivo obligatorio */}
      <Modal
        open={!!annulTarget}
        onClose={() => { setAnnulTarget(null); setAnnulMotivo('') }}
        title="Anular documento"
        size="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
            <Button variant="outline" onClick={() => { setAnnulTarget(null); setAnnulMotivo('') }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAnnul}
              disabled={annulMutation.isPending || annulMotivo.trim().length < 10}
              className="bg-red-600 hover:bg-red-700 text-white"
              icon={<XCircle size={14} />}
            >
              {annulMutation.isPending ? 'Anulando…' : 'Confirmar anulación'}
            </Button>
          </div>
        }
      >
        {annulTarget && (
          <div className="space-y-4">
            {/* Warning prominente */}
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-red-800 mb-1">Acción irreversible</p>
                <p className="text-red-700 text-xs leading-relaxed">
                  La anulación se registra en el audit log con tu usuario, fecha, IP y motivo.
                  {annulTarget.tipo_documento !== 'INFORMAL' && ' Este documento fiscal quedará registrado como anulado ante la DIAN.'}
                </p>
              </div>
            </div>

            {/* Datos del documento */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo</span>
                <span className="font-semibold text-slate-800">
                  {annulTarget.tipo_documento === 'INFORMAL'      ? 'Recibo informal'
                   : annulTarget.tipo_documento === 'FACTURA_VENTA' ? 'Factura de venta'
                   : 'Documento POS'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Número</span>
                <span className="font-mono font-semibold text-slate-800">{annulTarget.numero_completo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-slate-800 tabular-nums">{formatCOP(annulTarget.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Emitido</span>
                <span className="text-slate-700 text-xs">{formatDateTime(annulTarget.fecha_emision)}</span>
              </div>
            </div>

            {/* Motivo obligatorio */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Motivo de anulación <span className="text-red-500">*</span>
              </label>
              <textarea
                value={annulMotivo}
                onChange={(e) => setAnnulMotivo(e.target.value)}
                placeholder="Describe el motivo (mín. 10 caracteres)…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white resize-none"
                autoFocus
              />
              <div className="flex justify-between mt-1">
                <p className="text-[11px] text-slate-400">
                  Este motivo queda registrado en el audit log y será visible en el documento.
                </p>
                <p className={`text-[11px] tabular-nums ${annulMotivo.trim().length < 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {annulMotivo.trim().length}/10
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function SubTabBtn({
  active, icon, label, count, onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-slate-800 text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
        active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
      }`}>
        {count}
      </span>
    </button>
  )
}
