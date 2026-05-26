/**
 * EmitirNotaCreditoModal — Emite Nota Crédito o Débito DIAN sobre un ticket.
 *
 * Casos de uso típicos:
 *  - Cliente devuelve mercancía → NC con motivo 1 (Devolución parcial)
 *  - Anular factura ya emitida a DIAN → NC con motivo 2 (Anulación)
 *  - Aplicar descuento post-venta → NC con motivo 3 (Rebaja)
 *  - Cargo adicional (envío, comisión) → ND con motivo 5 (Otros)
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, FileMinus, FilePlus } from 'lucide-react'
import { Button, Modal } from '@/shared/components/ui'
import { notasApi, type EmitirNotaInput, type TipoNota } from '../api'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  ticketId: number
  ticketNumero: string
  ticketTotal: number
  ticketBaseGravable: number
  ticketIva: number
}

const MOTIVOS: { codigo: '1' | '2' | '3' | '4' | '5'; label: string; tipoSugerido: TipoNota }[] = [
  { codigo: '1', label: 'Devolución parcial', tipoSugerido: 'CREDITO' },
  { codigo: '2', label: 'Anulación de factura', tipoSugerido: 'CREDITO' },
  { codigo: '3', label: 'Rebaja o descuento', tipoSugerido: 'CREDITO' },
  { codigo: '4', label: 'Ajuste de precio', tipoSugerido: 'CREDITO' },
  { codigo: '5', label: 'Otros', tipoSugerido: 'CREDITO' },
]

function formatCOP(n: number) {
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

export default function EmitirNotaCreditoModal({
  open,
  onClose,
  ticketId,
  ticketNumero,
  ticketTotal,
  ticketBaseGravable,
  ticketIva,
}: Props) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<TipoNota>('CREDITO')
  const [motivoCodigo, setMotivoCodigo] = useState<'1' | '2' | '3' | '4' | '5'>('1')
  const [motivo, setMotivo] = useState('')
  const [montoTotal, setMontoTotal] = useState(ticketTotal)

  // Proporción base/iva del ticket original — para calcular subtotal/iva proporcional
  const ivaRatio = ticketTotal > 0 ? ticketIva / ticketTotal : 0
  const baseRatio = ticketTotal > 0 ? ticketBaseGravable / ticketTotal : 1
  const subtotalCalc = Math.round(montoTotal * baseRatio)
  const ivaCalc = Math.round(montoTotal * ivaRatio)

  const mutation = useMutation({
    mutationFn: (data: EmitirNotaInput) => notasApi.emitir(data),
    onSuccess: (nota) => {
      toast.success(
        `${nota.tipo === 'CREDITO' ? 'Nota crédito' : 'Nota débito'} ${nota.numero_completo} emitida`,
      )
      qc.invalidateQueries({ queryKey: ['notas'] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
      onClose()
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { detail?: string } } }
      toast.error(err?.response?.data?.detail || 'Error emitiendo nota')
    },
  })

  function handleSubmit() {
    if (!motivo.trim() || montoTotal <= 0 || montoTotal > ticketTotal) return
    mutation.mutate({
      ticket_original_id: ticketId,
      tipo,
      motivo: motivo.trim(),
      motivo_codigo: motivoCodigo,
      subtotal: subtotalCalc,
      valor_iva: ivaCalc,
      total: montoTotal,
    })
  }

  const canSubmit =
    motivo.trim().length >= 3 &&
    montoTotal > 0 &&
    montoTotal <= ticketTotal &&
    !mutation.isPending

  return (
    <Modal open={open} onClose={onClose} title="Emitir Nota Crédito/Débito" size="md">
      <div className="space-y-4">
        {/* Banner ticket original */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
          <div className="text-slate-500 mb-0.5">Factura original</div>
          <div className="font-semibold text-slate-800">{ticketNumero}</div>
          <div className="text-slate-600 mt-1">
            Total: <strong>{formatCOP(ticketTotal)}</strong>
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Tipo de nota</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('CREDITO')}
              className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                tipo === 'CREDITO'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <FileMinus size={16} className="text-emerald-600" />
              <div className="text-left">
                <div className="text-sm font-semibold">Crédito</div>
                <div className="text-[10px] text-slate-500">Reduce el valor</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTipo('DEBITO')}
              className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                tipo === 'DEBITO'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <FilePlus size={16} className="text-orange-600" />
              <div className="text-left">
                <div className="text-sm font-semibold">Débito</div>
                <div className="text-[10px] text-slate-500">Aumenta el valor</div>
              </div>
            </button>
          </div>
        </div>

        {/* Motivo código DIAN */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
            Motivo DIAN
          </label>
          <select
            value={motivoCodigo}
            onChange={(e) =>
              setMotivoCodigo(e.target.value as '1' | '2' | '3' | '4' | '5')
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          >
            {MOTIVOS.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.codigo} — {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Motivo texto */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
            Descripción del motivo
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Cliente devolvió 2 unidades en buen estado"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            maxLength={500}
          />
          <div className="text-[10px] text-slate-400 mt-0.5 text-right">{motivo.length}/500</div>
        </div>

        {/* Monto */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
            Monto total de la nota
          </label>
          <input
            type="number"
            value={montoTotal}
            onChange={(e) => setMontoTotal(Math.max(0, Number(e.target.value) || 0))}
            min={0}
            max={ticketTotal}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-violet-500 focus:outline-none"
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Subtotal: {formatCOP(subtotalCalc)} · IVA: {formatCOP(ivaCalc)} · Máx: {formatCOP(ticketTotal)}
          </div>
        </div>

        {montoTotal > ticketTotal && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <AlertTriangle size={12} />
            El monto no puede exceder el total del ticket original
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={mutation.isPending}
          >
            Emitir nota
          </Button>
        </div>
      </div>
    </Modal>
  )
}
