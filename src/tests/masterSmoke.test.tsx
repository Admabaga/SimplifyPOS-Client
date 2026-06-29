/** Smoke render de las páginas del panel Master (rol master). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
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

const masterState = {
  user: { id: 1, email: 'm@pos.co', nombre: 'Master', role: 'master', permissions: ['*'], must_change_password: false },
  isAuthenticated: true,
  can: () => true,
  setUser: vi.fn(), updateUser: vi.fn(), clearAuth: vi.fn(),
}
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign(
    (sel?: (s: typeof masterState) => unknown) => (sel ? sel(masterState) : masterState),
    { getState: () => masterState },
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

const PAGES: [string, () => Promise<{ default: ComponentType }>][] = [
  ['Master', () => import('@/features/master/MasterPage')],
  ['MasterToday', () => import('@/features/master/MasterTodayPage')],
  ['MasterAnalytics', () => import('@/features/master/MasterAnalyticsPage')],
  ['MasterSubscriptions', () => import('@/features/master/MasterSubscriptionsPage')],
  ['MasterInfra', () => import('@/features/master/MasterInfraPage')],
  ['MasterAI', () => import('@/features/master/MasterAIPage')],
]

describe('páginas master — smoke', () => {
  beforeEach(() => vi.clearAllMocks())
  it.each(PAGES)('%s monta sin crashear', async (_n, importer) => {
    const Page = (await importer()).default
    const { container } = wrap(<Page />)
    await waitFor(() => expect(container).toBeTruthy())
    expect(container.firstChild).not.toBeNull()
  })
})
