import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ─── Mocks ──────────────────────────────────────────────────────────────────
const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const { postMock, estadoMock, toastError, toastLoading } = vi.hoisted(() => ({
  postMock: vi.fn(),
  estadoMock: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
}))
vi.mock('@/shared/api/client', () => ({ apiClient: { post: postMock } }))
vi.mock('@/features/caja/api', () => ({ cajaApi: { estado: estadoMock } }))
vi.mock('react-hot-toast', () => ({
  toast: { error: toastError, loading: toastLoading },
  default: { error: toastError, loading: toastLoading },
}))

import { useUIStore } from '@/stores/ui'
import { aiApi } from '@/shared/api/aiApi'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts'
import { useCajaGuard } from '@/shared/hooks/useCajaGuard'
import { useAuthStore } from '@/stores/auth'

function qcWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

// matchMedia mock para jsdom
function mockMatchMedia(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = []
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches,
    media: q,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }))
}

describe('ui store', () => {
  beforeEach(() => useUIStore.setState({ sidebarCollapsed: false }))
  it('toggleSidebar alterna y setSidebarCollapsed fija', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
    useUIStore.getState().setSidebarCollapsed(false)
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })
})

describe('aiApi', () => {
  beforeEach(() => vi.clearAllMocks())
  it('posAdvisor llama POST /ai/pos-advisor con timeout extendido', async () => {
    postMock.mockResolvedValue({ data: { analysis: 'ok' } })
    const r = await aiApi.posAdvisor()
    expect(r.analysis).toBe('ok')
    expect(postMock).toHaveBeenCalledWith('/ai/pos-advisor', undefined, { timeout: 120_000 })
  })
  it('marketing envía analytics', async () => {
    postMock.mockResolvedValue({ data: { analysis: 'm' } })
    await aiApi.marketing({ ventas: 10 })
    expect(postMock).toHaveBeenCalledWith('/ai/marketing', { analytics: { ventas: 10 } }, { timeout: 120_000 })
  })
})

describe('useIsDesktop', () => {
  it('devuelve true cuando matchMedia matchea', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsDesktop(1024))
    expect(result.current).toBe(true)
  })
  it('devuelve false cuando no matchea', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })
})

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ isAuthenticated: true })
    document.body.innerHTML = ''
  })

  it('mapea cada F-key a su ruta', () => {
    renderHook(() => useGlobalShortcuts())
    const map: Record<string, string> = {
      F1: '/dashboard', F2: '/accounts', F3: '/caja', F4: '/admin/billing',
      F6: '/reports', F7: '/notifications', F8: '/sales', F9: '/products',
    }
    for (const [key, route] of Object.entries(map)) {
      navigate.mockClear()
      window.dispatchEvent(new KeyboardEvent('keydown', { key }))
      expect(navigate).toHaveBeenCalledWith(route)
    }
  })

  it('no navega si el foco está en un input (escribiendo)', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    renderHook(() => useGlobalShortcuts())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('no navega si hay un modal (role=dialog) abierto', () => {
    const dlg = document.createElement('div')
    dlg.setAttribute('role', 'dialog')
    document.body.appendChild(dlg)
    renderHook(() => useGlobalShortcuts())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('no actúa si el usuario no está autenticado', () => {
    useAuthStore.setState({ isAuthenticated: false })
    renderHook(() => useGlobalShortcuts())
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1' }))
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('useCajaGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 1 } as never, isAuthenticated: true })
  })

  it('requireCaja true cuando la caja está abierta', async () => {
    estadoMock.mockResolvedValue({ estado: 'abierta' })
    const { result } = renderHook(() => useCajaGuard(), { wrapper: qcWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.cajaAbierta).toBe(true)
    expect(result.current.requireCaja('vender')).toBe(true)
  })

  it('requireCaja false + toast cuando la caja está cerrada', async () => {
    estadoMock.mockResolvedValue({ estado: 'cerrada' })
    const { result } = renderHook(() => useCajaGuard(), { wrapper: qcWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.requireCaja()).toBe(false)
    expect(toastError).toHaveBeenCalled()
  })
})
