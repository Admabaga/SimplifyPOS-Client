import { describe, it, expect } from 'vitest'
import { formatTime, formatRelative, MONTHS_ES, formatDate } from '@/shared/lib/formatters'
import { formatCOP } from '@/features/subscription/types'

describe('formatters — gaps', () => {
  it('formatTime devuelve hora con minutos', () => {
    const out = formatTime('2026-05-14T20:30:00')
    expect(out).toMatch(/\d{1,2}:\d{2}/)
  })

  it('MONTHS_ES tiene los 12 meses en español', () => {
    expect(MONTHS_ES).toHaveLength(12)
    expect(MONTHS_ES[0]).toBe('Enero')
    expect(MONTHS_ES[11]).toBe('Diciembre')
  })

  it('formatRelative: reciente → "hace un momento"', () => {
    expect(formatRelative(new Date().toISOString())).toBe('hace un momento')
  })

  it('formatRelative: minutos y horas', () => {
    const min5 = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatRelative(min5)).toMatch(/hace 5 min/)
    const h3 = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(formatRelative(h3)).toMatch(/hace 3h/)
  })

  it('formatRelative: >24h cae a fecha dd/mm/yyyy', () => {
    const old = new Date(Date.now() - 3 * 86_400_000).toISOString()
    expect(formatRelative(old)).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('formatDate parsea ISO sin Z como UTC', () => {
    expect(formatDate('2026-01-15T00:00:00')).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})

describe('formatCOP (subscription)', () => {
  it('formatea pesos sin decimales', () => {
    const out = formatCOP(99900)
    expect(out).toContain('99.900')
  })
})
