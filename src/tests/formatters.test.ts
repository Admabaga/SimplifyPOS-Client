import { describe, it, expect } from 'vitest'
import { formatCOP, formatDate, formatDateTime, formatRelative } from '@/shared/lib/formatters'

describe('formatCOP', () => {
  it('formatea número a pesos colombianos', () => {
    expect(formatCOP(1500000)).toMatch(/1[.,]500[.,]000/)
  })

  it('formatea 0 correctamente', () => {
    expect(formatCOP(0)).toMatch(/0/)
  })

  it('acepta string numérico', () => {
    expect(formatCOP('48500')).toMatch(/48[.,]500/)
  })
})

describe('formatDate', () => {
  it('parsea ISO sin offset como UTC y muestra en formato dd/mm/yyyy', () => {
    // "2026-01-15T12:00:00" → UTC → en Bogotá (-5h) = 07:00 → mismo día
    const result = formatDate('2026-01-15T12:00:00')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/2026/)
  })

  it('parsea ISO con Z explícita', () => {
    const result = formatDate('2026-06-01T00:00:00Z')
    // En Bogotá (-5h) → 2026-05-31 → día 31
    expect(result).toMatch(/31/)
  })
})

describe('formatRelative', () => {
  it('muestra "hace un momento" para tiempos menores a 1 min', () => {
    const iso = new Date(Date.now() - 30_000).toISOString()
    expect(formatRelative(iso)).toBe('hace un momento')
  })

  it('muestra minutos para tiempos menores a 60 min', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatRelative(iso)).toBe('hace 5 min')
  })

  it('muestra horas para tiempos entre 1h y 24h', () => {
    const iso = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(formatRelative(iso)).toBe('hace 3h')
  })
})
