import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Plan, SubscriptionMe } from '@/features/subscription/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/features/subscription/api', () => ({
  subscriptionApi: {
    getPlans: vi.fn(),
    getConfig: vi.fn(),
    getMe: vi.fn(),
    pay: vi.fn(),
    savePaymentMethod: vi.fn(),
  },
}))

const mockClearAuth = vi.fn()
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign(
    (selector: (s: { user: { role: string } }) => unknown) =>
      selector({ user: { role: 'admin' } }),
    { getState: () => ({ clearAuth: mockClearAuth }) }
  ),
}))

import { subscriptionApi } from '@/features/subscription/api'
import PlansPage from '@/features/subscription/PlansPage'
import SubscriptionGate from '@/features/subscription/SubscriptionGate'

const PLANES: Plan[] = [
  { id: 1, codigo: 'EMPRENDE', nombre: 'Emprende', descripcion: 'Básico', precio_mensual: 49900, precio_anual: 499000, limite_documentos_mes: 150, precio_excedente: 250, max_usuarios: 2, features: ['pos'], orden: 1 },
  { id: 2, codigo: 'PRO', nombre: 'Pro', descripcion: 'Popular', precio_mensual: 99900, precio_anual: 999000, limite_documentos_mes: 600, precio_excedente: 200, max_usuarios: 6, features: ['dian_electronica'], orden: 2 },
  { id: 3, codigo: 'PREMIUM', nombre: 'Premium', descripcion: 'Todo', precio_mensual: 199900, precio_anual: 1999000, limite_documentos_mes: null, precio_excedente: 0, max_usuarios: null, features: ['multi_sucursal'], orden: 3 },
]

const baseMe = (over: Partial<SubscriptionMe>): SubscriptionMe => ({
  estado: 'ACTIVE', ciclo: 'MENSUAL', plan: PLANES[1]!, en_trial: false, acceso_permitido: true,
  trial_fin: null, periodo_fin: null, proximo_cobro: null, documentos_usados: 0, documentos_limite: 600,
  documentos_restantes: 600, usuarios_actuales: 1, excedente_acumulado: 0, descuento_proximo_cobro: 0,
  cancel_at_period_end: false, monto_proximo_cobro: 99900,
  metodo_brand: 'VISA', metodo_last4: '4242', metodo_holder: 'ADRIAN BARRERA', metodo_exp: '12/29', tiene_metodo_pago: true, historial: [], ...over,
})

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(subscriptionApi.getConfig).mockResolvedValue({ provider: 'mock', currency: 'COP', public_key: '', acceptance_token: 'tok' })
})

describe('PlansPage', () => {
  it('renderiza los 3 planes', async () => {
    vi.mocked(subscriptionApi.getPlans).mockResolvedValue(PLANES)
    wrap(<PlansPage />)
    await waitFor(() => expect(screen.getByText('Emprende')).toBeInTheDocument())
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
    expect(screen.getByText('Más popular')).toBeInTheDocument()
  })

  it('el toggle anual muestra el descuento', async () => {
    vi.mocked(subscriptionApi.getPlans).mockResolvedValue(PLANES)
    wrap(<PlansPage />)
    await waitFor(() => expect(screen.getByText('Emprende')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Anual' }))
    expect(screen.getByText('2 meses gratis')).toBeInTheDocument()
  })
})

describe('SubscriptionGate', () => {
  it('NO bloquea cuando la suscripción está activa', async () => {
    vi.mocked(subscriptionApi.getMe).mockResolvedValue(baseMe({ estado: 'ACTIVE', acceso_permitido: true }))
    wrap(<SubscriptionGate><div>Contenido POS</div></SubscriptionGate>)
    await waitFor(() => expect(screen.getByText('Contenido POS')).toBeInTheDocument())
    expect(screen.queryByText(/suspendida/i)).not.toBeInTheDocument()
  })

  it('bloquea con overlay cuando está suspendida', async () => {
    vi.mocked(subscriptionApi.getMe).mockResolvedValue(baseMe({ estado: 'SUSPENDED', acceso_permitido: false }))
    wrap(<SubscriptionGate><div>Contenido POS</div></SubscriptionGate>)
    await waitFor(() => expect(screen.getByText('Tu suscripción está suspendida')).toBeInTheDocument())
  })

  it('muestra banner de prueba en TRIALING', async () => {
    vi.mocked(subscriptionApi.getMe).mockResolvedValue(baseMe({ estado: 'TRIALING', acceso_permitido: true, en_trial: true }))
    wrap(<SubscriptionGate><div>Contenido POS</div></SubscriptionGate>)
    await waitFor(() => expect(screen.getByText(/mes de prueba gratis/i)).toBeInTheDocument())
  })
})
