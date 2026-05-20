const BOG = 'America/Bogota'

/**
 * Parsea string ISO del backend como UTC si no trae offset explícito.
 * El backend devuelve datetimes sin 'Z' (ej: "2026-05-14T04:00:00") pero
 * están en UTC → agregamos Z para que JS los interprete correctamente.
 */
function toUTC(iso: string): Date {
  if (iso.length > 10 && !iso.includes('+') && !iso.endsWith('Z')) {
    return new Date(iso + 'Z')
  }
  return new Date(iso)
}

/** Formatea número a moneda colombiana (COP). */
export function formatCOP(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num)
}

/** Formatea fecha ISO a dd/mm/yyyy — hora Bogotá. */
export function formatDate(iso: string): string {
  return toUTC(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BOG,
  })
}

/** Formatea ISO a "14 de may. 11:00 p. m." — hora Bogotá. */
export function formatDateTime(iso: string): string {
  return toUTC(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BOG,
  })
}

/** Formatea ISO a solo hora "11:00 p. m." — hora Bogotá. */
export function formatTime(iso: string): string {
  return toUTC(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BOG,
  })
}

/** Formatea fecha ISO a "hace X tiempo" — hora Bogotá. */
export function formatRelative(iso: string): string {
  const diff = Date.now() - toUTC(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return formatDate(iso)
}

/** Nombre del mes en español. */
export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
