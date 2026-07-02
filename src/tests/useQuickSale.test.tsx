import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { cuentas, products, get } = vi.hoisted(() => ({
  cuentas: { create: vi.fn(), addVenta: vi.fn(), addPago: vi.fn() },
  products: { getAll: vi.fn() },
  get: vi.fn(),
}))
vi.mock('@/features/accounts/api', () => ({ cuentasApi: cuentas }))
vi.mock('@/features/products/api', () => ({ productsApi: products }))
vi.mock('@/shared/api/client', () => ({ apiClient: { get }, httpErrorMessage: () => 'e' }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))

import { useQuickSale } from '@/features/accounts/useQuickSale'
import type { Producto, ProductoPrecio, MedioPago } from '@/shared/types'

const PROD: Producto = {
  id: 1, nombre: 'Gaseosa', codigo: 'G1', activo: true, stock_total: 5,
  categoria_id: 1, precio_ponderado: 1000, descripcion: '',
} as Producto
const PRECIO: ProductoPrecio = { id: 1, producto_id: 1, nombre: 'Unidad', precio: 2000, cantidad: 1, activo: true } as ProductoPrecio
const MEDIO: MedioPago = { id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', activo: true, comision_porcentaje: 0 } as MedioPago

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  products.getAll.mockResolvedValue([PROD])
  get.mockResolvedValue({ data: [MEDIO] })
  cuentas.create.mockResolvedValue({ id: 10 })
  cuentas.addVenta.mockResolvedValue({})
  cuentas.addPago.mockResolvedValue({})
})

describe('useQuickSale', () => {
  it('carga productos activos y medios de pago', async () => {
    const { result } = renderHook(() => useQuickSale(() => {}), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.medios.length).toBe(1))
    // results con productos activos + stock
    await waitFor(() => expect(result.current.results.length).toBe(1))
  })

  it('addToCart agrega e incrementa (hasta stock), total refleja precio', async () => {
    const { result } = renderHook(() => useQuickSale(() => {}), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.results.length).toBe(1))
    act(() => result.current.addToCart(PROD, PRECIO))
    expect(result.current.cart[0]!.cantidad).toBe(1)
    expect(result.current.total).toBe(2000)
    act(() => result.current.addToCart(PROD, PRECIO))
    expect(result.current.cart[0]!.cantidad).toBe(2)
    expect(result.current.total).toBe(4000)
  })

  it('updateQty y setQty (0 elimina el ítem)', async () => {
    const { result } = renderHook(() => useQuickSale(() => {}), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.results.length).toBe(1))
    act(() => result.current.addToCart(PROD, PRECIO))
    act(() => result.current.updateQty(0, 2))
    expect(result.current.cart[0]!.cantidad).toBe(3)
    act(() => result.current.setQty(0, 0))
    expect(result.current.cart.length).toBe(0)
  })

  it('removeItem quita el ítem', async () => {
    const { result } = renderHook(() => useQuickSale(() => {}), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.results.length).toBe(1))
    act(() => result.current.addToCart(PROD, PRECIO))
    act(() => result.current.removeItem(0))
    expect(result.current.cart.length).toBe(0)
  })

  it('confirm crea cuenta, agrega venta y registra pago', async () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useQuickSale(onDone), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.results.length).toBe(1))
    act(() => result.current.addToCart(PROD, PRECIO))
    act(() => result.current.setSelectedMedio(MEDIO))
    act(() => result.current.confirm())
    await waitFor(() => expect(cuentas.addPago).toHaveBeenCalled())
    expect(cuentas.create).toHaveBeenCalled()
    expect(cuentas.addVenta).toHaveBeenCalledWith(10, expect.objectContaining({ producto_id: 1, cantidad: 1 }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })
})
