/** Smoke render de sub-componentes a 0% (caja/billing/ventas). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({
  caja: { listarMovimientos: vi.fn(), crearMovimiento: vi.fn() },
  billing: { listTickets: vi.fn(), anular: vi.fn() },
}))
vi.mock('@/features/caja/api', () => ({ cajaApi: h.caja }))
vi.mock('@/features/billing/api', () => ({ billingApi: h.billing }))
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
  h.caja.listarMovimientos.mockResolvedValue([
    { id: 1, tipo: 'INGRESO', monto: 10000, motivo: 'fondo', created_at: '2026-06-29T10:00:00', cajero_nombre: 'Admin' },
  ])
  h.billing.listTickets.mockResolvedValue([])
})

describe('sub-componentes smoke', () => {
  it('MovimientosPanel monta y lista', async () => {
    const Panel = (await import('@/features/caja/components/MovimientosPanel')).default
    const { container } = wrap(<Panel sesionId={1} sesionAbierta />)
    await screen.findByText('fondo')
    expect(container.firstChild).not.toBeNull()
  })

  it('TicketsHistorialTab monta', async () => {
    const Tab = (await import('@/features/billing/components/TicketsHistorialTab')).default
    const { container } = wrap(<Tab />)
    expect(container).toBeTruthy()
  })

  it('QuickSaleSteps StepCart monta', async () => {
    const { StepCart } = await import('@/features/accounts/QuickSaleSteps')
    const { container } = wrap(
      <StepCart
        search="" setSearch={() => {}} searchRef={createRef()} results={[]} cart={[]}
        total={0} onAdd={() => {}} onUpdateQty={() => {}} onSetQty={() => {}} onRemove={() => {}}
      />,
    )
    expect(container.firstChild).not.toBeNull()
  })
})
