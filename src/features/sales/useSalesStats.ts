/**
 * useSalesStats — lógica de cálculo extraída de SalesPage.
 * Separa el "qué" (cálculos) del "cómo se muestra" (render).
 */
import { useMemo } from 'react'
import type { Venta, Producto, Cuenta } from '@/shared/types'

export interface SalesStats {
  totalVentas: number
  totalGanancia: number
  totalUnidades: number
  count: number
  margen: number
}

export interface ChartDayData {
  dia: string
  ventas: number
  ganancia: number
}

export interface TopProducto {
  nombre: string
  total: number
  unidades: number
}

export function useSalesStats(
  ventas: Venta[],
  products: Producto[],
  cuentas: Cuenta[],
  search: string,
) {
  const productoNombre = (id: number) =>
    products.find((p) => p.id === id)?.nombre ?? `#${id}`

  const cuentaNombre = (id: number) =>
    cuentas.find((c) => c.id === id)?.nombre ?? `Cuenta #${id}`

  const vendedorNombre = (v: { nombre_cajero?: string | null; vendido_por?: number | null }) =>
    v.nombre_cajero ?? (v.vendido_por ? `Cajero #${v.vendido_por}` : '—')

  const stats: SalesStats = useMemo(() => {
    const totalVentas   = ventas.reduce((s, v) => s + v.precio_venta, 0)
    const totalGanancia = ventas.reduce((s, v) => s + v.ganancia, 0)
    const totalUnidades = ventas.reduce((s, v) => s + v.cantidad_unidades, 0)
    const margen        = totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0
    return { totalVentas, totalGanancia, totalUnidades, count: ventas.length, margen }
  }, [ventas])

  const chartData: ChartDayData[] = useMemo(() => {
    const byDay = new Map<string, { ventas: number; ganancia: number }>()
    for (const v of ventas) {
      const dia = v.fecha_venta?.slice(0, 10) ?? ''
      if (!dia) continue
      const prev = byDay.get(dia) ?? { ventas: 0, ganancia: 0 }
      byDay.set(dia, { ventas: prev.ventas + v.precio_venta, ganancia: prev.ganancia + v.ganancia })
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, vals]) => ({
        dia: new Date(dia + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
        ventas: vals.ventas,
        ganancia: vals.ganancia,
      }))
  }, [ventas])

  const topProductos: TopProducto[] = useMemo(() => {
    const map = new Map<number, TopProducto>()
    for (const v of ventas) {
      const prev = map.get(v.producto_id) ?? { nombre: productoNombre(v.producto_id), total: 0, unidades: 0 }
      map.set(v.producto_id, { nombre: prev.nombre, total: prev.total + v.precio_venta, unidades: prev.unidades + v.cantidad_unidades })
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [ventas, products]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered: Venta[] = useMemo(() => {
    if (!search) return ventas
    const q = search.toLowerCase()
    return ventas.filter((v) =>
      productoNombre(v.producto_id).toLowerCase().includes(q) ||
      cuentaNombre(v.cuenta_id).toLowerCase().includes(q) ||
      (v.nombre_cajero?.toLowerCase().includes(q) ?? false)
    )
  }, [ventas, search, products, cuentas]) // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, chartData, topProductos, filtered, productoNombre, cuentaNombre, vendedorNombre }
}
