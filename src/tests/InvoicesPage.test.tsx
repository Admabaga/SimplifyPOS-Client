import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({
  facturas: { getAll: vi.fn(), stats: vi.fn(), create: vi.fn() },
  proveedores: { getAll: vi.fn() },
  products: { getAll: vi.fn(), create: vi.fn() },
  categorias: { getAll: vi.fn() },
}))
vi.mock('@/features/invoices/api', () => ({ facturasApi: h.facturas }))
vi.mock('@/features/suppliers/api', () => ({ proveedoresApi: h.proveedores }))
vi.mock('@/features/products/api', () => ({ productsApi: h.products }))
vi.mock('@/features/categories/api', () => ({ categoriasApi: h.categorias }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'admin', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign((s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState), {
    getState: () => authState,
  }),
}))

import InvoicesPage from '@/features/invoices/InvoicesPage'

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

// La pantalla filtra por defecto a los últimos 90 días. Con una fecha fija en
// el fixture, el test caduca solo: funciona hasta que pasan 90 días de esa
// fecha y luego falla sin que nadie haya tocado el código. Se ancla a "hace
// unos días" para que siga probando lo que dice probar.
const HACE_CINCO_DIAS = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 19)

beforeEach(() => {
  vi.clearAllMocks()
  h.facturas.getAll.mockResolvedValue([
    { id: 1, proveedor_id: 1, fecha_creacion: HACE_CINCO_DIAS, compras: [{ precio_total: 100000 }] },
  ])
  h.facturas.stats.mockResolvedValue({ total_invertido: 100000, facturas: 1, total_mes: 100000, facturas_mes: 1, unidades: 20 })
  h.proveedores.getAll.mockResolvedValue([{ id: 1, nombre: 'Distribuidora Sol' }])
  h.products.getAll.mockResolvedValue([{ id: 1, nombre: 'Arroz', codigo: 'A1' }])
  h.categorias.getAll.mockResolvedValue([])
  h.facturas.create.mockResolvedValue({ id: 2, proveedor_id: 1, compras: [] })
})

describe('InvoicesPage', () => {
  it('renderiza la factura del proveedor', async () => {
    wrap(<InvoicesPage />)
    expect(await screen.findByText('Distribuidora Sol')).toBeInTheDocument()
  })

  it('abre el modal de nueva factura', async () => {
    wrap(<InvoicesPage />)
    await screen.findByText('Distribuidora Sol')
    fireEvent.click(screen.getByRole('button', { name: /nueva factura/i }))
    const dialog = await screen.findByRole('dialog')
    // El selector de proveedor del modal lista el proveedor
    expect(within(dialog).getByText(/seleccionar proveedor/i)).toBeInTheDocument()
  })
})
