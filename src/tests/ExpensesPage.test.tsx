import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { gastosApi, mediosPagoApi } = vi.hoisted(() => ({
  gastosApi: {
    getAll: vi.fn(), stats: vi.fn(), create: vi.fn(), update: vi.fn(),
    remove: vi.fn(), uploadComprobante: vi.fn(),
  },
  mediosPagoApi: { getAll: vi.fn() },
}))
vi.mock('@/features/expenses/api', () => ({ gastosApi }))
vi.mock('@/features/payment-methods/api', () => ({ mediosPagoApi }))
vi.mock('@/shared/hooks/useCajaGuard', () => ({
  useCajaGuard: () => ({ cajaAbierta: true, isLoading: false, requireCaja: () => true }),
}))
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

import ExpensesPage from '@/features/expenses/ExpensesPage'

const GASTOS = [
  { id: 1, descripcion: 'Arriendo', monto: 800000, fecha: '2026-06-01', categoria: 'Arriendo', metodo_pago: 'EFECTIVO', comprobante_path: null },
  { id: 2, descripcion: 'Luz', monto: 120000, fecha: '2026-06-05', categoria: 'Servicios', metodo_pago: 'TRANSFERENCIA', comprobante_path: null },
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
  gastosApi.getAll.mockResolvedValue(GASTOS)
  gastosApi.stats.mockResolvedValue({ total: 920000, count: 2, total_mes: 920000, count_mes: 2 })
  gastosApi.create.mockResolvedValue({ ...GASTOS[0], id: 3 })
  mediosPagoApi.getAll.mockResolvedValue([{ id: 1, nombre: 'Efectivo', tipo: 'EFECTIVO', activo: true }])
})

describe('ExpensesPage', () => {
  it('renderiza los gastos', async () => {
    wrap(<ExpensesPage />)
    expect((await screen.findAllByText('Arriendo')).length).toBeGreaterThan(0)
    expect(screen.getByText('Luz')).toBeInTheDocument()
  })

  it('abre el modal de registrar gasto y crea', async () => {
    wrap(<ExpensesPage />)
    await screen.findByText('Luz')
    fireEvent.click(screen.getByRole('button', { name: /registrar gasto/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/descripción/i), { target: { value: 'Internet' } })
    const montoInput = within(dialog).getByPlaceholderText('0')
    fireEvent.change(montoInput, { target: { value: '90000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /guardar/i }))
    await waitFor(() => expect(gastosApi.create).toHaveBeenCalled())
  })
})
