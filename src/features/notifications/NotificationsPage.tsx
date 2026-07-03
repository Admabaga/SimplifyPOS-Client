import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, PackageX, Package, ArrowRight, RefreshCw, CheckCircle2,
  Filter, CreditCard, FileText, Landmark, Info,
} from 'lucide-react'
import { Button, Card, Spinner, PageHeader } from '@/shared/components/ui'
import { notificationsApi, type AppNotification } from './api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityConfig(s: AppNotification['severity']) {
  if (s === 'critical')
    return { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', barColor: 'bg-red-500', textColor: 'text-red-700', label: 'Urgente' }
  if (s === 'warning')
    return { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', barColor: 'bg-yellow-400', textColor: 'text-yellow-700', label: 'Atención' }
  return { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', barColor: 'bg-blue-400', textColor: 'text-blue-700', label: 'Info' }
}

function typeIcon(n: AppNotification) {
  const s = severityConfig(n.severity)
  const cls = s.textColor
  if (n.type === 'subscription') return <CreditCard size={20} className={cls} />
  if (n.type === 'dian_quota')   return <FileText size={20} className={cls} />
  if (n.type === 'caja')         return <Landmark size={20} className={cls} />
  if (n.severity === 'critical') return <PackageX size={20} className={cls} />
  if (n.severity === 'info')     return <Info size={20} className={cls} />
  return <AlertTriangle size={20} className={cls} />
}

// ─── Tarjeta de notificación ─────────────────────────────────────────────────

function NotifCard({ n, onGoTo }: { n: AppNotification; onGoTo: (n: AppNotification) => void }) {
  const cfg = severityConfig(n.severity)

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-md ${cfg.bg}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mt-0.5">
          {typeIcon(n)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-800">{n.titulo}</h3>
          {n.type === 'low_stock' && n.product_codigo && (
            <p className="text-xs text-slate-400">Código: {n.product_codigo}</p>
          )}

          <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{n.mensaje}</p>

          {/* Extra para stock: nivel actual */}
          {n.type === 'low_stock' && n.stock_actual !== undefined && (
            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap mt-3">
              <span>Stock actual: <strong className={cfg.textColor}>{n.stock_actual} uds</strong></span>
              {n.avg_semanal !== undefined && <span>Ritmo: <strong>{n.avg_semanal}</strong> uds/semana</span>}
              {n.dias_restantes !== undefined && <span>Alcanza ~<strong>{n.dias_restantes} días</strong></span>}
            </div>
          )}
        </div>

        <button
          onClick={() => onGoTo(n)}
          className="shrink-0 p-2 rounded-xl bg-white shadow-sm text-slate-400 hover:text-slate-700 hover:shadow transition-all"
          title="Ir"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function AllGood() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle2 size={36} className="text-green-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-1">¡Todo al día! 🎉</h3>
      <p className="text-sm text-slate-400 max-w-xs">
        No hay alertas pendientes: stock, suscripción, facturación y caja en orden.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'critical' | 'warning' | 'info'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterKey>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications', 'feed'],
    queryFn: () => notificationsApi.getAll(),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const notifications = data?.notifications ?? []
  const filtered =
    filter === 'all' ? notifications : notifications.filter((n) => n.severity === filter)

  const handleGoTo = (n: AppNotification) => {
    navigate(n.action_url ?? (n.product_id ? `/products?highlight=${n.product_id}` : '/dashboard'))
  }

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle="Alertas de tu negocio: stock, suscripción, facturación electrónica y caja"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Revisando…' : 'Actualizar'}
          </Button>
        }
      />

      {/* Resumen */}
      {data && data.count > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <Card className="p-2 sm:p-4 text-center">
            <p className="text-[26px] sm:text-[32px] font-bold text-slate-800 tabular-nums leading-none">{data.count}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Total alertas</p>
          </Card>
          <Card className="p-2 sm:p-4 text-center border-red-100 bg-red-50">
            <p className="text-[26px] sm:text-[32px] font-bold text-red-600 tabular-nums leading-none">{data.critical}</p>
            <p className="text-[10px] sm:text-xs text-red-500 mt-1">Urgentes</p>
          </Card>
          <Card className="p-2 sm:p-4 text-center border-yellow-100 bg-yellow-50">
            <p className="text-[26px] sm:text-[32px] font-bold text-yellow-600 tabular-nums leading-none">{data.warning}</p>
            <p className="text-[10px] sm:text-xs text-yellow-500 mt-1">Atención</p>
          </Card>
        </div>
      )}

      {/* Filtros */}
      {data && data.count > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          {(['all', 'critical', 'warning', 'info'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'critical' ? '🔴 Urgentes' : f === 'warning' ? '🟡 Atención' : '🔵 Info'}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : filtered.length === 0 && notifications.length === 0 ? (
        <AllGood />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay alertas de este tipo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n, i) => (
            <NotifCard key={n.key ?? `${n.type}-${n.product_id ?? i}`} n={n} onGoTo={handleGoTo} />
          ))}
        </div>
      )}
    </div>
  )
}
