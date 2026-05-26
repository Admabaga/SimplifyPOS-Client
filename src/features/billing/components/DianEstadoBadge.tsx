/**
 * DianEstadoBadge — Visualiza el estado DIAN de un ticket o nota.
 *
 * Estados:
 *   NO_APLICA       — Documento no electrónico (INFORMAL)
 *   PENDIENTE_DIAN  — Esperando envío al proveedor
 *   ENVIADO_DIAN    — Enviado, esperando respuesta
 *   ACEPTADO_DIAN   — Aceptado por DIAN ✅
 *   RECHAZADO_DIAN  — Rechazado por DIAN ❌
 *   ERROR_DIAN      — Error técnico, reintentable 🔄
 */

import { AlertCircle, CheckCircle2, Clock, Minus, RefreshCw, XCircle } from 'lucide-react'

interface Props {
  estado: string
  mensaje?: string | null
  intentos?: number
  size?: 'sm' | 'md'
}

const CONFIG: Record<
  string,
  {
    label: string
    bg: string
    text: string
    icon: typeof CheckCircle2
  }
> = {
  NO_APLICA: {
    label: 'No aplica',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    icon: Minus,
  },
  PENDIENTE_DIAN: {
    label: 'Pendiente DIAN',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: Clock,
  },
  ENVIADO_DIAN: {
    label: 'Enviado',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: RefreshCw,
  },
  ACEPTADO_DIAN: {
    label: 'Aceptado DIAN',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  RECHAZADO_DIAN: {
    label: 'Rechazado DIAN',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: XCircle,
  },
  ERROR_DIAN: {
    label: 'Error envío',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    icon: AlertCircle,
  },
}

export default function DianEstadoBadge({ estado, mensaje, intentos, size = 'sm' }: Props) {
  const conf = CONFIG[estado] ?? CONFIG.NO_APLICA!
  const Icon = conf.icon
  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5 gap-1'
      : 'text-xs px-2 py-1 gap-1.5'
  const iconSize = size === 'sm' ? 10 : 12

  const tooltip = [
    mensaje,
    intentos !== undefined && intentos > 0 ? `${intentos} intento${intentos > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <span
      title={tooltip || undefined}
      className={`inline-flex items-center rounded-full font-semibold ${conf.bg} ${conf.text} ${sizeClass}`}
    >
      <Icon size={iconSize} />
      {conf.label}
    </span>
  )
}
