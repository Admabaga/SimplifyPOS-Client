import { describe, it, expect } from 'vitest'
import { detectBrand, formatCardNumber, luhnValid, brandSpec } from '@/features/subscription/cardBrands'

describe('cardBrands — detección de marca', () => {
  it('detecta Visa (empieza por 4)', () => {
    expect(detectBrand('4242 4242 4242')).toBe('visa')
  })
  it('detecta Mastercard (51-55 y rango 2221-2720)', () => {
    expect(detectBrand('5412')).toBe('mastercard')
    expect(detectBrand('2221')).toBe('mastercard')
  })
  it('detecta Amex (34/37) con 15 dígitos y CVC 4', () => {
    expect(detectBrand('3782')).toBe('amex')
    expect(brandSpec('amex')).toMatchObject({ maxDigits: 15, cvcDigits: 4 })
  })
  it('marca desconocida si no coincide', () => {
    expect(detectBrand('9999')).toBe('unknown')
  })
})

describe('cardBrands — formato y Luhn', () => {
  it('agrupa Visa 4-4-4-4', () => {
    expect(formatCardNumber('4242424242424242', 'visa')).toBe('4242 4242 4242 4242')
  })
  it('agrupa Amex 4-6-5', () => {
    expect(formatCardNumber('378282246310005', 'amex')).toBe('3782 822463 10005')
  })
  it('valida Luhn correcto y rechaza incorrecto', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true)
    expect(luhnValid('4242 4242 4242 4241')).toBe(false)
  })
})
