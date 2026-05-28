/**
 * Master — "Mi día"
 *
 * Vista resumen para el founder: 3-5 KPIs accionables HOY + lista priorizada
 * de tenants a contactar. La diferencia con MasterAnalyticsPage es que esta
 * página responde a "¿qué hago hoy?", no a "¿cómo va el negocio en general?".
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Building2, CheckCircle2, ChevronRight, Activity,
  Sparkles, PhoneCall, AlertCircle, TrendingUp,
} from 'lucide-react'
import {
  PageHeader, Card, Spinner, EmptyState, Badge, SectionHeader, StatCard,
} from '@/shared/components/ui'
import { masterApi, type TenantHealth, type HealthLevel } from './api'
import { useMasterStore } from '@/stores/master'

// ─── Helpers visuales ───────────────────────────────────────────────────────

const LEVEL_META: Record<
  HealthLevel,
  { color: string; bg: string; border: string; label: string; emoji: string }
> = {
  green:  { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Saludable', emoji: '🟢' },
  yellow: { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Atención',  emoji: '🟡' },
  red:    { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Crítico',   emoji: '🔴' },
}

function HealthBadge({ level, score }: { level: HealthLevel; score: number }) {
  const m = LEVEL_META[level]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.bg} ${m.color} border ${m.border}`}>
      <span>{m.emoji}</span>
      <span className="tabular-nums">{score}</span>
    </span>
  )
}

// ─── TenantHealthCard ─────────────────────────────────────────────────────────

function TenantHealthCard({ t, onActuar }: { t: TenantHealth; onActuar: () => void }) {
  const m = LEVEL_META[t.level]
  const topReasons = t.reasons
    .filter((r) => r.severity === 'danger' || r.severity === 'warning')
    .slice(0, 3)

  return (
    <div className={`rounded-xl border p-3 ${m.border} ${m.bg} hover:shadow-sm transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold ${m.color} bg-white border ${m.border}`}>
          <span className="tabular-nums text-xs">{t.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-800 truncate text-sm">{t.nombre}</p>
            <HealthBadge level={t.level} score={t.score} />
          </div>
          <p className="text-[11px] text-slate-500 truncate">{t.email}</p>

          {topReasons.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {topReasons.map((r) => (
                <li
                  key={r.key}
                  className={`text-[11px] flex items-center gap-1.5 ${
                    r.severity === 'danger' ? 'text-red-600' : 'text-amber-700'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                  {r.label}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={onActuar}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium t-text hover:t-text-dk transition-colors"
          >
            Actuar como este negocio
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MasterTodayPage() {
  const navigate = useNavigate()
  const { setActiveTenant } = useMasterStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['master-health-scores'],
    queryFn: masterApi.healthScores,
    staleTime: 60_000,
  })

  const tenantsByLevel = useMemo(() => {
    if (!data) return { red: [], yellow: [], green: [] }
    return {
      red: data.tenants.filter((t) => t.level === 'red'),
      yellow: data.tenants.filter((t) => t.level === 'yellow'),
      green: data.tenants.filter((t) => t.level === 'green'),
    }
  }, [data])

  function handleActuar(t: TenantHealth) {
    setActiveTenant(t.admin_id, t.nombre)
    navigate('/dashboard')
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Mi día" subtitle="Lo que importa HOY como founder" />
        <div className="flex justify-center py-12"><Spinner /></div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Mi día" subtitle="Lo que importa HOY como founder" />
        <EmptyState
          icon={<AlertCircle size={32} />}
          title="No se pudo cargar"
          description="Reintenta en unos segundos"
        />
      </div>
    )
  }

  const { summary, alerts } = data
  const accionablesHoy = tenantsByLevel.red.length + tenantsByLevel.yellow.length

  return (
    <div>
      <PageHeader
        title="Mi día"
        subtitle="Lo que importa HOY como founder de SimplifyPOS"
      />

      {/* ── KPIs accionables ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Saludables"
          value={String(summary.green)}
          subValue={summary.total > 0 ? `${Math.round((summary.green / summary.total) * 100)}% del ecosistema` : ''}
          icon={<CheckCircle2 size={17} className="text-emerald-600" />}
          accent="green"
        />
        <StatCard
          label="Atención"
          value={String(summary.yellow)}
          subValue="Revisar esta semana"
          icon={<AlertTriangle size={17} className="text-amber-500" />}
          accent="yellow"
        />
        <StatCard
          label="Críticos"
          value={String(summary.red)}
          subValue="Contactar HOY"
          icon={<PhoneCall size={17} className="text-red-500" />}
          accent="red"
        />
        <StatCard
          label="Total negocios"
          value={String(summary.total)}
          icon={<Building2 size={17} className="text-blue-600" />}
          accent="blue"
        />
      </div>

      {/* ── Alertas accionables ─────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Card padding={false} className="mb-6">
          <div className="p-4 border-b border-slate-50">
            <SectionHeader
              title="Tu lista de contactos HOY"
              icon={<PhoneCall size={15} className="text-red-500" />}
            />
            <p className="text-[11px] text-slate-500 mt-0.5">Los tenants con mayor riesgo de churn. Cada minuto cuenta.</p>
          </div>
          <ul className="divide-y divide-slate-50">
            {alerts.map((a) => {
              const m = LEVEL_META[a.level]
              return (
                <li
                  key={a.admin_id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors"
                >
                  <span className="text-base">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{a.nombre}</p>
                    <p className={`text-xs ${a.level === 'red' ? 'text-red-600' : 'text-amber-700'}`}>
                      {a.main_reason}
                    </p>
                  </div>
                  <HealthBadge level={a.level} score={a.score} />
                  <button
                    onClick={() => {
                      const t = data.tenants.find((x) => x.admin_id === a.admin_id)
                      if (t) handleActuar(t)
                    }}
                    className="text-xs font-medium t-text hover:t-text-dk inline-flex items-center gap-1 shrink-0"
                  >
                    Ver
                    <ChevronRight size={13} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {alerts.length === 0 && summary.total > 0 && (
        <Card className="mb-6 text-center">
          <div className="py-6">
            <Sparkles size={28} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">¡Día tranquilo! 🎉</p>
            <p className="text-xs text-slate-500">Sin alertas críticas. Aprovecha para construir.</p>
          </div>
        </Card>
      )}

      {/* ── Resto de tenants por nivel ────────────────────────────────── */}
      {(['red', 'yellow', 'green'] as HealthLevel[]).map((level) => {
        const list = tenantsByLevel[level]
        if (list.length === 0) return null
        const m = LEVEL_META[level]
        return (
          <div key={level} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-base`}>{m.emoji}</span>
              <h3 className="font-semibold text-slate-700">{m.label}</h3>
              <Badge variant="gray">{list.length}</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {list.map((t) => (
                <TenantHealthCard
                  key={t.admin_id}
                  t={t}
                  onActuar={() => handleActuar(t)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {summary.total === 0 && (
        <EmptyState
          icon={<Building2 size={32} />}
          title="Sin negocios aún"
          description="A medida que se registren tenants verás aquí su salud."
        />
      )}

      <p className="text-[10px] text-slate-400 text-center mt-8">
        Indicadores: login, ventas, caja, DIAN, cobranza. Score 0-100 actualizado en tiempo real.
        <br />
        <Activity size={10} className="inline" /> Health score · <TrendingUp size={10} className="inline" /> Más detalles en Analytics
      </p>
    </div>
  )
}
