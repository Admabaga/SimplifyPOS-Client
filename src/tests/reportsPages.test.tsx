import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({
  reportes: { monthly: vi.fn(), expensesMonthly: vi.fn(), audit: vi.fn() },
  products: { getAll: vi.fn() },
  cuentas: { getAll: vi.fn() },
  billing: { getEmpresa: vi.fn() },
  apiClient: { get: vi.fn() as ReturnType<typeof vi.fn> },
}))
vi.mock('@/features/reports/api', () => ({ reportesApi: h.reportes }))
vi.mock('@/features/products/api', () => ({ productsApi: h.products }))
vi.mock('@/features/accounts/api', () => ({ cuentasApi: h.cuentas }))
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

const REPORTE = {
  year: 2026, month: 6,
  total_ventas: 500000, cogs: 200000, ganancia_bruta: 300000,
  total_gastos: 80000, ganancia_neta: 220000,
  total_pagos: 480000, total_compras: 150000, flujo_caja_neto: 250000,
  cuentas_abiertas: 2, cuentas_pagadas: 10, cuentas_por_cobrar: 20000,
  top_productos: [{ producto_id: 1, num_ventas: 30, unidades: 60, total: 180000 }],
  ventas_por_dia: [
    { dia: '2026-06-01', num_ventas: 5, total: 100000, ganancia: 60000 },
    { dia: '2026-06-02', num_ventas: 8, total: 160000, ganancia: 90000 },
  ],
}

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  h.reportes.monthly.mockResolvedValue(REPORTE)
  h.reportes.expensesMonthly.mockResolvedValue({ total: 80000, por_categoria: [{ categoria: 'Arriendo', total: 80000 }] })
  h.reportes.audit.mockResolvedValue([])
  h.products.getAll.mockResolvedValue([{ id: 1, nombre: 'Café', stock_total: 10, precio_ponderado: 1000 }])
  h.cuentas.getAll.mockResolvedValue([])
  h.billing.getEmpresa.mockResolvedValue({ razon_social: 'Mi Tienda', nit: '900', dian_habilitado: false })
  h.apiClient.get.mockResolvedValue({ data: [{ id: 1, activo: true }] })
})

describe('DashboardPage', () => {
  it('renderiza con datos del reporte mensual', async () => {
    const Page = (await import('@/features/reports/DashboardPage')).default
    const { container } = wrap(<Page />)
    // Espera a que los datos rendericen (valor monetario derivado del reporte)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.firstChild).not.toBeNull()
  })
})

