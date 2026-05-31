/**
 * useQuickSale — orquestación de la venta rápida (estado + carrito + pago).
 *
 * SRP: encapsula TODA la lógica de la venta rápida (búsqueda, carrito, totales,
 * confirmación). La presentación (modal o inline) solo consume este hook, así
 * no duplicamos la lógica entre las dos vistas. DIP: recibe `onDone` por inyección.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'
import { apiError } from '@/shared/lib/apiError'
import { cuentasApi } from './api'
import { productsApi } from '@/features/products/api'
import { apiClient } from '@/shared/api/client'
import type { Producto, ProductoPrecio, MedioPago } from '@/shared/types'

export interface CartItem {
  producto: Producto
  precio: ProductoPrecio
  cantidad: number
}

export type QuickSaleStep = 'cart' | 'payment'

export function useQuickSale(onDone: () => void) {
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<QuickSaleStep>('cart')
  const [selectedMedio, setSelectedMedio] = useState<MedioPago | null>(null)
  const montoInput = useCurrencyInput(0)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const reset = useCallback(() => {
    setCart([])
    setSearch('')
    setStep('cart')
    setSelectedMedio(null)
    montoInput.setFromNumber(0)
  }, [montoInput])

  const { data: productos = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.getAll(),
    staleTime: 30_000,
  })

  const { data: medios = [] } = useQuery<MedioPago[]>({
    queryKey: ['payment-methods'],
    queryFn: () => apiClient.get<MedioPago[]>('/payment-methods').then((r) => r.data),
    staleTime: 60_000,
  })

  const activeProducts = useMemo(
    () => productos.filter((p) => p.activo && p.stock_total > 0),
    [productos],
  )
  const fuse = useMemo(
    () => new Fuse(activeProducts, { keys: ['nombre', 'codigo', 'codigo_interno'], threshold: 0.35 }),
    [activeProducts],
  )
  const results = useMemo(
    () =>
      search.trim().length > 0
        ? fuse.search(search).slice(0, 8).map((r) => r.item)
        : activeProducts.slice(0, 8),
    [search, fuse, activeProducts],
  )

  const addToCart = useCallback((producto: Producto, precio: ProductoPrecio) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.producto.id === producto.id && i.precio.id === precio.id)
      if (idx >= 0) {
        const item = prev[idx]!
        const newItem: CartItem = { ...item, cantidad: Math.min(item.cantidad + 1, producto.stock_total) }
        return prev.map((it, i) => (i === idx ? newItem : it))
      }
      return [...prev, { producto, precio, cantidad: 1 }]
    })
    setSearch('')
    searchRef.current?.focus()
  }, [])

  const updateQty = useCallback((idx: number, delta: number) => {
    setCart((prev) => {
      const item = prev[idx]
      if (!item) return prev
      const newQty = item.cantidad + delta
      if (newQty <= 0) return prev.filter((_, i) => i !== idx)
      const newItem: CartItem = { ...item, cantidad: Math.min(newQty, item.producto.stock_total) }
      return prev.map((it, i) => (i === idx ? newItem : it))
    })
  }, [])

  const setQty = useCallback((idx: number, qty: number) => {
    setCart((prev) => {
      const item = prev[idx]
      if (!item) return prev
      if (qty <= 0) return prev.filter((_, i) => i !== idx)
      const newItem: CartItem = { ...item, cantidad: Math.min(qty, item.producto.stock_total) }
      return prev.map((it, i) => (i === idx ? newItem : it))
    })
  }, [])

  const removeItem = useCallback((idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const total = useMemo(() => cart.reduce((s, i) => s + i.precio.precio * i.cantidad, 0), [cart])
  const montoFinal = montoInput.numericValue() > 0 ? montoInput.numericValue() : total

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMedio) throw new Error('Selecciona un medio de pago')
      if (cart.length === 0) throw new Error('Agrega al menos un producto')

      const now = new Date()
      const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const cuenta = await cuentasApi.create({ nombre: `Venta rápida ${label}` })

      for (const item of cart) {
        await cuentasApi.addVenta(cuenta.id, {
          producto_id: item.producto.id,
          producto_precio_id: item.precio.id,
          cantidad: item.cantidad,
        })
      }
      await cuentasApi.addPago(cuenta.id, {
        medio_pago_id: selectedMedio.id,
        sub_total: total,           // monto a pagar (no el efectivo recibido)
        descripcion: 'Venta rápida',
      })
      return cuenta
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['products-all'] })
      toast.success('Venta registrada')
      reset()
      onDone()
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al registrar venta')),
  })

  return {
    // estado
    cart, search, step, selectedMedio, montoInput, searchRef, results, medios, total, montoFinal,
    // setters / acciones
    setSearch, setStep, setSelectedMedio, addToCart, updateQty, setQty, removeItem, reset,
    confirm: () => confirmMutation.mutate(),
    confirming: confirmMutation.isPending,
  }
}
