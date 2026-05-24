/**
 * usePersistedAnalysis — hook para cachear análisis de IA en localStorage.
 *
 * Razón: el dueño no quiere quemar tokens de Anthropic cada vez que entra a la
 * página. Una vez generado, el análisis se queda hasta que pulse "Nuevo análisis"
 * explícitamente. Sobrevive a recargas, cierres de pestaña y nuevos logins.
 */

import { useEffect, useState } from 'react'

interface StoredAnalysis {
  analysis: string
  generated_at: string // ISO timestamp
}

export function usePersistedAnalysis(storageKey: string) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  // Cargar de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAnalysis
        setAnalysis(parsed.analysis)
        setGeneratedAt(parsed.generated_at)
      }
    } catch {
      // Si el storage está corrupto, lo limpiamos
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  function save(newAnalysis: string) {
    const now = new Date().toISOString()
    const payload: StoredAnalysis = { analysis: newAnalysis, generated_at: now }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
      // Quota exceeded o storage deshabilitado — fallback silencioso
    }
    setAnalysis(newAnalysis)
    setGeneratedAt(now)
  }

  function clear() {
    localStorage.removeItem(storageKey)
    setAnalysis(null)
    setGeneratedAt(null)
  }

  return { analysis, generatedAt, save, clear }
}

/** Formatea el timestamp como "hace 2 horas" / "hace 3 días". */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'hace unos segundos'
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 604800) return `hace ${Math.floor(diffSec / 86400)} d`

  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
