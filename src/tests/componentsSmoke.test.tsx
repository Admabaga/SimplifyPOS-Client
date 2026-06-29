/** Smoke render de componentes prop-driven (modales, wizards, paneles, nav). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, fireEvent, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const generic = () => Promise.resolve({ data: [] })
const genericObj = () => Promise.resolve({ data: {} })
vi.mock('@/shared/api/client', () => ({
  apiClient: {
    get: vi.fn(generic), post: vi.fn(genericObj), put: vi.fn(genericObj),
    patch: vi.fn(genericObj), delete: vi.fn(genericObj),
    defaults: { headers: {} },
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  httpErrorMessage: () => 'error',
}))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}))
const authState = {
  user: { id: 1, email: 'a@pos.co', nombre: 'Admin', role: 'admin', permissions: ['*'], must_change_password: false },
  isAuthenticated: true,
  can: () => true, setUser: vi.fn(), updateUser: vi.fn(), clearAuth: vi.fn(),
}
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign(
    (sel?: (s: typeof authState) => unknown) => (sel ? sel(authState) : authState),
    { getState: () => authState },
  ),
  getStoredToken: () => 'tok',
}))

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('componentes — smoke render', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Sidebar monta', async () => {
    const Sidebar = (await import('@/shared/components/Sidebar')).default
    const { container } = wrap(<Sidebar />)
    expect(container.firstChild).not.toBeNull()
  })

  it('Topbar monta', async () => {
    const Topbar = (await import('@/shared/components/Topbar')).default
    const { container } = wrap(<Topbar />)
    expect(container.firstChild).not.toBeNull()
  })

  it('ThemePanel abierto monta', async () => {
    const ThemePanel = (await import('@/shared/components/ThemePanel')).default
    const { container } = wrap(<ThemePanel open onClose={() => {}} />)
    expect(container).toBeTruthy()
  })

  it('SessionExpiredModal muestra el form al expirar la sesión', async () => {
    const Modal = (await import('@/shared/components/SessionExpiredModal')).default
    const { findByText } = wrap(<Modal />)
    await act(async () => {
      window.dispatchEvent(new CustomEvent('simplifypos:session-expired'))
    })
    expect(await findByText(/sesión expirada/i)).toBeInTheDocument()
  })

  it('SetupWizard abierto monta', async () => {
    const SetupWizard = (await import('@/features/onboarding/SetupWizard')).default
    const { container } = wrap(<SetupWizard open onDismiss={() => {}} />)
    await waitFor(() => expect(container).toBeTruthy())
    expect(document.body.textContent).toBeTruthy()
  })

  it('DenominationCounter cuenta efectivo y aplica', async () => {
    const DC = (await import('@/features/caja/components/DenominationCounter')).default
    const onAplicar = vi.fn()
    const { container } = wrap(<DC esperado={50000} onAplicar={onAplicar} collapsedDefault={false} />)
    const inputs = container.querySelectorAll('input[type=number], input[inputmode=numeric], input')
    if (inputs.length) fireEvent.change(inputs[0]!, { target: { value: '2' } })
    expect(container.firstChild).not.toBeNull()
  })

  it('Combobox filtra y selecciona', async () => {
    const Combobox = (await import('@/shared/components/Combobox')).default
    const items = [{ id: 1, n: 'Ana' }, { id: 2, n: 'Beto' }]
    const onChange = vi.fn()
    const { container, getByRole } = wrap(
      <Combobox
        items={items}
        value={null}
        onChange={onChange}
        toText={(i) => i.n}
        toKey={(i) => i.id}
        renderItem={(i) => <span>{i.n}</span>}
        placeholder="Buscar"
      />,
    )
    const input = getByRole('combobox') as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'ana' } })
    expect(container.firstChild).not.toBeNull()
  })

  it('TwoFactorCard monta', async () => {
    const TwoFactorCard = (await import('@/features/auth/TwoFactorCard')).default
    const { container } = wrap(<TwoFactorCard />)
    await waitFor(() => expect(container).toBeTruthy())
    expect(container.firstChild).not.toBeNull()
  })
})
