/**
 * Panel de asesor IA reutilizable.
 * Muestra un botón para llamar a Claude Haiku y renderiza el análisis en markdown simple.
 */
import { useState } from 'react'
import { Bot, ChevronRight, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from './ui'
import { boldToSafeHtml } from '@/shared/lib/safeMarkdown'

interface Props {
  /** Título del panel */
  title: string
  /** Subtítulo explicativo */
  subtitle: string
  /** Texto del botón de acción */
  cta?: string
  /** Función que llama a la API y retorna el análisis */
  onAnalyze: () => Promise<{ analysis: string }>
  /** Color del gradiente del ícono (clases Tailwind) */
  iconGradient?: string
}

function renderAnalysis(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={i} className="h-2" />
    if (trimmed.startsWith('##') || trimmed.startsWith('**') && trimmed.endsWith('**')) {
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
            key={i}
            className="text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: boldToSafeHtml(clean) }}
          />
        </div>
      )
    }
    // inline bold
    return (
      <p
        key={i}
        className="text-xs leading-relaxed mb-1"
        dangerouslySetInnerHTML={{ __html: boldToSafeHtml(trimmed) }}
      />
    )
  })
}

export function AIAdvisorPanel({
  title,
  subtitle,
  cta = 'Analizar con Claude AI',
  onAnalyze,
  iconGradient = 'from-violet-500 to-indigo-600',
}: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    try {
      const result = await onAnalyze()
      setAnalysis(result.analysis)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center shadow-md shrink-0`}
        >
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {analysis && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
            title="Nuevo análisis"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Empty state */}
      {!analysis && !loading && !error && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <Sparkles size={32} className="mx-auto text-violet-400 mb-3" />
          <p className="text-sm text-slate-600 font-medium mb-1">{title}</p>
          <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">{subtitle}</p>
          <Button variant="primary" icon={<Sparkles size={14} />} onClick={handleAnalyze}>
            {cta}
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={28} className="animate-spin text-violet-500" />
          <p className="text-sm text-slate-500">Claude está pensando…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">No se pudo conectar con Claude</p>
          <p className="text-xs text-red-500 mb-3">
            Asegúrate de tener ANTHROPIC_API_KEY configurada en el servidor.
          </p>
          <Button size="sm" variant="secondary" onClick={handleAnalyze}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Analysis */}
      {analysis && !loading && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-5">
          <div className="prose prose-sm max-w-none">{renderAnalysis(analysis)}</div>
        </div>
      )}
    </div>
  )
}
