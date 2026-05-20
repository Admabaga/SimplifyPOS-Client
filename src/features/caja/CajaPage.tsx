/**
 * Módulo de Caja — Apertura, cierre y resumen de sesiones de caja.
 */
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Landmark, LockOpen, Lock, RefreshCw, Clock, CheckCircle2,
  Banknote, CreditCard, Smartphone, CircleDollarSign, ReceiptText,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  PageHeader, Button, Card, Spinner, Badge, StatCard, Modal,
} from '@/shared/components/ui'
import { formatCOP, formatDateTime, formatTime } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { cajaApi, type SesionCaja, type ResumenTiempoReal } from './api'
import MovimientosPanel from './components/MovimientosPanel'
import DenominationCounter from './components/DenominationCounter'
import ZReportModal from './components/ZReportModal'
import CajasActivasPanel from './components/CajasActivasPanel'
import { FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const abrirSchema = z.object({
  notas: z.string().optional(),
})

const cerrarSchema = z.object({
  notas: z.string().optional(),
})

type AbrirForm  = z.infer<typeof abrirSchema>
type CerrarForm = z.infer<typeof cerrarSchema>

// ─── Hook: formateo de número colombiano para inputs de caja ─────────────────

function useCajaNumberInput(initialValue = 0) {
  const format = (n: number) => n > 0 ? n.toLocaleString('es-CO') : ''
  const [display, setDisplay] = useState(format(initialValue))

  const inputProps = {
    type: 'text' as const,
    inputMode: 'numeric' as const,
    value: display,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '')
      setDisplay(raw ? parseInt(raw, 10).toLocaleString('es-CO') : '')
    },
  }

  const numericValue = () => {
    const raw = display.replace(/[^0-9]/g, '')
    return raw ? parseInt(raw, 10) : 0
  }

  return { inputProps, numericValue, display, setDisplay }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function elapsed(desde: string): string {
  const ms = Date.now() - new Date(desde).getTime()
  const h  = Math.floor(ms / 3_600_000)
  const m  = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function MedioCard({
  label, icon, value, color,
}: { label: string; icon: React.ReactNode; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-2 ${color}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-75">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums">{formatCOP(value)}</p>
    </div>
  )
}

// ─── Modal: Abrir Caja ───────────────────────────────────────────────────────

function AbrirModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (sesion: SesionCaja) => void
}) {
  const montoInput = useCajaNumberInput(0)
  const { register, handleSubmit, reset } = useForm<AbrirForm>({
    resolver: zodResolver(abrirSchema) as Resolver<AbrirForm>,
    defaultValues: { notas: '' },
  })

  const mut = useMutation({
    mutationFn: (data: AbrirForm) => cajaApi.abrir({ ...data, monto_inicial: montoInput.numericValue() }),
    onSuccess: (sesion) => {
      toast.success('¡Caja abierta exitosamente!')
      reset()
      montoInput.setDisplay('')
      onSuccess(sesion)
      onClose()
    },
    onError: (e) => toast.error(apiError(e, 'Error al abrir caja')),
  })

  return (
    <Modal open={open} onClose={onClose} title="Abrir caja">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Efectivo inicial en caja <span className="text-slate-400">(opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
            <input
              {...montoInput.inputProps}
              placeholder="0"
              className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Dinero en efectivo con el que arranca la caja.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notas de apertura</label>
          <textarea
            {...register('notas')}
            rows={2}
            placeholder="Ej: Turno mañana, encargado Andrés..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={mut.isPending} icon={<LockOpen size={14} />}>
            Abrir caja
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal: Cerrar Caja ──────────────────────────────────────────────────────

// Umbral (en COP) por encima del cual exigir nota de justificación al cierre.
// Configurable a futuro por negocio. Por ahora $5.000.
const UMBRAL_JUSTIFICACION_COP = 5_000

function CerrarModal({ open, onClose, sesion, resumen, onSuccess }: {
  open: boolean
  onClose: () => void
  sesion: SesionCaja
  resumen: ResumenTiempoReal | undefined
  onSuccess: (sesionCerrada: SesionCaja) => void
}) {
  const efectivoInput = useCajaNumberInput(0)
  const { register, handleSubmit, watch } = useForm<CerrarForm>({
    resolver: zodResolver(cerrarSchema) as Resolver<CerrarForm>,
    defaultValues: { notas: '' },
  })

  const realEfectivo = efectivoInput.numericValue()
  // Esperado = inicial + ventas efectivo + ingresos extra − gastos efectivo − sangrías − devoluciones
  const ventasEfectivo  = resumen?.efectivo       ?? 0
  const gastosEfectivo  = resumen?.gastos_efectivo ?? 0
  const ingresos        = resumen?.ingresos       ?? 0
  const sangrias        = resumen?.sangrias       ?? 0
  const devoluciones    = resumen?.devoluciones   ?? 0
  const esperado        =
    sesion.monto_inicial + ventasEfectivo + ingresos - gastosEfectivo - sangrias - devoluciones
  const diferencia      = realEfectivo - esperado
  const requiereNota    = Math.abs(diferencia) >= UMBRAL_JUSTIFICACION_COP
  const notasValor      = (watch('notas') ?? '').trim()
  const bloqueado       = requiereNota && notasValor.length < 5

  const mut = useMutation({
    mutationFn: (data: CerrarForm) => cajaApi.cerrar(sesion.id, { ...data, monto_real_efectivo: efectivoInput.numericValue() }),
    onSuccess: (sesionCerrada) => {
      toast.success('Caja cerrada. ¡Hasta pronto!')
      onSuccess(sesionCerrada)
      onClose()
    },
    onError: (e) => toast.error(apiError(e, 'Error al cerrar caja')),
  })

  return (
    <Modal open={open} onClose={onClose} title="Cerrar caja" size="lg">
      <div className="space-y-4">
        {/* Resumen ventas del turno */}
        {resumen && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Ventas del turno</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Efectivo',       value: resumen.efectivo       },
                { label: 'Transferencia',  value: resumen.transferencia  },
                { label: 'Tarjeta',        value: resumen.tarjeta        },
                { label: 'Otros',          value: resumen.otros          },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold tabular-nums">{formatCOP(r.value)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
              <span>Total vendido</span>
              <span className="t-text-dk tabular-nums">{formatCOP(resumen.total)}</span>
            </div>

            {/* Flujo de efectivo detallado */}
            <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>+ Base inicial</span>
                <span className="tabular-nums">{formatCOP(sesion.monto_inicial)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>+ Ventas en efectivo</span>
                <span className="tabular-nums">{formatCOP(ventasEfectivo)}</span>
              </div>
              {ingresos > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Ingresos extra</span>
                  <span className="tabular-nums">{formatCOP(ingresos)}</span>
                </div>
              )}
              {gastosEfectivo > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>− Gastos en efectivo</span>
                  <span className="tabular-nums">{formatCOP(gastosEfectivo)}</span>
                </div>
              )}
              {sangrias > 0 && (
                <div className="flex justify-between text-orange-700">
                  <span>− Retiros</span>
                  <span className="tabular-nums">{formatCOP(sangrias)}</span>
                </div>
              )}
              {devoluciones > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>− Devoluciones</span>
                  <span className="tabular-nums">{formatCOP(devoluciones)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-700 pt-1 border-t border-slate-200">
                <span>= Efectivo esperado</span>
                <span className="tabular-nums">{formatCOP(esperado)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Conteo asistido por denominaciones */}
        <DenominationCounter
          esperado={esperado}
          onAplicar={(total) => {
            efectivoInput.setDisplay(total > 0 ? total.toLocaleString('es-CO') : '')
            toast.success(`Total contado: ${formatCOP(total)} aplicado`)
          }}
        />

        <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Efectivo contado en caja <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
              <input
                {...efectivoInput.inputProps}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
              />
            </div>

            {/* Diferencia en tiempo real */}
            {realEfectivo > 0 && (
              <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                diferencia === 0 ? 'bg-green-50 text-green-700' :
                diferencia > 0  ? 'bg-green-50 text-green-700' :
                'bg-red-50 text-red-700'
              }`}>
                {diferencia === 0 ? '✓ Cuadre exacto' :
                 diferencia > 0  ? `↑ Sobrante: ${formatCOP(diferencia)}` :
                 `↓ Faltante: ${formatCOP(Math.abs(diferencia))}`}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Notas de cierre {requiereNota && <span className="text-red-500">* (justificación obligatoria)</span>}
            </label>
            <textarea
              {...register('notas')}
              rows={2}
              placeholder={
                requiereNota
                  ? `Explica por qué hay un ${diferencia > 0 ? 'sobrante' : 'faltante'} de ${formatCOP(Math.abs(diferencia))}...`
                  : 'Ej: Todo en orden, turno sin novedades...'
              }
              className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none resize-none ${
                requiereNota && notasValor.length < 5 ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
              }`}
            />
            {requiereNota && notasValor.length < 5 && (
              <p className="text-[11px] text-red-600 mt-1">
                Diferencia de {formatCOP(Math.abs(diferencia))} supera el umbral de {formatCOP(UMBRAL_JUSTIFICACION_COP)}.
                Escribe al menos 5 caracteres explicando la causa.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="danger" className="flex-1" loading={mut.isPending} icon={<Lock size={14} />} disabled={bloqueado}>
              Cerrar caja
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ─── Sesión activa ────────────────────────────────────────────────────────────

function SesionActiva({ sesion }: { sesion: SesionCaja }) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [showCerrar, setShowCerrar] = useState(false)
  const [showZReport, setShowZReport] = useState(false)

  const { data: resumen, isLoading: loadingResumen } = useQuery({
    queryKey: ['caja', 'resumen', sesion.id],
    queryFn:  () => cajaApi.resumen(sesion.id),
    staleTime: 0,
    refetchInterval: 30_000,
  })

  const handleCerrarSuccess = (sesionCerrada: SesionCaja) => {
    qc.setQueryData(['caja', 'estado', userId], null)
    qc.setQueryData(['caja', 'historial', userId], (old: SesionCaja[] | undefined) =>
      old ? old.map((s) => s.id === sesionCerrada.id ? sesionCerrada : s) : old
    )
    qc.invalidateQueries({ queryKey: ['caja'] })
  }

  return (
    <div className="space-y-4">
      {/* Banner estado */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
            <LockOpen size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-700">Caja abierta</span>
              <span className="flex items-center gap-1 text-[11px] bg-green-600 text-white rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                En vivo
              </span>
            </div>
            <p className="text-xs text-green-700 mt-0.5">
              Abierta por <strong>{sesion.nombre_abierta_por}</strong> · {formatTime(sesion.fecha_apertura)} ·{' '}
              <Clock size={10} className="inline" /> {elapsed(sesion.fecha_apertura)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<FileText size={13} />}
            onClick={() => setShowZReport(true)}
          >
            Reporte Z
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Lock size={13} />}
            onClick={() => setShowCerrar(true)}
          >
            Cerrar caja
          </Button>
        </div>
      </div>

      {/* Resumen en tiempo real */}
      {loadingResumen ? (
        <div className="flex justify-center py-8"><Spinner size={28} /></div>
      ) : resumen && (
        <>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-700">Ventas del turno</h2>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['caja', 'resumen', sesion.id] })}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw size={11} /> Actualizar
            </button>
          </div>

          {/* KPI total */}
          <Card className="p-4 text-center t-bg-xlt t-border">
            <p className="text-[11px] t-text uppercase tracking-wide font-medium">Total vendido en este turno</p>
            <p className="text-3xl font-bold t-text-dk tabular-nums mt-1">{formatCOP(resumen.total)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {resumen.num_pagos} pago{resumen.num_pagos !== 1 ? 's' : ''}
              {resumen.num_pagos > 0 && (
                <> · Ticket promedio <span className="font-semibold text-slate-600">{formatCOP(Math.round(resumen.total / resumen.num_pagos))}</span></>
              )}
            </p>
          </Card>

          {/* Por medio de pago */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MedioCard label="Efectivo"      icon={<Banknote size={13} />}         value={resumen.efectivo}      color="t-border-lt t-bg-xlt t-text-dk" />
            <MedioCard label="Transferencia" icon={<Smartphone size={13} />}       value={resumen.transferencia} color="border-blue-100 bg-blue-50 text-blue-800" />
            <MedioCard label="Tarjeta"       icon={<CreditCard size={13} />}       value={resumen.tarjeta}       color="border-purple-100 bg-purple-50 text-purple-800" />
            <MedioCard label="Otros"         icon={<CircleDollarSign size={13} />} value={resumen.otros}         color="border-orange-100 bg-orange-50 text-orange-800" />
          </div>

          {/* Flujo de efectivo del turno */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Monto inicial</span>
              <span className="tabular-nums font-medium">+ {formatCOP(sesion.monto_inicial)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Ventas en efectivo</span>
              <span className="tabular-nums font-medium">+ {formatCOP(resumen.efectivo)}</span>
            </div>
            {resumen.ingresos > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Ingresos extra</span>
                <span className="tabular-nums font-medium">+ {formatCOP(resumen.ingresos)}</span>
              </div>
            )}
            {resumen.gastos_efectivo > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Gastos en efectivo</span>
                <span className="tabular-nums font-medium">− {formatCOP(resumen.gastos_efectivo)}</span>
              </div>
            )}
            {resumen.sangrias > 0 && (
              <div className="flex justify-between text-orange-700">
                <span>Retiros</span>
                <span className="tabular-nums font-medium">− {formatCOP(resumen.sangrias)}</span>
              </div>
            )}
            {resumen.devoluciones > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Devoluciones</span>
                <span className="tabular-nums font-medium">− {formatCOP(resumen.devoluciones)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
              <span>Efectivo esperado en caja</span>
              <span className="tabular-nums">
                {formatCOP(
                  sesion.monto_inicial + resumen.efectivo + resumen.ingresos
                  - resumen.gastos_efectivo - resumen.sangrias - resumen.devoluciones
                )}
              </span>
            </div>
          </div>

          {/* Panel de movimientos */}
          <MovimientosPanel sesionId={sesion.id} sesionAbierta={true} />

          {sesion.notas_apertura && (
            <p className="text-xs text-slate-400 italic px-1">📝 {sesion.notas_apertura}</p>
          )}
        </>
      )}

      <CerrarModal
        open={showCerrar}
        onClose={() => setShowCerrar(false)}
        sesion={sesion}
        resumen={resumen}
        onSuccess={handleCerrarSuccess}
      />

      <ZReportModal
        open={showZReport}
        onClose={() => setShowZReport(false)}
        sesionId={sesion.id}
      />
    </div>
  )
}

// ─── Caja cerrada ────────────────────────────────────────────────────────────

function CajaCerrada({ onAbrir }: { onAbrir: () => void }) {
  return (
    <Card className="py-14 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Lock size={28} className="text-slate-400" />
      </div>
      <h2 className="text-base font-semibold text-slate-700">La caja está cerrada</h2>
      <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
        Abre la caja para registrar el turno y hacer el cuadre al cierre.
      </p>
      <div className="mt-6">
        <Button icon={<LockOpen size={14} />} onClick={onAbrir}>
          Abrir caja
        </Button>
      </div>
    </Card>
  )
}

// ─── Historial ───────────────────────────────────────────────────────────────

function HistorialItem({ sesion }: { sesion: SesionCaja }) {
  const [expanded, setExpanded] = useState(false)
  const [showZ, setShowZ] = useState(false)
  const cuadre = sesion.diferencia_efectivo ?? 0

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          sesion.estado === 'abierta' ? 'bg-green-100' : 'bg-slate-100'
        }`}>
          {sesion.estado === 'abierta'
            ? <LockOpen size={14} className="text-green-600" />
            : <CheckCircle2 size={14} className="text-slate-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              {formatDateTime(sesion.fecha_apertura)}
            </span>
            <Badge variant={sesion.estado === 'abierta' ? 'green' : 'gray'} dot>
              {sesion.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {sesion.nombre_abierta_por}
            {sesion.resumen_total !== null && ` · Total: ${formatCOP(sesion.resumen_total)}`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {sesion.estado === 'cerrada' && sesion.diferencia_efectivo !== null && (
            <span className={`text-xs font-semibold tabular-nums px-2 py-1 rounded-lg ${
              cuadre === 0 ? 'bg-green-50 text-green-700' :
              cuadre > 0  ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-600'
            }`}>
              {cuadre === 0 ? 'Cuadre exacto' : cuadre > 0 ? `+${formatCOP(cuadre)}` : formatCOP(cuadre)}
            </span>
          )}
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-50 bg-slate-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {[
              { label: 'Efectivo',      value: sesion.resumen_efectivo      },
              { label: 'Transferencia', value: sesion.resumen_transferencia },
              { label: 'Tarjeta',       value: sesion.resumen_tarjeta       },
              { label: 'Otros',         value: sesion.resumen_otros         },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{m.label}</p>
                <p className="text-sm font-bold text-slate-700 tabular-nums mt-0.5">
                  {m.value != null ? formatCOP(m.value) : '—'}
                </p>
              </div>
            ))}
          </div>

          {sesion.estado === 'cerrada' && (
            <div className="mt-3 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Monto inicial</span>
                <span className="tabular-nums font-medium">{formatCOP(sesion.monto_inicial)}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo contado</span>
                <span className="tabular-nums font-medium">{sesion.monto_real_efectivo != null ? formatCOP(sesion.monto_real_efectivo) : '—'}</span>
              </div>
              {sesion.diferencia_efectivo !== null && (
                <div className={`flex justify-between font-semibold ${
                  cuadre === 0 ? 'text-green-700' : cuadre > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>Diferencia</span>
                  <span className="tabular-nums">
                    {cuadre >= 0 ? '+' : ''}{formatCOP(cuadre)}
                  </span>
                </div>
              )}
              {sesion.fecha_cierre && (
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span>Cerrado</span>
                  <span>{formatDateTime(sesion.fecha_cierre)} · por {sesion.nombre_cerrada_por}</span>
                </div>
              )}
            </div>
          )}

          {(sesion.notas_apertura || sesion.notas_cierre) && (
            <div className="mt-3 space-y-1">
              {sesion.notas_apertura && <p className="text-[11px] text-slate-400 italic">Apertura: "{sesion.notas_apertura}"</p>}
              {sesion.notas_cierre && <p className="text-[11px] text-slate-400 italic">Cierre: "{sesion.notas_cierre}"</p>}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              icon={<FileText size={12} />}
              onClick={(e) => { e.stopPropagation(); setShowZ(true) }}
            >
              Ver Reporte Z
            </Button>
          </div>
        </div>
      )}

      <ZReportModal open={showZ} onClose={() => setShowZ(false)} sesionId={sesion.id} />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const qc = useQueryClient()
  const [showAbrir, setShowAbrir] = useState(false)
  const can  = useAuthStore((s) => s.can)
  const user = useAuthStore((s) => s.user)

  // Admin = puede cerrar cajas de otros y ver panel global
  const esAdmin = can('caja:close_others') || can('users:manage')

  // Mi propia sesión (filtrada por el back por cajero_id=yo).
  // staleTime:0 + refetchOnMount:'always' → NUNCA se sirve dato de otro usuario.
  // Es el estado de identidad del turno actual — tiene que ser fresco siempre.
  const { data: sesionActual, isLoading } = useQuery({
    queryKey: ['caja', 'estado', user?.id],  // incluir user.id → cache aislado por usuario
    queryFn:  cajaApi.estado,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  })

  const { data: historial = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['caja', 'historial', user?.id],  // aislado por usuario
    queryFn:  () => cajaApi.historial(20),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const handleAbrirSuccess = (sesion: SesionCaja) => {
    qc.setQueryData(['caja', 'estado', user?.id], sesion)
    qc.invalidateQueries({ queryKey: ['caja', 'activas'] })
    qc.invalidateQueries({ queryKey: ['caja', 'historial', user?.id] })
  }

  // Callback desde CajasActivasPanel para cerrar una caja de otro usuario
  const [cerrarOtraModal, setCerrarOtraModal] = useState<{ sesion: SesionCaja; resumen: ResumenTiempoReal } | null>(null)

  const miCajaAbierta = sesionActual?.estado === 'abierta'
  const totalSesiones = historial.filter((s) => s.estado === 'cerrada').length
  const totalVendido  = historial.reduce((s, h) => s + (h.resumen_total ?? 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caja"
        subtitle={esAdmin ? 'Panel de control de cajas y turnos' : 'Tu turno de caja'}
        actions={
          !miCajaAbierta && !isLoading ? (
            <Button icon={<LockOpen size={14} />} onClick={() => setShowAbrir(true)}>
              Abrir mi caja
            </Button>
          ) : undefined
        }
      />

      {/* ── VISTA ADMIN: panel de todas las cajas activas ── */}
      {esAdmin && (
        <CajasActivasPanel
          onCerrar={(sesion, resumen) => setCerrarOtraModal({ sesion, resumen })}
        />
      )}

      {/* Separador visual entre panel admin y mi turno */}
      {esAdmin && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">
            Mi turno
          </span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
      )}

      {/* Stats rápidas del historial */}
      {totalSesiones > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Sesiones cerradas"
            value={String(totalSesiones)}
            icon={<ReceiptText size={17} className="text-slate-500" />}
            accent="slate"
          />
          <StatCard
            label="Total histórico"
            value={formatCOP(totalVendido)}
            icon={<CircleDollarSign size={17} className="t-text" />}
            accent="green"
          />
        </div>
      )}

      {/* Mi sesión actual */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : miCajaAbierta && sesionActual ? (
        <SesionActiva sesion={sesionActual} />
      ) : (
        <CajaCerrada onAbrir={() => setShowAbrir(true)} />
      )}

      {/* Historial (supervisor: solo el suyo; admin: todos) */}
      {historial.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <ReceiptText size={15} className="text-slate-400" />
            {esAdmin ? 'Historial de sesiones (todos los cajeros)' : 'Mis sesiones anteriores'}
          </h2>
          {loadingHistorial ? (
            <div className="flex justify-center py-6"><Spinner size={24} /></div>
          ) : (
            <div className="space-y-2">
              {historial.map((s) => (
                <HistorialItem key={s.id} sesion={s} />
              ))}
            </div>
          )}
        </div>
      )}

      <AbrirModal
        open={showAbrir}
        onClose={() => setShowAbrir(false)}
        onSuccess={handleAbrirSuccess}
      />

      {/* Modal para cerrar la caja de otro cajero (admin only) */}
      {cerrarOtraModal && (
        <CerrarModal
          open
          sesion={cerrarOtraModal.sesion}
          resumen={cerrarOtraModal.resumen}
          onClose={() => setCerrarOtraModal(null)}
          onSuccess={() => {
            setCerrarOtraModal(null)
            qc.invalidateQueries({ queryKey: ['caja', 'activas'] })
            qc.invalidateQueries({ queryKey: ['caja', 'historial', user?.id] })
          }}
        />
      )}
    </div>
  )
}
