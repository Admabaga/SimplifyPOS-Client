/**
 * Panel de admin: todas las cajas abiertas simultáneamente.
 * Solo visible para usuarios con caja:close_others o users:manage.
 */
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users, Banknote, CreditCard, Smartphone, CircleDollarSign,
  Clock, LockOpen, FileText, Lock,
} from 'lucide-react'
import { Card, Badge, Button, Spinner } from '@/shared/components/ui'
import { formatCOP, formatDateTime } from '@/shared/lib/formatters'
import { cajaApi, type SesionCaja, type ResumenTiempoReal } from '../api'
import ZReportModal from './ZReportModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function elapsed(desde: string): string {
  const ms = Date.now() - new Date(desde).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function avatarInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-indigo-500',
]

function avatarColor(userId: number): string {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length] ?? 'bg-emerald-500'
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ─── CerrarModal (importado dinámicamente para evitar dep circular) ───────────
// Se importa en CajaPage directamente. Aquí recibimos onCerrar como callback.

interface CajaCardProps {
  sesion: SesionCaja
  resumen: ResumenTiempoReal
  index: number
  onVerZReport: (sesionId: number) => void
  onCerrar: (sesion: SesionCaja, resumen: ResumenTiempoReal) => void
}

function CajaCard({ sesion, resumen, index, onVerZReport, onCerrar }: CajaCardProps) {
  const efectivoEsperado =
    sesion.monto_inicial +
    resumen.efectivo +
    resumen.ingresos -
    resumen.gastos_efectivo -
    resumen.sangrias -
    resumen.devoluciones

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header: avatar + nombre + badge */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${avatarColor(sesion.abierta_por)}`}
        >
          {avatarInitials(sesion.nombre_abierta_por)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 truncate">
              {sesion.nombre_abierta_por}
            </span>
            <Badge variant="green" dot>ABIERTA</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} />
            {elapsed(sesion.fecha_apertura)} · {formatDateTime(sesion.fecha_apertura)}
          </p>
        </div>
      </div>

      {/* Stats por medio de pago */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Efectivo',      value: resumen.efectivo,      icon: <Banknote size={11} />,         color: 'border-emerald-100 bg-emerald-50 text-emerald-800' },
          { label: 'Transfer.',     value: resumen.transferencia, icon: <Smartphone size={11} />,        color: 'border-blue-100 bg-blue-50 text-blue-800' },
          { label: 'Tarjeta',       value: resumen.tarjeta,       icon: <CreditCard size={11} />,        color: 'border-purple-100 bg-purple-50 text-purple-800' },
          { label: 'Total vendido', value: resumen.total,         icon: <CircleDollarSign size={11} />,  color: 'border-slate-100 bg-slate-50 text-slate-800' },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl border p-2.5 ${m.color}`}>
            <div className="flex items-center gap-1 text-[10px] font-medium opacity-70 mb-1">
              {m.icon} {m.label}
            </div>
            <p className="text-sm font-bold tabular-nums">
              {m.value > 0 ? formatCOP(m.value) : <span className="text-slate-400 font-normal text-[11px]">Sin ventas</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Efectivo esperado */}
      <div className="flex justify-between items-center text-xs bg-slate-50 rounded-xl px-3 py-2">
        <span className="text-slate-500">Efectivo esperado en caja</span>
        <span className="font-bold text-slate-800 tabular-nums">{formatCOP(efectivoEsperado)}</span>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          icon={<FileText size={12} />}
          onClick={() => onVerZReport(sesion.id)}
        >
          Reporte Z
        </Button>
        <Button
          size="sm"
          variant="danger"
          className="flex-1"
          icon={<Lock size={12} />}
          onClick={() => onCerrar(sesion, resumen)}
        >
          Cerrar caja
        </Button>
      </div>
    </div>
  )
}

// ─── Props del panel ──────────────────────────────────────────────────────────

interface Props {
  /** Callback para abrir el modal de cierre con la sesión y resumen ya cargados. */
  onCerrar: (sesion: SesionCaja, resumen: ResumenTiempoReal) => void
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export default function CajasActivasPanel({ onCerrar }: Props) {
  const qc = useQueryClient()
  const [zReportSesionId, setZReportSesionId] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['caja', 'activas'],
    queryFn: cajaApi.activas,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="py-6 text-center text-sm text-slate-400">
        Error cargando las cajas activas.
      </Card>
    )
  }

  const { sesiones = [], total_ventas, total_efectivo, num_sesiones } = data ?? {}

  return (
    <div className="space-y-4">
      {/* Header con totales */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Users size={15} className="text-slate-400" />
          Cajas abiertas{' '}
          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
            {num_sesiones ?? 0}
          </span>
        </h2>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['caja', 'activas'] })}
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Barra de totales globales */}
      {(num_sesiones ?? 0) > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex flex-wrap gap-4">
          <div>
            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Total ventas</p>
            <p className="text-lg font-bold text-emerald-800 tabular-nums">{formatCOP(total_ventas ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Efectivo total</p>
            <p className="text-lg font-bold text-emerald-800 tabular-nums">{formatCOP(total_efectivo ?? 0)}</p>
          </div>
          <div className="ml-auto flex items-center">
            <span className="flex items-center gap-1.5 text-[11px] bg-emerald-600 text-white rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              En vivo
            </span>
          </div>
        </div>
      )}

      {/* Grid de cajas o empty state */}
      {sesiones.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <LockOpen size={22} className="text-slate-300" />
          </div>
          <p className="text-sm text-slate-500 font-medium">No hay cajas abiertas</p>
          <p className="text-xs text-slate-400 mt-1">Las cajas activas de tus cajeros aparecerán aquí.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sesiones.map(({ sesion, resumen }, i) => (
            <CajaCard
              key={sesion.id}
              sesion={sesion}
              resumen={resumen}
              index={i}
              onVerZReport={setZReportSesionId}
              onCerrar={onCerrar}
            />
          ))}
        </div>
      )}

      {/* Z-Report modal */}
      {zReportSesionId !== null && (
        <ZReportModal
          open={true}
          onClose={() => setZReportSesionId(null)}
          sesionId={zReportSesionId}
        />
      )}
    </div>
  )
}
