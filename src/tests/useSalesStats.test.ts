import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSalesStats } from '@/features/sales/useSalesStats'
import type { Venta, Producto, Cuenta } from '@/shared/types'

const makeVenta = (overrides: Partial<Venta> = {}): Venta => ({
  id: 1,
  producto_id: 1,
  producto_precio_id: 1,
  cuenta_id: 1,
  precio_venta: 10000,
  precio_unitario: 5000,
  ganancia: 2000,
  cantidad_unidades: 2,
  fecha_venta: '2026-05-15T10:00:00',
  nombre_cajero: 'Ana',
  vendido_por: null,
  sesion_caja_id: null,
  ...overrides,
})

const productos: Producto[] = [
  { id: 1, nombre: 'Coca Cola', activo: true, stock_total: 10, categoria_id: 1, codigo: null, descripcion: null, precio_ponderado: '0', created_at: '2026-01-01T00:00:00', precios: [] },
  { id: 2, nombre: 'Agua Cristal', activo: true, stock_total: 5, categoria_id: 1, codigo: null, descripcion: null, precio_ponderado: '0', created_at: '2026-01-01T00:00:00', precios: [] },
]

const cuentas: Cuenta[] = [
  {
    id: 1, nombre: 'Tienda La Esquina', esta_pagada: false, total: 0,
    valor_pendiente: 0, fecha_creacion: '2026-01-01T00:00:00',
    ventas: [], pagos: [],
    cliente_tipo_doc: null, cliente_documento: null, cliente_nombre_fiscal: null,
    cliente_direccion: null, cliente_telefono: null, cliente_email: null,
  },
]

const ventas: Venta[] = [
  makeVenta({ id: 1, producto_id: 1, precio_venta: 20000, ganancia: 5000, cantidad_unidades: 2, fecha_venta: '2026-05-15T10:00:00' }),
  makeVenta({ id: 2, producto_id: 2, precio_venta: 15000, ganancia: 3000, cantidad_unidades: 3, fecha_venta: '2026-05-15T14:00:00' }),
  makeVenta({ id: 3, producto_id: 1, precio_venta: 10000, ganancia: 2000, cantidad_unidades: 1, fecha_venta: '2026-05-16T09:00:00' }),
]

describe('useSalesStats — stats', () => {
  it('calcula totales correctamente', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    const { stats } = result.current
    expect(stats.totalVentas).toBe(45000)
    expect(stats.totalGanancia).toBe(10000)
    expect(stats.totalUnidades).toBe(6)
    expect(stats.count).toBe(3)
  })

  it('margen es porcentaje de ganancia/ventas', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    // 10000 / 45000 * 100 ≈ 22.22
    expect(result.current.stats.margen).toBeCloseTo(22.22, 1)
  })

  it('margen es 0 si no hay ventas', () => {
    const { result } = renderHook(() => useSalesStats([], productos, cuentas, ''))
    expect(result.current.stats.margen).toBe(0)
    expect(result.current.stats.count).toBe(0)
  })
})

describe('useSalesStats — chartData', () => {
  it('agrupa ventas por día', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    expect(result.current.chartData).toHaveLength(2) // 2 días distintos
  })

  it('suma ventas y ganancia del mismo día', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    const dia1 = result.current.chartData[0]!
    expect(dia1.ventas).toBe(35000) // 20000 + 15000
    expect(dia1.ganancia).toBe(8000) // 5000 + 3000
  })
})

describe('useSalesStats — topProductos', () => {
  it('ordena por total ventas descendente', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    const top = result.current.topProductos
    expect(top[0]!.nombre).toBe('Coca Cola') // 20000+10000=30000
    expect(top[1]!.nombre).toBe('Agua Cristal') // 15000
  })

  it('agrega unidades de mismo producto', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    expect(result.current.topProductos[0]!.unidades).toBe(3) // 2+1
  })
})

describe('useSalesStats — filtered', () => {
  it('sin búsqueda devuelve todas las ventas', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    expect(result.current.filtered).toHaveLength(3)
  })

  it('filtra por nombre de producto', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, 'coca'))
    expect(result.current.filtered).toHaveLength(2) // ventas 1 y 3
  })

  it('filtra por nombre de cuenta', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, 'esquina'))
    expect(result.current.filtered).toHaveLength(3) // todas son de cuenta 1
  })

  it('filtra por nombre de cajero', () => {
    const ventasConCajeros = [
      makeVenta({ id: 1, nombre_cajero: 'Pedro' }),
      makeVenta({ id: 2, nombre_cajero: 'Ana' }),
    ]
    const { result } = renderHook(() => useSalesStats(ventasConCajeros, productos, cuentas, 'pedro'))
    expect(result.current.filtered).toHaveLength(1)
  })
})

describe('useSalesStats — helpers', () => {
  it('productoNombre resuelve id a nombre', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    expect(result.current.productoNombre(1)).toBe('Coca Cola')
    expect(result.current.productoNombre(99)).toBe('#99')
  })

  it('vendedorNombre prioriza nombre_cajero sobre vendido_por', () => {
    const { result } = renderHook(() => useSalesStats(ventas, productos, cuentas, ''))
    expect(result.current.vendedorNombre({ nombre_cajero: 'Ana', vendido_por: 5 })).toBe('Ana')
    expect(result.current.vendedorNombre({ nombre_cajero: null, vendido_por: 5 })).toBe('Cajero #5')
    expect(result.current.vendedorNombre({ nombre_cajero: null, vendido_por: null })).toBe('—')
  })
})
