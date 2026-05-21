import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Bell, AlertTriangle, PackageX, Package, ArrowRight,
  RefreshCw, CheckCircle2, TrendingUp, Filter,
} from 'lucide-react'
import { Button, Card, Spinner, PageHeader } from '@/shared/components/ui'
import { notificationsApi, type StockNotification } from './api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityConfig(s: StockNotification['severity']) {
  return s === 'critical'
    ? {
        bg: 'bg-red-50 border-red-200',
        badge: 'bg-red-100 text-red-700',
        icon: <PackageX size={20} className="text-red-500" />,
        dot: 'bg-red-500',
        label: 'Agotado',
        barColor: 'bg-red-500',
        textColor: 'text-red-700',
      }
    : {
        bg: 'bg-yellow-50 border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-700',
        icon: <AlertTriangle size={20} className="text-yellow-500" />,
        dot: 'bg-yellow-400',
        label: 'Stock bajo',
        barColor: 'bg-yellow-400',
        textColor: 'text-yellow-700',
      }
}

// Calcula el % de stock vs umbral para la barra de progreso
function stockPct(stockActual: number, thresholdQty: number): number {
  if (thresholdQty <= 0) return 0
  // Mostramos cuánto stock tiene vs 3× el umbral (referencia de "suficiente")
  const referencia = thresholdQty * 3
  return Math.min(100, Math.round((stockActual / referencia) * 100))
}

// ─── Tarjeta de notificación ─────────────────────────────────────────────────

function NotifCard({ n, onGoTo }: { n: StockNotification; onGoTo: (id: number) => void }) {
  const cfg = severityConfig(n.severity)
  const pct = stockPct(n.stock_actual, n.threshold_qty)

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-md ${cfg.bg}`}>
      <div className="flex items-start gap-4">
        {/* Icono severidad */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mt-0.5">
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            {n.high_seller && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                <TrendingUp size={10} /> Alta rotación
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-800 truncate">{n.product_nombre}</h3>
          {n.product_codigo && (
            <p className="text-xs text-slate-400 mb-2">Código: {n.product_codigo}</p>
          )}

          {/* Mensaje */}
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{n.mensaje}</p>

          {/* Barra de stock */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Stock actual: <strong className={cfg.textColor}>{n.stock_actual} unidades</strong></span>
              <span>Umbral: {n.threshold_qty} ({n.threshold_pct}%)</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all ${cfg.barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <span>
              📦 <strong>{n.avg_semanal}</strong> unid/semana promedio
            </span>
            <span>
              📅 Período analizado: <strong>{n.dias_periodo} días</strong>
            </span>
            <span>
              📊 Ventas en período: <strong>{n.ventas_periodo} unid</strong>
            </span>
          </div>
        </div>

        {/* Botón acción */}
        <button
          onClick={() => onGoTo(n.product_id)}
          className="shrink-0 p-2 rounded-xl bg-white shadow-sm text-slate-400 hover:text-slate-700 hover:shadow transition-all"
          title="Ver producto"
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
        Todos tus productos tienen stock suficiente según su ritmo de ventas. Sigue así.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'critical' | 'warning'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications', 'stock'],
    queryFn: () => notificationsApi.getStockAlerts(),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const notifications = data?.notifications ?? []
  const filtered =
    filter === 'all' ? notifications : notifications.filter((n) => n.severity === filter)

  const handleGoTo = (productId: number) => {
    navigate(`/products?highlight=${productId}`)
  }

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle="Alertas de stock bajo basadas en la velocidad real de tus ventas"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
        }
      />

      {/* Resumen */}
      {data && data.count > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <Card className="p-2 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-slate-800">{data.count}</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Total alertas</p>
          </Card>
          <Card className="p-2 sm:p-4 text-center border-red-100 bg-red-50">
            <p className="text-xl sm:text-2xl font-black text-red-600">{data.critical}</p>
            <p className="text-[10px] sm:text-xs text-red-500 mt-0.5">Agotados</p>
          </Card>
          <Card className="p-2 sm:p-4 text-center border-yellow-100 bg-yellow-50">
            <p className="text-xl sm:text-2xl font-black text-yellow-600">{data.warning}</p>
            <p className="text-[10px] sm:text-xs text-yellow-500 mt-0.5">Stock bajo</p>
          </Card>
        </div>
      )}

      {/* Filtros */}
      {data && data.count > 0 && (
        <div className="flex items-center gap-2 mb-5">
          <Filter size={14} className="text-slate-400" />
          {(['all', 'critical', 'warning'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'critical' ? '🔴 Agotados' : '🟡 Stock bajo'}
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
          <p className="text-sm">No hay alertas de tipo "{filter}"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <NotifCard key={n.product_id} n={n} onGoTo={handleGoTo} />
          ))}

          <p className="text-xs text-slate-400 text-center pt-2">
            Basado en los últimos {data?.periodo_dias} días de ventas
          </p>
        </div>
      )}
    </div>
  )
}
