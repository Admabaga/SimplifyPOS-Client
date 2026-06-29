import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({
  cuentas: {
    getById: vi.fn(), addVenta: vi.fn(), deleteVenta: vi.fn(),
    addPago: vi.fn(), deletePago: vi.fn(), asignarCliente: vi.fn(),
  },
  products: { getAll: vi.fn() },
  billing: { listByCuenta: vi.fn(), emitir: vi.fn() },
  apiClient: { get: vi.fn() as ReturnType<typeof vi.fn> },
}))
vi.mock('@/features/accounts/api', () => ({ cuentasApi: h.cuentas }))
vi.mock('@/features/products/api', () => ({ productsApi: h.products }))
vi.mock('@/features/billing/api', () => ({ billingApi: h.billing }))
vi.mock('@/shared/api/client', () => ({ apiClient: h.apiClient, httpErrorMessage: () => 'e' }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'admin', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign((s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState), {
    getState: () => authState,
  }),
}))

import AccountDetailPage from '@/features/accounts/AccountDetailPage'

const CUENTA = {
  id: 1, nombre: 'Mesa 5', total: 6000, esta_pagada: false, valor_pendiente: 6000,
  fecha_creacion: '2026-06-29T10:00:00',
  ventas: [
    { id: 1, cuenta_id: 1, producto_id: 1, producto_precio_id: 1, cantidad_unidades: 3,
      precio_unitario: 2000, precio_venta: 6000, ganancia: 3000, fecha_venta: '2026-06-29T10:05:00',
      vendido_por: 1, sesion_caja_id: 1, nombre_cajero: 'Admin', producto_nombre: 'Café' },
  ],
  pagos: [],
  cliente_tipo_doc: null, cliente_documento: null, cliente_nombre_fiscal: null,
  cliente_direccion: null, cliente_telefono: null, cliente_email: null,
}

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/accounts/1']}>
        <Routes>
          <Route path="/accounts/:id" element={node} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  h.cuentas.getById.mockResolvedValue(CUENTA)
  h.products.getAll.mockResolvedValue([{ id: 1, nombre: 'Café', codigo: 'C1', precios: [] }])
  h.billing.listByCuenta.mockResolvedValue([])
  h.apiClient.get.mockResolvedValue({ data: [{ id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', activo: true }] })
})

describe('AccountDetailPage', () => {
  it('renderiza el detalle de la cuenta con su venta', async () => {
    wrap(<AccountDetailPage />)
    expect(await screen.findByText('Mesa 5')).toBeInTheDocument()
    expect(await screen.findAllByText(/café/i)).not.toHaveLength(0)
  })

  it('muestra el total/pendiente de la cuenta', async () => {
    wrap(<AccountDetailPage />)
    await screen.findByText('Mesa 5')
    // El saldo pendiente $6.000 aparece en pantalla
    expect((await screen.findAllByText(/6\.000/)).length).toBeGreaterThan(0)
  })
})
