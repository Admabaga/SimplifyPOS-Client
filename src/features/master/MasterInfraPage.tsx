import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button, Card, PageHeader, Spinner, StatCard } from '@/shared/components/ui'
import { infraApi, type InfraMetrics } from './infraApi'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

function healthColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Excelente' }
  if (score >= 60) return { text: 'text-yellow-600', bg: 'bg-yellow-500', label: 'Aceptable' }
  if (score >= 40) return { text: 'text-orange-600', bg: 'bg-orange-500', label: 'Atención' }
  return { text: 'text-red-600', bg: 'bg-red-500', label: 'Crítico' }
}

// ─── Score radial ─────────────────────────────────────────────────────────────

function HealthScore({ score }: { score: number }) {
  const { text, bg, label } = healthColor(score)
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg width="128" height="128" className="-rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            className={text}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${text}`}>{score}</span>
          <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-bold ${text}`}>{label}</span>
    </div>
  )
}

// ─── Proyección pill ──────────────────────────────────────────────────────────

function ProyeccionPill({ months, label }: { months: number | null; label: string }) {
  if (!months) return null
  const urgency = months < 3 ? 'bg-red-100 text-red-700' : months < 9 ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${urgency}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-black">~{months} meses</span>
    </div>
  )
}

// ─── AI Analysis panel ────────────────────────────────────────────────────────

function AIPanel() {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => infraApi.analyze(),
    onSuccess: (data) => setAnalysis(data.analysis),
  })

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Análisis con IA</h3>
          <p className="text-xs text-slate-500">Claude analiza tus métricas y te dice exactamente qué hacer</p>
        </div>
      </div>

      {!analysis && !mutation.isPending && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <Sparkles size={36} className="mx-auto text-violet-400 mb-3" />
          <p className="text-sm text-slate-600 mb-1 font-medium">¿Cuándo necesitas más recursos?</p>
          <p className="text-xs text-slate-400 mb-5">
            Claude lee tus métricas reales y te da un plan concreto: qué escalar, cuándo, y qué señales monitorear.
          </p>
          <Button
            variant="primary"
            icon={<Sparkles size={14} />}
            onClick={() => mutation.mutate()}
          >
            Analizar con Claude AI
          </Button>
        </div>
      )}

      {mutation.isPending && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p className="text-sm text-slate-500">Claude está analizando tu infraestructura…</p>
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Error al conectar con Claude AI</p>
          <p className="text-xs opacity-75 whitespace-pre-wrap break-words">
            {(mutation.error as { response?: { data?: { detail?: string } }; message?: string })
              ?.response?.data?.detail ||
              (mutation.error as Error)?.message ||
              'Error desconocido. Revisa que ANTHROPIC_API_KEY esté configurada.'}
          </p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => mutation.mutate()}>
            Reintentar
          </Button>
        </div>
      )}

      {analysis && (
        <div>
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-5">
            <div className="prose prose-sm max-w-none text-slate-700">
              {analysis.split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} className="h-2" />
                if (line.startsWith('##')) {
                  return (
                    <h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1 first:mt-0">
                      {line.replace(/^#+\s*/, '')}
                    </h3>
                  )
                }
                if (line.startsWith('-') || line.startsWith('•')) {
                  return (
                    <div key={i} className="flex gap-2 items-start mb-1">
                      <ChevronRight size={12} className="text-violet-500 shrink-0 mt-1" />
                      <span className="text-xs leading-relaxed">{line.replace(/^[-•]\s*/, '')}</span>
                    </div>
                  )
                }
                return <p key={i} className="text-xs leading-relaxed mb-1">{line}</p>
              })}
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw size={12} />}
              onClick={() => { setAnalysis(null); mutation.mutate() }}
            >
              Nuevo análisis
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Metrics dashboard ────────────────────────────────────────────────────────

function MetricsDashboard({ m }: { m: InfraMetrics }) {
  const { db, crecimiento: cr, actividad: act, tenants, proyecciones: proy, salud } = m

  // Top 8 tablas por filas
  const topTablas = Object.entries(db.tabla_rows)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const maxTablaRows = Math.max(...topTablas.map(([, v]) => v), 1)

  return (
    <div className="space-y-6">
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tamaño DB"
          value={`${db.size_mb} MB`}
          accent="blue"
          icon={<HardDrive size={18} />}
          subValue={db.engine}
        />
        <StatCard
          label="Total filas"
          value={fmt(db.total_rows, 0)}
          accent="purple"
          icon={<Database size={18} />}
          subValue={`~${cr.monthly_growth_mb_estimado} MB/mes`}
        />
        <StatCard
          label="Actividad hoy (pico)"
          value={`${act.peak_eventos_hora}/h`}
          accent="green"
          icon={<Zap size={18} />}
          subValue={`Promedio ${act.avg_eventos_hora}/h`}
        />
        <StatCard
          label="Errores (mes)"
          value={`${act.errores_mes}`}
          accent={act.errores_mes > 100 ? 'red' : 'slate'}
          icon={<AlertTriangle size={18} />}
          subValue="Eventos de error en audit log"
        />
      </div>

      {/* Row 2: Health + Issues + Proyecciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score */}
        <Card className="p-6 flex flex-col items-center justify-center gap-4">
          <HealthScore score={salud.score} />
          <p className="text-xs text-slate-400 text-center">
            Score de salud técnica del sistema
          </p>
        </Card>

        {/* Issues */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-500" />
            Problemas detectados
          </h3>
          {salud.issues.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 size={28} className="text-emerald-500" />
              <p className="text-sm text-slate-500">Ningún problema crítico</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {salud.issues.map((issue, i) => (
                <li key={i} className="flex gap-2 items-start text-xs text-slate-600 bg-orange-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Proyecciones */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Clock size={15} className="text-blue-500" />
            Proyecciones de escala
          </h3>
          <div className="space-y-2">
            <ProyeccionPill months={proy.months_to_500mb} label="DB → 500 MB" />
            <ProyeccionPill months={proy.months_to_2gb} label="DB → 2 GB" />
            <ProyeccionPill months={proy.months_to_5m_rows} label="5 millones de filas" />
          </div>
          <p className="text-[10px] text-slate-400 mt-3 text-center">
            Basado en el ritmo de crecimiento actual
          </p>
        </Card>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Actividad mensual (serie audit) */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity size={15} className="text-blue-500" />
            Actividad mensual (eventos)
          </h3>
          {cr.audit_serie_mensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cr.audit_serie_mensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="ym" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v, 0)} />
                <Tooltip formatter={(v) => [fmt(Number(v), 0), 'Eventos']} />
                <Line
                  type="monotone"
                  dataKey="n"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">
              Sin datos suficientes
            </div>
          )}
        </Card>

        {/* Actividad últimas 24h por hora */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Zap size={15} className="text-amber-500" />
            Actividad últimas 24 horas
          </h3>
          {act.ultimas_24h.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={act.ultimas_24h}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="h" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [Number(v), 'Eventos']} />
                <Bar dataKey="n" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">
              Sin actividad en las últimas 24h
            </div>
          )}
        </Card>
      </div>

      {/* Row 4: Crecimiento stats + Carga por tenant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crecimiento */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-emerald-500" />
            Métricas de crecimiento
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'Actividad del sistema',
                curr: cr.audit_mes_actual,
                prev: cr.audit_mes_prev,
                pct: cr.audit_growth_pct,
              },
              {
                label: 'Ventas registradas',
                curr: cr.ventas_mes_actual,
                prev: cr.ventas_mes_prev,
                pct: cr.ventas_growth_pct,
              },
            ].map(({ label, curr, prev, pct }) => (
              <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      pct >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {pct >= 0 ? '+' : ''}{pct}%
                  </span>
                </div>
                <div className="flex gap-4 text-[11px] text-slate-500">
                  <span>Este mes: <strong className="text-slate-700">{fmt(curr, 0)}</strong></span>
                  <span>Anterior: <strong className="text-slate-700">{fmt(prev, 0)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Carga por tenant */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Users size={15} className="text-purple-500" />
            Carga por tenant (top {tenants.carga_por_tenant.length})
          </h3>
          {tenants.carga_por_tenant.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">Sin datos de carga</div>
          ) : (
            <div className="space-y-2">
              {tenants.carga_por_tenant.slice(0, 6).map((t) => (
                <div key={t.admin_id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16 shrink-0">Tenant {t.admin_id}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-10 text-right">
                    {t.pct}%
                  </span>
                </div>
              ))}
              {tenants.top_tenant_concentracion_pct > 60 && (
                <p className="text-[10px] text-orange-600 bg-orange-50 rounded-lg px-3 py-2 mt-2">
                  ⚠️ Alta concentración: un tenant ocupa {tenants.top_tenant_concentracion_pct}% del tráfico
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Row 5: Distribución de filas por tabla */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Database size={15} className="text-slate-500" />
          Filas por tabla (top 8)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {topTablas.map(([tabla, count]) => (
            <div key={tabla} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-28 shrink-0 capitalize">{tabla}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: `${(count / maxTablaRows) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600 w-12 text-right">
                {fmt(count, 0)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MasterInfraPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['master', 'infra', 'metrics'],
    queryFn: () => infraApi.getMetrics(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return (
    <div>
      <PageHeader
        title="Salud Técnica"
        subtitle="Métricas de infraestructura, proyecciones de escala y análisis con IA"
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <MetricsDashboard m={data} />
          <AIPanel />
          <p className="text-xs text-slate-400 text-center pb-4">
            Última actualización: {new Date(data.generated_at).toLocaleString('es-CO')}
          </p>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <Server size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No se pudieron cargar las métricas</p>
        </div>
      )}
    </div>
  )
}
