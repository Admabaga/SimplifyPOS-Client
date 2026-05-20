import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Eye, Receipt, FileText } from 'lucide-react'
import {
  Card, Spinner, Badge, EmptyState, Table, Th, Td, Button,
} from '@/shared/components/ui'
import { billingApi } from '../api'
import { formatCOP, formatDateTime } from '@/shared/lib/formatters'
import TicketViewerModal from './TicketViewerModal'
import type { Ticket } from '../types'

type SubTab = 'recibos' | 'dian'

export default function TicketsHistorialTab() {
  const [subTab, setSubTab] = useState<SubTab>('recibos')
  const [viewing, setViewing] = useState<Ticket | null>(null)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['billing', 'tickets'],
    queryFn: () => billingApi.listTickets(200, 0),
  })

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
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                {subTab === 'dian' && <Th>Tipo</Th>}
                <Th>Número</Th>
                <Th>Cliente</Th>
                <Th>Total</Th>
                {subTab === 'dian' && <Th>IVA</Th>}
                <Th>Estado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <Td><span className="text-[11px] text-slate-500">{formatDateTime(t.fecha_emision)}</span></Td>
                  {subTab === 'dian' && (
                    <Td><Badge variant="purple">Factura</Badge></Td>
                  )}
                  <Td><span className="font-mono text-xs font-semibold">{t.numero_completo}</span></Td>
                  <Td><span className="text-xs">{t.cliente_nombre ?? '—'}</span></Td>
                  <Td><span className="text-xs font-bold tabular-nums">{formatCOP(t.total)}</span></Td>
                  {subTab === 'dian' && (
                    <Td><span className="text-xs tabular-nums text-slate-500">{formatCOP(t.valor_iva)}</span></Td>
                  )}
                  <Td>
                    {t.estado === 'EMITIDA'
                      ? <Badge variant="green" dot>Emitida</Badge>
                      : <Badge variant="red" dot>Anulada</Badge>}
                  </Td>
                  <Td>
                    <Button size="sm" variant="ghost" icon={<Eye size={12} />} onClick={() => setViewing(t)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {viewing && (
        <TicketViewerModal
          open={!!viewing}
          onClose={() => setViewing(null)}
          ticket={viewing}
        />
      )}
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
