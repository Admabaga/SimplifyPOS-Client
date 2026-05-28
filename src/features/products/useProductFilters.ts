/**
 * useProductFilters — lógica de stats y filtrado extraída de ProductsPage.
 * Separa el "qué" (cálculos) del "cómo se muestra" (render).
 */
import { useMemo } from 'react'
import type { Producto } from '@/shared/types'

type StockFilter = 'todos' | 'con-stock' | 'sin-stock' | 'bajo-stock'

export interface ProductStats {
  total: number
  activos: number
  sinStock: number
  stockBajo: number
  totalStock: number
}

export function useProductFilters(
  products: Producto[],
  search: string,
  catFilter: number | 'todas',
  stockFilter: StockFilter,
) {
  const stats: ProductStats = useMemo(() => {
    const activos   = products.filter((p) => p.activo)
    const sinStock  = activos.filter((p) => (p.stock_total ?? 0) === 0)
    const stockBajo = activos.filter((p) => (p.stock_total ?? 0) > 0 && (p.stock_total ?? 0) <= 5)
    const totalStock = activos.reduce((s, p) => s + (p.stock_total ?? 0), 0)
    return {
      total: products.length,
      activos: activos.length,
      sinStock: sinStock.length,
      stockBajo: stockBajo.length,
      totalStock,
    }
  }, [products])

  const filtered: Producto[] = useMemo(() => {
    return products.filter((p) => {
      const stock = p.stock_total ?? 0
      if (!p.nombre.toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter !== 'todas' && p.categoria_id !== catFilter)    return false
      if (stockFilter === 'con-stock'  && stock === 0)   return false
      if (stockFilter === 'sin-stock'  && stock > 0)    return false
      if (stockFilter === 'bajo-stock' && (stock === 0 || stock > 5)) return false
      return true
    })
  }, [products, search, catFilter, stockFilter])

  return { stats, filtered }
}
