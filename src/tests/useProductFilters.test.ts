import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProductFilters } from '@/features/products/useProductFilters'
import type { Producto } from '@/shared/types'

const makeProducto = (overrides: Partial<Producto> = {}): Producto => ({
  id: 1,
  nombre: 'Producto Test',
  activo: true,
  stock_total: 10,
  categoria_id: 1,
  codigo: null,
  descripcion: null,
  precios: [],
  ...overrides,
})

const productos: Producto[] = [
  makeProducto({ id: 1, nombre: 'Coca Cola 355ml', stock_total: 20, categoria_id: 1 }),
  makeProducto({ id: 2, nombre: 'Agua Cristal 500ml', stock_total: 0, categoria_id: 1 }),
  makeProducto({ id: 3, nombre: 'Detergente Ariel', stock_total: 3, categoria_id: 2 }),
  makeProducto({ id: 4, nombre: 'Azúcar 1kg', stock_total: 15, categoria_id: 2 }),
  makeProducto({ id: 5, nombre: 'Arroz 500g', activo: false, stock_total: 50, categoria_id: 2 }),
]

describe('useProductFilters — stats', () => {
  it('cuenta total, activos, sinStock, stockBajo, totalStock correctamente', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 'todas', 'todos'))
    const { stats } = result.current
    expect(stats.total).toBe(5)
    expect(stats.activos).toBe(4)           // id 5 está inactivo
    expect(stats.sinStock).toBe(1)          // id 2 stock 0
    expect(stats.stockBajo).toBe(1)         // id 3 stock 3 (≤5)
    expect(stats.totalStock).toBe(20 + 0 + 3 + 15) // excluye inactivo
  })
})

describe('useProductFilters — filtrado por búsqueda', () => {
  it('filtra por nombre parcial case-insensitive', () => {
    const { result } = renderHook(() => useProductFilters(productos, 'coca', 'todas', 'todos'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].nombre).toBe('Coca Cola 355ml')
  })

  it('sin búsqueda devuelve todos', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 'todas', 'todos'))
    expect(result.current.filtered).toHaveLength(5)
  })

  it('búsqueda sin resultados devuelve array vacío', () => {
    const { result } = renderHook(() => useProductFilters(productos, 'xyz123', 'todas', 'todos'))
    expect(result.current.filtered).toHaveLength(0)
  })
})

describe('useProductFilters — filtrado por categoría', () => {
  it('filtra por categoria_id', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 2, 'todos'))
    expect(result.current.filtered).toHaveLength(3)
    expect(result.current.filtered.every((p) => p.categoria_id === 2)).toBe(true)
  })

  it('todas devuelve sin filtro de categoría', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 'todas', 'todos'))
    expect(result.current.filtered).toHaveLength(5)
  })
})

describe('useProductFilters — filtrado por stock', () => {
  it('con-stock excluye productos sin stock', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 'todas', 'con-stock'))
    expect(result.current.filtered.every((p) => (p.stock_total ?? 0) > 0)).toBe(true)
  })

  it('sin-stock devuelve solo productos con stock 0', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 'todas', 'sin-stock'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].stock_total).toBe(0)
  })

  it('bajo-stock devuelve productos con 1-5 unidades', () => {
    const { result } = renderHook(() => useProductFilters(productos, '', 'todas', 'bajo-stock'))
    expect(result.current.filtered).toHaveLength(1)
    expect(result.current.filtered[0].stock_total).toBe(3)
  })
})
