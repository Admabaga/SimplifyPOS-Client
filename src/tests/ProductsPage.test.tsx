import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { productsApi, categoriasApi } = vi.hoisted(() => ({
  productsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getPrices: vi.fn(),
    addPrice: vi.fn(),
    updatePrice: vi.fn(),
    removePrice: vi.fn(),
  },
  categoriasApi: { getAll: vi.fn() },
}))
vi.mock('@/features/products/api', () => ({ productsApi }))
vi.mock('@/features/categories/api', () => ({ categoriasApi }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'admin', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign((s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState), {
    getState: () => authState,
  }),
}))

import ProductsPage from '@/features/products/ProductsPage'

const PRODUCTS = [
  { id: 1, nombre: 'Gaseosa 1L', codigo: 'G1', activo: true, stock_total: 24, categoria_id: 1, precio_ponderado: 1500, descripcion: '' },
  { id: 2, nombre: 'Pan', codigo: 'P1', activo: true, stock_total: 5, categoria_id: 1, precio_ponderado: 500, descripcion: '' },
]

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
  productsApi.getAll.mockResolvedValue(PRODUCTS)
  categoriasApi.getAll.mockResolvedValue([{ id: 1, nombre: 'General', iva: 0 }])
  productsApi.create.mockResolvedValue({ ...PRODUCTS[0], id: 3, nombre: 'Nuevo' })
  productsApi.addPrice.mockResolvedValue({ id: 9, nombre: 'Unidad', precio: 1000, cantidad: 1 })
})

describe('ProductsPage', () => {
  it('renderiza las filas de productos del tenant', async () => {
    wrap(<ProductsPage />)
    expect(await screen.findByText('Gaseosa 1L')).toBeInTheDocument()
    expect(screen.getByText('Pan')).toBeInTheDocument()
  })

  it('filtra por búsqueda', async () => {
    wrap(<ProductsPage />)
    await screen.findByText('Gaseosa 1L')
    const search = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(search, { target: { value: 'pan' } })
    await waitFor(() => expect(screen.queryByText('Gaseosa 1L')).not.toBeInTheDocument())
    expect(screen.getByText('Pan')).toBeInTheDocument()
  })

  it('abre el modal de nuevo producto, llena y envía', async () => {
    wrap(<ProductsPage />)
    await screen.findByText('Gaseosa 1L')

    fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText(/nombre/i), { target: { value: 'Agua' } })
    // precio de venta
    const precio = within(dialog).getByText(/valor de venta/i).parentElement!.querySelector('input')!
    fireEvent.change(precio, { target: { value: '2000' } })

    fireEvent.click(within(dialog).getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(productsApi.create).toHaveBeenCalled())
  })
})
