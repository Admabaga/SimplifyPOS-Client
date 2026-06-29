import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  brandFromName,
  BrandLogo,
  BrandMark,
  AcceptedBrands,
  detectBrand,
  type CardBrand,
} from '@/features/subscription/cardBrands'

describe('brandFromName', () => {
  it.each([
    ['VISA', 'visa'],
    ['Mastercard débito', 'mastercard'],
    ['American Express', 'amex'],
    ['AMEX', 'amex'],
    ['Diners Club', 'diners'],
    ['Discover', 'discover'],
    ['Nequi', 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
  ])('mapea %s → %s', (input, expected) => {
    expect(brandFromName(input as string | null)).toBe(expected)
  })
})

describe('detectBrand edge cases', () => {
  it('mastercard rango 2-series', () => {
    expect(detectBrand('2221000000000000')).toBe('mastercard')
  })
  it('diners y discover', () => {
    expect(detectBrand('30000000000000')).toBe('diners')
    expect(detectBrand('6011000000000000')).toBe('discover')
  })
})

const ALL_BRANDS: CardBrand[] = ['visa', 'mastercard', 'amex', 'diners', 'discover', 'unknown']

describe('BrandLogo', () => {
  it.each(ALL_BRANDS)('renderiza el logo de %s sin crashear', (brand) => {
    const { container } = render(<BrandLogo brand={brand} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

describe('BrandMark', () => {
  it.each(ALL_BRANDS)('renderiza la marca plana de %s sin crashear', (brand) => {
    const { container } = render(<BrandMark brand={brand} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

describe('AcceptedBrands', () => {
  it('renderiza la fila de marcas aceptadas', () => {
    const { container } = render(<AcceptedBrands active="visa" />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
  it('sin marca activa también renderiza', () => {
    const { container } = render(<AcceptedBrands />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})
