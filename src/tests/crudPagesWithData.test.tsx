/** Render con datos reales de las páginas CRUD simples (cubre filas/acciones). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({
  proveedores: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  categorias: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  medios: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  clientes: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  ventas: { getAll: vi.fn() },
  products: { getAll: vi.fn() },
  cuentas: { getAll: vi.fn(), stats: vi.fn() },
}))
vi.mock('@/features/suppliers/api', () => ({ proveedoresApi: h.proveedores }))
vi.mock('@/features/categories/api', () => ({ categoriasApi: h.categorias }))
vi.mock('@/features/payment-methods/api', () => ({ mediosPagoApi: h.medios }))
vi.mock('@/features/clients/api', () => ({ clientesApi: h.clientes }))
vi.mock('@/features/sales/api', () => ({ ventasApi: h.ventas }))
vi.mock('@/features/products/api', () => ({ productsApi: h.products }))
vi.mock('@/features/accounts/api', () => ({ cuentasApi: h.cuentas }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'admin', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign((s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState), {
    getState: () => authState,
  }),
}))

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
  h.proveedores.getAll.mockResolvedValue([
    { id: 1, nombre: 'Distribuidora Sol', telefono: '3001', email: 'a@b.co', direccion: 'Cll 1', ciudad: 'Cali' },
  ])
  h.categorias.getAll.mockResolvedValue([{ id: 1, nombre: 'Bebidas', iva: 19, productos_count: 3 }])
  h.medios.getAll.mockResolvedValue([{ id: 1, nombre: 'Nequi', tipo: 'TRANSFERENCIA', activo: true }])
  h.clientes.getAll.mockResolvedValue([
    { id: 1, nombre_fiscal: 'Cliente Uno', documento: '123', tipo_documento: 'CC', telefono: '300', email: 'c@d.co', activo: true, total_compras: 0 },
  ])
  h.ventas.getAll.mockResolvedValue([])
  h.products.getAll.mockResolvedValue([])
  h.cuentas.getAll.mockResolvedValue([])
  h.cuentas.stats.mockResolvedValue({ total: 0, count: 0 })
})

describe('CRUD pages con datos', () => {
  it('SuppliersPage muestra el proveedor', async () => {
    const Page = (await import('@/features/suppliers/SuppliersPage')).default
    wrap(<Page />)
    expect(await screen.findByText('Distribuidora Sol')).toBeInTheDocument()
  })

  it('CategoriesPage muestra la categoría', async () => {
    const Page = (await import('@/features/categories/CategoriesPage')).default
    wrap(<Page />)
    expect(await screen.findByText('Bebidas')).toBeInTheDocument()
  })

  it('PaymentMethodsPage muestra el medio', async () => {
    const Page = (await import('@/features/payment-methods/PaymentMethodsPage')).default
    wrap(<Page />)
    expect(await screen.findByText('Nequi')).toBeInTheDocument()
  })

  it('ClientesPage monta (búsqueda visible)', async () => {
    const Page = (await import('@/features/clients/ClientesPage')).default
    wrap(<Page />)
    expect(await screen.findByPlaceholderText(/buscar nombre o documento/i)).toBeInTheDocument()
  })
})
