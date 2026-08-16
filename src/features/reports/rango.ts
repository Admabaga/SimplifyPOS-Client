/**
 * Rangos de fecha del dashboard.
 *
 * Lógica pura y sin React a propósito: es la que decide qué le pide el
 * dashboard a `/reports/range`, así que conviene poder testearla sola.
 * Cada rango define además su período de comparación — del mismo largo e
 * inmediatamente anterior — para que la tendencia sea honesta (7 días se
 * comparan contra los 7 previos, no contra un mes).
 */

export type RangoKey = 'hoy' | 'ayer' | '7d' | '30d' | 'mes' | 'mesPasado'

export const RANGOS: { key: RangoKey; label: string }[] = [
  { key: 'hoy',       label: 'Hoy' },
  { key: 'ayer',      label: 'Ayer' },
  { key: '7d',        label: '7 días' },
  { key: '30d',       label: '30 días' },
  { key: 'mes',       label: 'Este mes' },
  { key: 'mesPasado', label: 'Mes pasado' },
]

export interface Rango {
  desde: string
  hasta: string
  etiqueta: string
  vsEtiqueta: string
}

/** YYYY-MM-DD en hora local (no UTC: `toISOString` corre el día en Colombia). */
function ymd(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function diasAtras(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export function resolverRango(key: RangoKey): Rango {
  const hoy = new Date()
  switch (key) {
    case 'hoy':
      return { desde: ymd(hoy), hasta: ymd(hoy), etiqueta: 'hoy', vsEtiqueta: 'vs ayer' }
    case 'ayer': {
      const a = diasAtras(1)
      return { desde: ymd(a), hasta: ymd(a), etiqueta: 'ayer', vsEtiqueta: 'vs anteayer' }
    }
    case '7d':
      return { desde: ymd(diasAtras(6)), hasta: ymd(hoy), etiqueta: 'últimos 7 días', vsEtiqueta: 'vs 7 previos' }
    case '30d':
      return { desde: ymd(diasAtras(29)), hasta: ymd(hoy), etiqueta: 'últimos 30 días', vsEtiqueta: 'vs 30 previos' }
    case 'mes': {
      const first = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: ymd(first), hasta: ymd(hoy), etiqueta: 'este mes', vsEtiqueta: 'vs mes pasado' }
    }
    case 'mesPasado': {
      const first = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const last  = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return { desde: ymd(first), hasta: ymd(last), etiqueta: 'mes pasado', vsEtiqueta: 'vs mes previo' }
    }
  }
}

/** Período inmediatamente anterior, del mismo número de días. */
export function rangoPrevio(r: Rango): { desde: string; hasta: string } {
  const d0 = new Date(r.desde + 'T00:00:00')
  const d1 = new Date(r.hasta + 'T00:00:00')
  const dias = Math.round((d1.getTime() - d0.getTime()) / 86400000) + 1
  const hasta = new Date(d0); hasta.setDate(d0.getDate() - 1)
  const desde = new Date(hasta); desde.setDate(hasta.getDate() - (dias - 1))
  return { desde: ymd(desde), hasta: ymd(hasta) }
}
