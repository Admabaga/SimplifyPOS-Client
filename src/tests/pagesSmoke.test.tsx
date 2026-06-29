/**
 * Smoke tests de render para todas las páginas tenant-facing.
 *
 * Estrategia: mockeamos apiClient con resolvers genéricos → todas las feature-API
 * devuelven datos vacíos/neutros sin necesidad de mockear cada módulo. El objetivo
 * es ejercer el camino de render (loading + estado vacío) de cada página y detectar
 * crashes de import/render, cubriendo la mayor parte de los statements de la UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ─── apiClient genérico: cualquier llamada resuelve a datos neutros ──────────
const generic = () => Promise.resolve({ data: [] })
const genericObj = () => Promise.resolve({ data: {} })
vi.mock('@/shared/api/client', () => ({
  apiClient: {
    get: vi.fn(generic),
    post: vi.fn(genericObj),
    put: vi.fn(genericObj),
    patch: vi.fn(genericObj),
    delete: vi.fn(genericObj),
    defaults: { headers: {} },
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  httpErrorMessage: () => 'error',
}))

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  Toaster: () => null,
}))

// Auth store: admin con todos los permisos (can => true)
const adminUser = {
  id: 1,
  email: 'admin@pos.co',
  nombre: 'Admin',
  role: 'admin',
  permissions: ['*'],
  must_change_password: false,
}
const authState = {
  user: adminUser,
  isAuthenticated: true,
  can: () => true,
  setUser: vi.fn(),
  updateUser: vi.fn(),
  clearAuth: vi.fn(),
}
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign((sel?: (s: typeof authState) => unknown) => (sel ? sel(authState) : authState), {
    getState: () => authState,
  }),
  getStoredToken: () => 'tok',
}))

function wrap(node: ReactNode, initialPath = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/accounts/:id" element={node} />
          <Route path="*" element={node} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// [nombre, import dinámico, ruta inicial opcional]
const PAGES: [string, () => Promise<{ default: ComponentType }>, string?][] = [
  ['Products', () => import('@/features/products/ProductsPage')],
  ['Accounts', () => import('@/features/accounts/AccountsPage')],
  ['AccountDetail', () => import('@/features/accounts/AccountDetailPage'), '/accounts/1'],
  ['Caja', () => import('@/features/caja/CajaPage')],
  ['Sales', () => import('@/features/sales/SalesPage')],
  ['Reports', () => import('@/features/reports/ReportsPage')],
  ['Dashboard', () => import('@/features/reports/DashboardPage')],
  ['Billing', () => import('@/features/billing/BillingPage')],
  ['Expenses', () => import('@/features/expenses/ExpensesPage')],
  ['Categories', () => import('@/features/categories/CategoriesPage')],
  ['Suppliers', () => import('@/features/suppliers/SuppliersPage')],
  ['Clientes', () => import('@/features/clients/ClientesPage')],
  ['PaymentMethods', () => import('@/features/payment-methods/PaymentMethodsPage')],
  ['Notifications', () => import('@/features/notifications/NotificationsPage')],
  ['Invoices', () => import('@/features/invoices/InvoicesPage')],
  ['Suscripcion', () => import('@/features/subscription/SubscriptionPage')],
  ['Signup', () => import('@/features/subscription/SignupPage')],
  ['Profile', () => import('@/features/auth/ProfilePage')],
  ['Users', () => import('@/features/admin/users/UsersPage')],
  ['Roles', () => import('@/features/admin/roles/RolesPage')],
  ['Audit', () => import('@/features/admin/audit/AuditPage')],
]

describe('páginas — smoke render', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(PAGES)('%s monta sin crashear', async (_name, importer, path) => {
    const Page = (await importer()).default
    const { container } = wrap(<Page />, path ?? '/')
    await waitFor(() => expect(container).toBeTruthy())
    // El contenedor debe haber renderizado algún nodo (no quedó en blanco por throw)
    expect(container.firstChild).not.toBeNull()
  })
})
