/** Interacción CRUD: abrir modal de creación, llenar y enviar → mutación. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const a = vi.hoisted(() => ({
  proveedores: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  categorias: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  medios: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  clientes: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/features/suppliers/api', () => ({ proveedoresApi: a.proveedores }))
vi.mock('@/features/categories/api', () => ({ categoriasApi: a.categorias }))
vi.mock('@/features/payment-methods/api', () => ({ mediosPagoApi: a.medios }))
vi.mock('@/features/clients/api', () => ({ clientesApi: a.clientes }))
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
    <QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  a.proveedores.getAll.mockResolvedValue([{ id: 1, nombre: 'Prov A', telefono: '', email: '', direccion: '', ciudad: '' }])
  a.proveedores.create.mockResolvedValue({ id: 2, nombre: 'Nuevo Prov' })
  a.categorias.getAll.mockResolvedValue([{ id: 1, nombre: 'Cat A', iva: 19, productos_count: 0 }])
  a.categorias.create.mockResolvedValue({ id: 2, nombre: 'Cat Nueva', iva: 0 })
  a.medios.getAll.mockResolvedValue([{ id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', activo: true, comision_porcentaje: 0 }])
  a.medios.create.mockResolvedValue({ id: 2, nombre: 'Nequi', tipo: 'TRANSFERENCIA', activo: true })
  a.clientes.getAll.mockResolvedValue([])
  a.clientes.create.mockResolvedValue({ id: 1, nombre_fiscal: 'Cliente X' })
})

describe('CRUD create flows', () => {
  it('SuppliersPage: crea proveedor', async () => {
    const Page = (await import('@/features/suppliers/SuppliersPage')).default
    wrap(<Page />)
    await screen.findByText('Prov A')
    fireEvent.click(screen.getByRole('button', { name: /nuevo proveedor/i }))
    const d = await screen.findByRole('dialog')
    fireEvent.change(within(d).getByLabelText(/nombre/i), { target: { value: 'Nuevo Prov' } })
    fireEvent.click(within(d).getByRole('button', { name: /guardar|crear/i }))
    await waitFor(() => expect(a.proveedores.create).toHaveBeenCalled())
  })

  it('CategoriesPage: crea categoría', async () => {
    const Page = (await import('@/features/categories/CategoriesPage')).default
    wrap(<Page />)
    await screen.findByText('Cat A')
    fireEvent.click(screen.getByRole('button', { name: /nueva categoría/i }))
    const d = await screen.findByRole('dialog')
    fireEvent.change(within(d).getByLabelText(/nombre/i), { target: { value: 'Cat Nueva' } })
    fireEvent.click(within(d).getByRole('button', { name: /guardar|crear/i }))
    await waitFor(() => expect(a.categorias.create).toHaveBeenCalled())
  })

  it('PaymentMethodsPage: crea medio', async () => {
    const Page = (await import('@/features/payment-methods/PaymentMethodsPage')).default
    wrap(<Page />)
    await screen.findByText('Efectivo')
    fireEvent.click(screen.getByRole('button', { name: /nuevo medio/i }))
    const d = await screen.findByRole('dialog')
    fireEvent.change(within(d).getByLabelText(/nombre/i), { target: { value: 'Nequi' } })
    fireEvent.click(within(d).getByRole('button', { name: /guardar|crear/i }))
    await waitFor(() => expect(a.medios.create).toHaveBeenCalled())
  })
})
