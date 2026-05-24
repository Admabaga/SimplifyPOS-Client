/**
 * MasterAIPage — Centro de Inteligencia IA (solo master).
 *
 * Dos asesores Claude:
 *  1. Asesor del Ecosistema (pos-advisor) — analiza GMV, tenants, CxC, alertas
 *  2. Estrategia de Marketing — usa datos de /master/analytics
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Brain,
  ChevronRight,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Clock,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { aiApi } from '@/shared/api/aiApi'
import { masterApi } from './api'
import { formatRelativeTime, usePersistedAnalysis } from './usePersistedAnalysis'

// ─── renderAnalysis (replicado de AIAdvisorPanel) ────────────────────────────

function renderAnalysis(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={i} className="h-2" />
    if (trimmed.startsWith('##') || (trimmed.startsWith('**') && trimmed.endsWith('**'))) {
      const clean = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')
      return (
        <h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1 first:mt-0">
          {clean}
        </h3>
      )
    }
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*   ')) {
      const clean = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '')
      return (
        <div key={i} className="flex gap-2 items-start mb-1">
          <ChevronRight size={12} className="text-violet-500 shrink-0 mt-1" />
          <span
            className="text-xs leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: clean.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
            }}
          />
        </div>
      )
    }
    const withBold = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return (
      <p
        key={i}
        className="text-xs leading-relaxed mb-1"
        dangerouslySetInnerHTML={{ __html: withBold }}
      />
    )
  })
}

// ─── Skeleton animado ─────────────────────────────────────────────────────────

function AnalysisSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-slate-200 rounded-full w-2/3" />
      <div className="h-3 bg-slate-100 rounded-full w-full" />
      <div className="h-3 bg-slate-100 rounded-full w-5/6" />
      <div className="h-3 bg-slate-100 rounded-full w-4/5" />
      <div className="h-4 bg-slate-200 rounded-full w-1/2 mt-4" />
      <div className="h-3 bg-slate-100 rounded-full w-full" />
      <div className="h-3 bg-slate-100 rounded-full w-3/4" />
      <div className="h-3 bg-slate-100 rounded-full w-5/6" />
    </div>
  )
}

// ─── Card 1 — Asesor del Ecosistema ──────────────────────────────────────────

function EcosystemAdvisorCard() {
  const { analysis, generatedAt, save } = usePersistedAnalysis('master_ai_pos_advisor_v1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const result = await aiApi.posAdvisor()
      save(result.analysis)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      const msg = err?.response?.data?.detail || err?.message || 'Error desconocido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-6 pb-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0 text-xl">
            🏪
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">Asesor del Ecosistema</h2>
              {analysis && !loading && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Nuevo análisis"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Analiza GMV, tenants activos/inactivos, CxC y transacciones del mes
            </p>
          </div>
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {['GMV mensual', 'Tenants', 'CxC', 'Alertas operativas'].map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {/* Empty state */}
        {!analysis && !loading && !error && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center mx-auto mb-3 text-xl">
              🏪
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">
              Análisis del ecosistema SimplifyPOS
            </p>
            <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
              Claude lee tus métricas cross-tenant y te entrega un diagnóstico operativo con alertas y recomendaciones.
            </p>
            <Button
              variant="primary"
              icon={<Sparkles size={14} />}
              onClick={handleAnalyze}
            >
              Analizar ecosistema
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border border-emerald-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-emerald-600 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">Claude está analizando el ecosistema…</span>
            </div>
            <AnalysisSkeleton />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">No se pudo conectar con Claude</p>
            </div>
            <p className="text-xs text-red-500 mb-3 ml-5 whitespace-pre-wrap break-words">
              {error}
            </p>
            <Button size="sm" variant="secondary" onClick={handleAnalyze}>
              Reintentar
            </Button>
          </div>
        )}

        {/* Analysis */}
        {analysis && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock size={11} />
                <span>Generado {formatRelativeTime(generatedAt)}</span>
              </div>
              <button
                onClick={handleAnalyze}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
                title="Genera un nuevo análisis (consume tokens de Anthropic)"
              >
                <RefreshCw size={11} />
                Nuevo análisis
              </button>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border border-emerald-100 p-5">
              <div className="prose prose-sm max-w-none">{renderAnalysis(analysis)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card 2 — Estrategia de Marketing ─────────────────────────────────────────

function MarketingStrategyCard() {
  const { analysis, generatedAt, save } = usePersistedAnalysis('master_ai_marketing_v1')
  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch,
  } = useQuery({
    queryKey: ['master', 'analytics'],
    queryFn: () => masterApi.analytics(),
    staleTime: 60_000,
  })

  async function handleAnalyze() {
    if (!analyticsData) return
    setLoading(true)
    setAiError(null)
    try {
      const result = await aiApi.marketing(analyticsData as unknown as Record<string, unknown>)
      save(result.analysis)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      const msg = err?.response?.data?.detail || err?.message || 'Error desconocido'
      setAiError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-6 pb-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shrink-0 text-xl">
            📈
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800">Estrategia de Marketing</h2>
              {analysis && !loading && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !analyticsData}
                  className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                  title="Nuevo análisis"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Pricing, suscripciones, canales y plan de crecimiento para SimplifyPOS
            </p>
          </div>
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {['Precios', 'Suscripciones', 'Ofertas', 'Crecimiento'].map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {/* Analytics error */}
        {analyticsError && !analyticsLoading && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">No se pudieron cargar las métricas</p>
            </div>
            <p className="text-xs text-red-500 mb-3 ml-5">
              Se necesitan los datos de analytics para generar la estrategia.
            </p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Reintentar carga de datos
            </Button>
          </div>
        )}

        {/* Empty state (analytics cargado, no hay analysis aún) */}
        {!analyticsError && !analysis && !loading && !aiError && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-50 flex items-center justify-center mx-auto mb-3 text-xl">
              📈
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">
              Estrategia de crecimiento para SimplifyPOS
            </p>
            <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
              Claude analiza las métricas cross-tenant y diseña un plan de marketing con acciones concretas de pricing, retención y captación.
            </p>
            <Button
              variant="primary"
              icon={<Sparkles size={14} />}
              onClick={handleAnalyze}
              disabled={analyticsLoading || !analyticsData}
            >
              {analyticsLoading ? 'Cargando datos…' : 'Generar estrategia'}
            </Button>
          </div>
        )}

        {/* Loading AI */}
        {loading && (
          <div className="rounded-2xl bg-gradient-to-br from-rose-50/60 to-pink-50/30 border border-rose-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-rose-600 animate-pulse" />
              <span className="text-xs font-semibold text-rose-700">Claude está diseñando la estrategia…</span>
            </div>
            <AnalysisSkeleton />
          </div>
        )}

        {/* AI Error */}
        {aiError && !loading && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">No se pudo conectar con Claude</p>
            </div>
            <p className="text-xs text-red-500 mb-3 ml-5 whitespace-pre-wrap break-words">
              {aiError}
            </p>
            <Button size="sm" variant="secondary" onClick={handleAnalyze}>
              Reintentar
            </Button>
          </div>
        )}

        {/* Analysis */}
        {analysis && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Clock size={11} />
                <span>Generado {formatRelativeTime(generatedAt)}</span>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!analyticsData}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 transition-colors disabled:opacity-40"
                title="Genera una nueva estrategia (consume tokens de Anthropic)"
              >
                <RefreshCw size={11} />
                Nuevo análisis
              </button>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-50/60 to-pink-50/30 border border-rose-100 p-5">
              <div className="prose prose-sm max-w-none">{renderAnalysis(analysis)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Info cards inferiores ────────────────────────────────────────────────────

const INFO_CARDS = [
  {
    icon: <Lightbulb size={18} className="text-amber-600" />,
    iconBg: 'bg-amber-50 border-amber-100',
    title: '¿Qué analiza?',
    items: [
      'GMV consolidado del mes y tendencia vs anterior',
      'Tenants activos, inactivos y riesgo de churn',
      'Cuentas por cobrar del ecosistema (CxC)',
      'Engagement DAU/WAU/MAU por tenant',
      'Distribución geográfica y concentración de clientes',
      'Audit log y patrones de actividad sospechosa',
    ],
  },
  {
    icon: <Clock size={18} className="text-blue-600" />,
    iconBg: 'bg-blue-50 border-blue-100',
    title: '¿Cuándo usarlo?',
    items: [
      'Cierre de mes — para hacer el diagnóstico ejecutivo',
      'Antes de reuniones de directivos o inversionistas',
      'Cuando detectas anomalías en GMV o tenants',
      'Para planificar campañas de retención o expansión',
      'Al menos una vez por semana para el asesor de ecosistema',
      'Mensualmente para la estrategia de marketing',
    ],
  },
  {
    icon: <MessageSquare size={18} className="text-violet-600" />,
    iconBg: 'bg-violet-50 border-violet-100',
    title: '¿Qué esperar?',
    items: [
      'Diagnóstico en lenguaje ejecutivo, no técnico',
      'Alertas priorizadas por impacto en el negocio',
      'Acciones concretas con pasos específicos',
      'Identificación de oportunidades de crecimiento',
      'Recomendaciones de pricing y modelo de suscripción',
      'Plan de retención para tenants con riesgo de churn',
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MasterAIPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header prominente ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden shadow-md"
        style={{
          background: 'linear-gradient(135deg, var(--t-sidebar-bg) 0%, color-mix(in srgb, var(--t-sidebar-bg) 85%, transparent) 100%)',
        }}
      >
        <div className="px-6 py-8 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg shrink-0">
              <Brain size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Centro de Inteligencia IA
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white/90 border border-white/20 backdrop-blur-sm uppercase tracking-wider">
                  Claude Haiku · Solo Master
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed max-w-xl">
                Análisis estratégico de tu ecosistema SimplifyPOS, impulsado por IA
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dos asesores en grid 2 cols ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EcosystemAdvisorCard />
        <MarketingStrategyCard />
      </div>

      {/* ── Sección de info — 3 cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {INFO_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${card.iconBg}`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">{card.title}</h3>
            <ul className="space-y-1.5">
              {card.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ChevronRight size={11} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
