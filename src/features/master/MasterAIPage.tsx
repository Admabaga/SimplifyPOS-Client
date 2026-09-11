/**
 * Master — Inteligencia
 *
 * Dos lecturas asistidas sobre los mismos datos que ya están en las otras
 * pantallas: una operativa (cómo va el ecosistema hoy) y una comercial (qué
 * hacer con los precios y la captación).
 *
 * Lo que se fue: el hero con degradado, los emojis dentro de un cuadro de
 * color y los bloques de análisis pintados de verde y rosa. Todo eso vendía la
 * herramienta antes de que dijera nada; el análisis es texto y se lee mejor
 * sobre papel blanco. El color aquí sólo aparece cuando algo falló.
 *
 * Se conservan las tres columnas de abajo porque responden lo único que no es
 * obvio de un botón que dice "Analizar": con qué datos trabaja, cuándo vale la
 * pena gastarlo y qué tipo de respuesta esperar.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Clock, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button, PageHeader } from '@/shared/components/ui'
import { boldToSafeHtml } from '@/shared/lib/safeMarkdown'
import { aiApi } from '@/shared/api/aiApi'
import { masterApi } from './api'
import { formatRelativeTime, usePersistedAnalysis } from './usePersistedAnalysis'
import { Rotulo } from './components/consola'

// ─── Render del análisis ──────────────────────────────────────────────────────

/**
 * Los encabezados van en versalitas, como los rótulos de la consola, y no como
 * títulos grandes: el análisis es una nota técnica, no un artículo.
 */
function renderAnalysis(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={i} className="h-2" />
    if (trimmed.startsWith('##') || (trimmed.startsWith('**') && trimmed.endsWith('**'))) {
      const clean = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '')
      return (
        <h3
          key={i}
          className="mt-4 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 first:mt-0"
        >
          {clean}
        </h3>
      )
    }
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*   ')) {
      const clean = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '')
      return (
        <div key={i} className="mb-1 flex items-start gap-2">
          <ChevronRight size={11} className="mt-0.5 shrink-0 text-slate-300" />
          <span
            className="text-xs leading-relaxed text-slate-600"
            dangerouslySetInnerHTML={{ __html: boldToSafeHtml(clean) }}
          />
        </div>
      )
    }
    return (
      <p
        key={i}
        className="mb-1 text-xs leading-relaxed text-slate-600"
        dangerouslySetInnerHTML={{ __html: boldToSafeHtml(trimmed) }}
      />
    )
  })
}

// ─── Piezas compartidas por los dos asesores ──────────────────────────────────

function Cargando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 py-6">
      <Loader2 size={18} className="animate-spin text-slate-400" />
      <p className="text-xs text-slate-500">{texto}</p>
    </div>
  )
}

function Fallo({ mensaje, onRetry }: { mensaje: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-[13px] font-semibold text-rose-800">No se pudo conectar con Claude</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-rose-700/80">{mensaje}</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

/**
 * Invitación a generar el análisis. Va en una fila —texto a la izquierda,
 * botón a la derecha— y no en una caja punteada centrada: ocupa un tercio del
 * alto y dice lo mismo.
 */
function Invitacion({
  titulo,
  descripcion,
  cta,
  disabled,
  onClick,
}: {
  titulo: string
  descripcion: string
  cta: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800">{titulo}</p>
        <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
      </div>
      <Button size="sm" icon={<Sparkles size={13} />} onClick={onClick} disabled={disabled}>
        {cta}
      </Button>
    </div>
  )
}

function Resultado({
  analysis,
  generatedAt,
  onRegenerar,
  disabled,
}: {
  analysis: string
  generatedAt: string | null
  onRegenerar: () => void
  disabled?: boolean
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <span className="num flex items-center gap-1.5 text-[10.5px] text-slate-400">
          <Clock size={10} />
          Generado {formatRelativeTime(generatedAt)}
        </span>
        <button
          type="button"
          onClick={onRegenerar}
          disabled={disabled}
          title="Genera un análisis nuevo (consume tokens de Anthropic)"
          className="flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-40"
        >
          <RefreshCw size={10} />
          Analizar de nuevo
        </button>
      </div>
      <div className="max-w-3xl">{renderAnalysis(analysis)}</div>
    </div>
  )
}

// ─── Asesor del ecosistema ────────────────────────────────────────────────────

function AsesorEcosistema() {
  const { analysis, generatedAt, save } = usePersistedAnalysis('master_ai_pos_advisor_v1')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function analizar() {
    setCargando(true)
    setError(null)
    try {
      const result = await aiApi.posAdvisor()
      save(result.analysis)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      setError(err?.response?.data?.detail || err?.message || 'Error desconocido')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <Rotulo>Cómo va el ecosistema</Rotulo>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {!analysis && !cargando && !error && (
          <Invitacion
            titulo="¿Qué está pasando hoy en la plataforma?"
            descripcion="Claude lee el GMV del mes, los negocios activos e inactivos, la cartera por cobrar y las transacciones, y devuelve un diagnóstico con las alertas ordenadas por impacto."
            cta="Analizar ecosistema"
            onClick={analizar}
          />
        )}
        {cargando && <Cargando texto="Leyendo las métricas del ecosistema…" />}
        {error && !cargando && <Fallo mensaje={error} onRetry={analizar} />}
        {analysis && !cargando && !error && (
          <Resultado analysis={analysis} generatedAt={generatedAt} onRegenerar={analizar} />
        )}
      </div>
    </div>
  )
}

// ─── Estrategia de marketing ──────────────────────────────────────────────────

function EstrategiaMarketing() {
  const { analysis, generatedAt, save } = usePersistedAnalysis('master_ai_marketing_v1')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch,
  } = useQuery({
    queryKey: ['master', 'analytics'],
    queryFn: () => masterApi.analytics(),
    staleTime: 60_000,
  })

  async function analizar() {
    if (!analytics) return
    setCargando(true)
    setError(null)
    try {
      const result = await aiApi.marketing(analytics as unknown as Record<string, unknown>)
      save(result.analysis)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      setError(err?.response?.data?.detail || err?.message || 'Error desconocido')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <Rotulo>Qué hacer para crecer</Rotulo>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {analyticsError && !analyticsLoading && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-[13px] font-semibold text-rose-800">
              No se pudieron cargar las métricas
            </p>
            <p className="mt-1 text-xs text-rose-700/80">
              La estrategia se arma sobre los datos de Analítica; sin ellos no hay nada que leer.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
              Reintentar carga de datos
            </Button>
          </div>
        )}

        {!analyticsError && !analysis && !cargando && !error && (
          <Invitacion
            titulo="Precios, retención y captación"
            descripcion="Claude cruza las métricas de todos los negocios y propone un plan concreto: qué plan mover, a quién retener y por dónde entra el siguiente cliente."
            cta={analyticsLoading ? 'Cargando datos…' : 'Generar estrategia'}
            disabled={analyticsLoading || !analytics}
            onClick={analizar}
          />
        )}
        {cargando && <Cargando texto="Armando la estrategia…" />}
        {error && !cargando && <Fallo mensaje={error} onRetry={analizar} />}
        {analysis && !cargando && !error && (
          <Resultado
            analysis={analysis}
            generatedAt={generatedAt}
            onRegenerar={analizar}
            disabled={!analytics}
          />
        )}
      </div>
    </div>
  )
}

// ─── Nota al pie ──────────────────────────────────────────────────────────────

const NOTAS: { titulo: string; items: string[] }[] = [
  {
    titulo: 'Con qué datos trabaja',
    items: [
      'GMV del mes y tendencia contra el anterior',
      'Negocios activos, inactivos y riesgo de fuga',
      'Cartera por cobrar de toda la red',
      'Uso real: DAU, WAU y MAU por negocio',
      'Ciudades donde está concentrada la base',
      'Auditoría y patrones de actividad',
    ],
  },
  {
    titulo: 'Cuándo vale la pena',
    items: [
      'Al cierre de mes, para el diagnóstico',
      'Antes de una reunión de socios o inversión',
      'Cuando el GMV se sale de lo normal',
      'Al planear una campaña de retención',
      'Ecosistema: una vez por semana basta',
      'Marketing: una vez al mes',
    ],
  },
  {
    titulo: 'Qué devuelve',
    items: [
      'Diagnóstico en lenguaje de negocio',
      'Alertas ordenadas por impacto',
      'Acciones concretas, no principios',
      'Oportunidades de crecimiento',
      'Recomendaciones de precio y plan',
      'Plan de retención para quien se va a ir',
    ],
  },
]

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MasterAIPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        subtitle="Lectura asistida del ecosistema — Claude sobre los datos de la plataforma"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <AsesorEcosistema />
        <EstrategiaMarketing />
      </div>

      <div>
        <Rotulo>Antes de gastar un análisis</Rotulo>
        <div className="grid gap-x-10 gap-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          {NOTAS.map((n) => (
            <div key={n.titulo}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {n.titulo}
              </p>
              <ul className="space-y-1.5">
                {n.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ChevronRight size={11} className="mt-0.5 shrink-0 text-slate-300" />
                    <span className="text-xs leading-relaxed text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="border-t border-slate-100 pt-4 text-[10.5px] text-slate-400">
        Cada análisis consume tokens de Anthropic. El resultado queda guardado en este navegador
        hasta que pidas uno nuevo.
      </p>
    </div>
  )
}
