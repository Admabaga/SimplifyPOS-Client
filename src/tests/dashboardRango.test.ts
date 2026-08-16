import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolverRango, rangoPrevio } from '@/features/reports/rango'

// Fecha fija: 15 de agosto de 2026 (sábado)
const HOY = new Date('2026-08-15T12:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(HOY)
})
afterEach(() => vi.useRealTimers())

describe('resolverRango', () => {
  it('hoy es un solo día', () => {
    const r = resolverRango('hoy')
    expect(r.desde).toBe('2026-08-15')
    expect(r.hasta).toBe('2026-08-15')
  })

  it('ayer es el día anterior, no incluye hoy', () => {
    const r = resolverRango('ayer')
    expect(r.desde).toBe('2026-08-14')
    expect(r.hasta).toBe('2026-08-14')
  })

  it('7 días incluye hoy y los 6 previos', () => {
    const r = resolverRango('7d')
    expect(r.desde).toBe('2026-08-09')
    expect(r.hasta).toBe('2026-08-15')
  })

  it('30 días incluye hoy y los 29 previos', () => {
    const r = resolverRango('30d')
    expect(r.desde).toBe('2026-07-17')
    expect(r.hasta).toBe('2026-08-15')
  })

  it('este mes va del día 1 a hoy', () => {
    const r = resolverRango('mes')
    expect(r.desde).toBe('2026-08-01')
    expect(r.hasta).toBe('2026-08-15')
  })

  it('mes pasado toma el mes completo', () => {
    const r = resolverRango('mesPasado')
    expect(r.desde).toBe('2026-07-01')
    expect(r.hasta).toBe('2026-07-31')
  })
})

describe('rangoPrevio', () => {
  it('compara contra un período del mismo largo, sin solaparse', () => {
    const prev = rangoPrevio(resolverRango('7d'))
    // 7 días previos, terminando justo antes del rango actual
    expect(prev.hasta).toBe('2026-08-08')
    expect(prev.desde).toBe('2026-08-02')
  })

  it('para un solo día compara contra el día anterior', () => {
    const prev = rangoPrevio(resolverRango('hoy'))
    expect(prev.desde).toBe('2026-08-14')
    expect(prev.hasta).toBe('2026-08-14')
  })

  it('para mes pasado compara contra el mes previo completo', () => {
    const prev = rangoPrevio(resolverRango('mesPasado'))
    // julio tiene 31 días → los 31 anteriores al 1 de julio
    expect(prev.hasta).toBe('2026-06-30')
    expect(prev.desde).toBe('2026-05-31')
  })
})
