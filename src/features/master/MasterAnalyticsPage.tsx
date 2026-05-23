/**
 * Master Analytics — Dashboard SaaS cross-tenant.
 *
 * Visión global del operador del POS sobre todos los negocios del sistema:
 *  - Crecimiento de tenants
 *  - GMV consolidado
 *  - Engagement (DAU/WAU/MAU)
 *  - Top performers
 *  - Distribución geográfica
 *  - Audit log activity
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart,
  CreditCard, BookOpen, Activity, MapPin, Shield, Sparkles, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Receipt, AlertCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import {
  Card, PageHeader, Spinner, StatCard, EmptyState, SectionHeader, Badge,
} from '@/shared/components/ui'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { formatCOP } from '@/shared/lib/formatters'
import { masterApi } from './api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatYM(ym: string) {
  // "2026-05" → "May 2026"
  const [y, m] = ym.split('-')
  const idx = Number(m) - 1
  return MONTHS_SHORT[idx] && y ? `${MONTHS_SHORT[idx]} ${y.slice(2)}` : ym
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; dataKey: string; color?: string }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-2.5 text-xs">
      <p className="text-slate-600 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? 'var(--t-primary)' }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800 tabular-nums">
            {p.dataKey === 'gmv' ? formatCOP(p.value) : p.value.toLocaleString('es-CO')}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Delta indicator ──────────────────────────────────────────────────────────

function DeltaPill({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const positive = pct > 0
  const flat = Math.abs(pct) < 0.5
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight
  const color = flat ? 'text-slate-500 bg-slate-100' : positive ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      <Icon size={10} />
      {positive && !flat ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

// ─── Insight engine — para master ─────────────────────────────────────────────

function generateMasterInsights(d: NonNullable<ReturnType<typeof useQuery<typeof masterApi.analytics extends () => Promise<infer T> ? T : never>>['data']>) {
  type MasterInsight = {
    severity: 'success' | 'warning' | 'danger' | 'info' | 'opportunity'
    icon: React.ReactNode
    title: string
    description: string
    metric?: string
    metricLabel?: string
  }
  const out: MasterInsight[] = []

  // 1) Growth de tenants
  if (d.tenants.delta_pct !== null) {
    if (d.tenants.delta_pct > 20) {
      out.push({
        severity: 'success',
        icon: <TrendingUp size={16} />,
        title: `Crecimiento del ${d.tenants.delta_pct.toFixed(1)}% en nuevos negocios`,
        description: `${d.tenants.nuevos_30d} negocios se registraron en los últimos 30 días vs ${d.tenants.nuevos_30d_prev} en el período anterior. Mantén la inversión en adquisición que está funcionando.`,
        metric: `+${d.tenants.nuevos_30d}`,
        metricLabel: 'Nuevos en 30 días',
      })
    } else if (d.tenants.delta_pct < -20) {
      out.push({
        severity: 'danger',
        icon: <TrendingDown size={16} />,
        title: 'Caída en adquisición de nuevos negocios',
        description: `${d.tenants.nuevos_30d} nuevos vs ${d.tenants.nuevos_30d_prev} el período anterior (${d.tenants.delta_pct.toFixed(1)}%). Revisa el embudo de signup y campañas de marketing.`,
        metric: `${d.tenants.nuevos_30d}`,
        metricLabel: 'Nuevos en 30 días',
      })
    }
  }

  // 2) GMV growth
  if (d.gmv.delta_pct !== null) {
    if (d.gmv.delta_pct > 15) {
      out.push({
        severity: 'success',
        icon: <DollarSign size={16} />,
        title: `GMV creció ${d.gmv.delta_pct.toFixed(1)}% mes vs mes`,
        description: `${formatCOP(d.gmv.mes_actual)} este mes vs ${formatCOP(d.gmv.mes_anterior)} el anterior. Volumen sólido, considera escalar capacidad de infra.`,
        metric: formatCOP(d.gmv.mes_actual),
        metricLabel: 'GMV mes actual',
      })
    } else if (d.gmv.delta_pct < -15) {
      out.push({
        severity: 'warning',
        icon: <TrendingDown size={16} />,
        title: `GMV bajó ${Math.abs(d.gmv.delta_pct).toFixed(1)}% vs mes anterior`,
        description: `Procesaste ${formatCOP(d.gmv.mes_actual)} vs ${formatCOP(d.gmv.mes_anterior)}. Investiga si es estacional o si hay tenants que dejaron de operar.`,
        metric: formatCOP(d.gmv.mes_actual),
        metricLabel: 'GMV mes actual',
      })
    }
  }

  // 3) Engagement health (DAU/WAU ratio — sticky factor)
  if (d.engagement.wau > 0) {
    if (d.engagement.dau_wau_ratio > 40) {
      out.push({
        severity: 'success',
        icon: <Activity size={16} />,
        title: 'Engagement saludable (DAU/WAU)',
        description: `${d.engagement.dau_wau_ratio.toFixed(0)}% de tus usuarios semanales también usan la app diariamente. Indica que el POS forma parte del flujo de trabajo diario.`,
        metric: `${d.engagement.dau_wau_ratio.toFixed(0)}%`,
        metricLabel: 'Stickiness DAU/WAU',
      })
    } else if (d.engagement.dau_wau_ratio < 20) {
      out.push({
        severity: 'warning',
        icon: <Activity size={16} />,
        title: 'Engagement bajo — usuarios no vuelven a diario',
        description: `Solo ${d.engagement.dau_wau_ratio.toFixed(0)}% de los usuarios semanales abren la app cada día. Implementa notificaciones, gamificación o recordatorios de cierre de caja.`,
        metric: `${d.engagement.dau_wau_ratio.toFixed(0)}%`,
        metricLabel: 'Stickiness DAU/WAU',
      })
    }
  }

  // 4) Tenants inactivos (churn potencial)
  if (d.tenants.total > 0) {
    const inactivePct = (d.tenants.inactivos / d.tenants.total) * 100
    if (inactivePct > 15) {
      out.push({
        severity: 'danger',
        icon: <AlertCircle size={16} />,
        title: `${d.tenants.inactivos} negocios inactivos (${inactivePct.toFixed(0)}%)`,
        description: 'Programa una campaña de re-engagement: email + descuento por reactivar. Cada tenant inactivo es churn potencial — el costo de recuperarlo es menor al de adquirir uno nuevo.',
        metric: `${d.tenants.inactivos}`,
        metricLabel: 'Negocios inactivos',
      })
    }
  }

  // 5) Concentración del top tenant (riesgo de dependencia)
  if (d.top_tenants.length > 0 && d.gmv.total > 0) {
    const topShare = (d.top_tenants[0]!.gmv / d.gmv.total) * 100
    if (topShare > 20) {
      out.push({
        severity: 'warning',
        icon: <Building2 size={16} />,
        title: `"${d.top_tenants[0]!.nombre}" concentra ${topShare.toFixed(0)}% del GMV`,
        description: 'Si este cliente se va o reduce operación, el impacto es alto. Diversifica la base con outreach activo a tenants medianos.',
        metric: `${topShare.toFixed(0)}%`,
        metricLabel: 'del GMV total',
      })
    }
  }

  // 6) Geo concentration (oportunidad de expansión)
  if (d.tenants.geo.length > 0 && d.tenants.total > 0) {
    const topCity = d.tenants.geo[0]!
    const topCityShare = (topCity.n / d.tenants.total) * 100
    if (topCityShare > 50) {
      out.push({
        severity: 'opportunity',
        icon: <MapPin size={16} />,
        title: `${topCity.ciudad} concentra ${topCityShare.toFixed(0)}% de tus negocios`,
        description: 'Tu mercado está geográficamente concentrado. Considera expandirte a otras ciudades — replica la estrategia que funcionó aquí.',
        metric: topCity.ciudad,
        metricLabel: `${topCity.n} negocios`,
      })
    }
  }

  // 7) Cuentas por cobrar globales (salud financiera del ecosistema)
  if (d.totales.cuentas_por_cobrar > d.gmv.total * 0.3 && d.gmv.total > 0) {
    out.push({
      severity: 'info',
      icon: <BookOpen size={16} />,
      title: `${formatCOP(d.totales.cuentas_por_cobrar)} pendientes en cuentas`,
      description: 'Tus tenants tienen mucho dinero en la calle. Es una oportunidad para vender features de cobranza (recordatorios automáticos, WhatsApp links de pago).',
      metric: formatCOP(d.totales.cuentas_por_cobrar),
      metricLabel: 'CxC ecosistema',
    })
  }

  // 8) Audit activity insight (compliance / fraude)
  if (d.audit.serie_diaria.length >= 7) {
    const recent = d.audit.serie_diaria.slice(-7).reduce((s, r) => s + r.n, 0)
    const previous = d.audit.serie_diaria.slice(-14, -7).reduce((s, r) => s + r.n, 0)
    if (previous > 0) {
      const change = ((recent - previous) / previous) * 100
      if (Math.abs(change) > 50) {
        out.push({
          severity: change > 0 ? 'info' : 'warning',
          icon: <Shield size={16} />,
          title: `Actividad de auditoría ${change > 0 ? 'subió' : 'bajó'} ${Math.abs(change).toFixed(0)}% esta semana`,
          description: change > 0
            ? `${recent} eventos vs ${previous} la semana pasada. Más uso del sistema o más operaciones sensibles. Verifica que sea actividad legítima.`
            : `${recent} eventos vs ${previous} la semana pasada. Verifica que los tenants sigan operando normalmente.`,
          metric: recent.toString(),
          metricLabel: 'Eventos últimos 7d',
        })
      }
    }
  }

  return out
}

const SEVERITY_STYLES = {
  success: { wrapper: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-50/30', iconWrap: 'bg-white text-emerald-600', chip: 'bg-emerald-100 text-emerald-700', badge: 'Buena señal', metric: 'text-emerald-700', label: 'text-emerald-600/70' },
  warning: { wrapper: 'border-amber-100 bg-gradient-to-br from-amber-50 to-amber-50/30', iconWrap: 'bg-white text-amber-600', chip: 'bg-amber-100 text-amber-700', badge: 'Atención', metric: 'text-amber-700', label: 'text-amber-600/70' },
  danger:  { wrapper: 'border-red-100 bg-gradient-to-br from-red-50 to-red-50/30', iconWrap: 'bg-white text-red-600', chip: 'bg-red-100 text-red-700', badge: 'Crítico', metric: 'text-red-700', label: 'text-red-600/70' },
  info:    { wrapper: 'border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/30', iconWrap: 'bg-white text-blue-600', chip: 'bg-blue-100 text-blue-700', badge: 'Dato', metric: 'text-blue-700', label: 'text-blue-600/70' },
  opportunity: { wrapper: 'border-violet-100 bg-gradient-to-br from-violet-50 to-violet-50/30', iconWrap: 'bg-white text-violet-600', chip: 'bg-violet-100 text-violet-700', badge: 'Oportunidad', metric: 'text-violet-700', label: 'text-violet-600/70' },
} as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MasterAnalyticsPage() {
  const isDesktop = useIsDesktop()
  const { data, isLoading, error } = useQuery({
    queryKey: ['master', 'analytics'],
    queryFn: () => masterApi.analytics(),
    staleTime: 60_000,
  })

  const insights = useMemo(() => (data ? generateMasterInsights(data) : []), [data])

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Master Analytics" subtitle="Visión global del ecosistema SimplifyPOS" />
        <div className="flex justify-center py-24"><Spinner size={36} /></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Master Analytics" subtitle="Visión global del ecosistema SimplifyPOS" />
        <EmptyState
          icon={<AlertCircle size={32} className="text-red-400" />}
          title="No se pudieron cargar las métricas"
          description="Intenta recargar la página."
        />
      </div>
    )
  }

  const tenantsSerie = data.tenants.serie_mensual.map((r) => ({ mes: formatYM(r.ym), nuevos: r.n }))
  const gmvSerie = data.gmv.serie_mensual.map((r) => ({ mes: formatYM(r.ym), gmv: r.gmv, ventas: r.n }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Master Analytics"
        subtitle="Visión global del ecosistema SimplifyPOS"
        actions={
          <Badge variant="purple" dot>
            Master · {new Date(data.generated_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Badge>
        }
      />

      {/* ── KPIs principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <StatCard
            label="Negocios totales"
            value={data.tenants.total.toLocaleString('es-CO')}
            subValue={<span className="text-emerald-600 font-semibold">{data.tenants.activos} activos</span>}
            icon={<Building2 size={16} />}
            accent="blue"
          />
        </div>
        <div className="relative">
          <StatCard
            label="GMV total histórico"
            value={formatCOP(data.gmv.total)}
            subValue={<span className="text-slate-500">{data.totales.ventas.toLocaleString('es-CO')} ventas</span>}
            icon={<DollarSign size={16} />}
            accent="green"
          />
        </div>
        <div className="relative">
          <StatCard
            label="GMV este mes"
            value={formatCOP(data.gmv.mes_actual)}
            subValue={<DeltaPill pct={data.gmv.delta_pct} />}
            icon={<TrendingUp size={16} />}
            accent="purple"
          />
        </div>
        <div className="relative">
          <StatCard
            label="Nuevos negocios (30d)"
            value={data.tenants.nuevos_30d.toString()}
            subValue={<DeltaPill pct={data.tenants.delta_pct} />}
            icon={<Sparkles size={16} />}
            accent="orange"
          />
        </div>
      </div>

      {/* ── Engagement ─────────────────────────────────────────────────────── */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-50">
          <SectionHeader title="Engagement del ecosistema" icon={<Activity size={15} />} />
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'DAU', sub: 'Usuarios activos hoy', value: data.engagement.dau, color: 'from-blue-50 to-blue-50/30 border-blue-100', text: 'text-blue-700' },
            { label: 'WAU', sub: 'Activos últimos 7 días', value: data.engagement.wau, color: 'from-emerald-50 to-emerald-50/30 border-emerald-100', text: 'text-emerald-700' },
            { label: 'MAU', sub: 'Activos últimos 30 días', value: data.engagement.mau, color: 'from-violet-50 to-violet-50/30 border-violet-100', text: 'text-violet-700' },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl border bg-gradient-to-br ${k.color} p-4`}>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{k.label}</p>
              <p className={`text-3xl font-extrabold tabular-nums mt-1 ${k.text}`}>{k.value.toLocaleString('es-CO')}</p>
              <p className="text-[11px] text-slate-500 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-500">Stickiness DAU/WAU:</span>
            <span className="font-bold text-slate-800 tabular-nums">{data.engagement.dau_wau_ratio.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-slate-500">Retención WAU/MAU:</span>
            <span className="font-bold text-slate-800 tabular-nums">{data.engagement.wau_mau_ratio.toFixed(1)}%</span>
          </div>
        </div>
      </Card>

      {/* ── Crecimiento — 2 charts en grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* GMV mensual */}
        <Card padding={false}>
          <div className="p-4 border-b border-slate-50">
            <SectionHeader title="GMV mensual del sistema" icon={<DollarSign size={15} />} />
          </div>
          <div className="p-3">
            {isDesktop ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gmvSerie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} width={50} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Bar dataKey="gmv" name="GMV" fill="var(--t-primary)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-1.5">
                {gmvSerie.map((r, i) => {
                  const max = Math.max(...gmvSerie.map((x) => x.gmv), 1)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-500">{r.mes}</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{formatCOP(r.gmv)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full t-bg rounded-full" style={{ width: `${(r.gmv / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Tenants nuevos por mes */}
        <Card padding={false}>
          <div className="p-4 border-b border-slate-50">
            <SectionHeader title="Nuevos negocios por mes" icon={<Sparkles size={15} />} />
          </div>
          <div className="p-3">
            {isDesktop ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tenantsSerie} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="nuevos"
                    name="Nuevos"
                    stroke="rgb(139, 92, 246)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'rgb(139, 92, 246)', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-1.5">
                {tenantsSerie.map((r, i) => {
                  const max = Math.max(...tenantsSerie.map((x) => x.nuevos), 1)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-slate-500">{r.mes}</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{r.nuevos}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(r.nuevos / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Top tenants + Geo distribution ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top tenants */}
        <Card padding={false} className="lg:col-span-2">
          <div className="p-4 border-b border-slate-50">
            <SectionHeader title="Top 10 negocios por GMV" icon={<TrendingUp size={15} />} />
          </div>
          <div className="divide-y divide-slate-50">
            {data.top_tenants.length === 0 ? (
              <EmptyState title="Sin datos" description="Aún no hay transacciones registradas." />
            ) : (
              data.top_tenants.map((t, i) => {
                const max = data.top_tenants[0]!.gmv || 1
                return (
                  <div key={t.admin_id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-slate-200 text-slate-700' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.ciudad && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin size={9} /> {t.ciudad}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{t.ventas} ventas</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full t-bg rounded-full transition-all" style={{ width: `${(t.gmv / max) * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{formatCOP(t.gmv)}</p>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Geo distribution */}
        <Card padding={false}>
          <div className="p-4 border-b border-slate-50">
            <SectionHeader title="Por ciudad" icon={<MapPin size={15} />} />
          </div>
          <div className="p-4 space-y-2.5">
            {data.tenants.geo.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin datos geográficos</p>
            ) : (
              data.tenants.geo.map((g, i) => {
                const max = data.tenants.geo[0]!.n || 1
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">{g.ciudad}</span>
                      <span className="text-xs font-bold text-slate-800 tabular-nums">{g.n}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(g.n / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── Totales operativos del ecosistema ───────────────────────────────── */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-50">
          <SectionHeader title="Salud financiera del ecosistema" icon={<BarChart3 size={15} />} />
        </div>
        <div className="p-5 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/30 p-4">
            <ShoppingCart size={16} className="text-blue-600 mb-2" />
            <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">{data.totales.ventas.toLocaleString('es-CO')}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">Ventas totales</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-50/30 p-4">
            <CreditCard size={16} className="text-emerald-600 mb-2" />
            <p className="text-sm font-extrabold text-slate-900 tabular-nums leading-none">{formatCOP(data.totales.pagos_recibidos)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">Pagos recibidos</p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-50/30 p-4">
            <Receipt size={16} className="text-orange-600 mb-2" />
            <p className="text-sm font-extrabold text-slate-900 tabular-nums leading-none">{formatCOP(data.totales.gastos_registrados)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">Gastos registrados</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-gradient-to-br from-red-50 to-red-50/30 p-4">
            <BookOpen size={16} className="text-red-600 mb-2" />
            <p className="text-sm font-extrabold text-slate-900 tabular-nums leading-none">{formatCOP(data.totales.cuentas_por_cobrar)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">Por cobrar (CxC)</p>
          </div>
          <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-violet-50/30 p-4">
            <Users size={16} className="text-violet-600 mb-2" />
            <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">{data.totales.usuarios.toLocaleString('es-CO')}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">Usuarios totales</p>
          </div>
        </div>
      </Card>

      {/* ── Audit log activity ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding={false} className="lg:col-span-2">
          <div className="p-4 border-b border-slate-50">
            <SectionHeader title="Actividad de auditoría — últimos 30 días" icon={<Shield size={15} />} />
          </div>
          <div className="p-3">
            {isDesktop ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.audit.serie_diaria.map((r) => ({ d: r.d.slice(5), n: r.n }))} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(data.audit.serie_diaria.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Bar dataKey="n" name="Eventos" fill="rgb(99, 102, 241)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Gráfico disponible en desktop</p>
            )}
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-4 border-b border-slate-50">
            <SectionHeader title="Acciones más frecuentes" icon={<Activity size={15} />} />
          </div>
          <div className="p-4 space-y-2">
            {data.audit.top_acciones.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin eventos recientes</p>
            ) : (
              data.audit.top_acciones.map((a, i) => {
                const max = data.audit.top_acciones[0]!.n || 1
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[11px] font-mono text-slate-700 truncate">{a.action}</span>
                      <span className="text-[11px] font-bold text-slate-800 tabular-nums">{a.n}</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(a.n / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── Insights inteligentes ──────────────────────────────────────────── */}
      {insights.length > 0 && (
        <Card padding={false}>
          <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center">
                <Sparkles size={15} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 leading-tight">Insights para el master</h2>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {insights.length} {insights.length === 1 ? 'hallazgo' : 'hallazgos'} a nivel ecosistema
                </p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
              Análisis cross-tenant
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {insights.map((ins, i) => {
              const s = SEVERITY_STYLES[ins.severity]
              return (
                <div key={i} className={`relative overflow-hidden rounded-xl border p-4 ${s.wrapper}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center shrink-0 ${s.iconWrap}`}>
                      {ins.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${s.chip}`}>{s.badge}</span>
                        <p className="text-sm font-bold text-slate-800 truncate">{ins.title}</p>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{ins.description}</p>
                      {ins.metric && (
                        <div className="mt-2.5 leading-none">
                          <p className={`text-lg font-bold tabular-nums ${s.metric}`}>{ins.metric}</p>
                          {ins.metricLabel && <p className={`text-[10px] mt-1 font-medium ${s.label}`}>{ins.metricLabel}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

    </div>
  )
}
