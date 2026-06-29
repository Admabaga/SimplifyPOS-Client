/** Render con datos de las páginas admin (tablas: roles, usuarios, audit). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const a = vi.hoisted(() => ({
  usuarios: { list: vi.fn(), create: vi.fn(), lock: vi.fn(), unlock: vi.fn(), update: vi.fn(), resetPassword: vi.fn(), remove: vi.fn() },
  roles: { list: vi.fn(), listPermissions: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), setPermissions: vi.fn() },
  master: { listTenants: vi.fn(), analytics: vi.fn() },
  audit: { list: vi.fn(), stats: vi.fn(), verify: vi.fn(), exportCsv: vi.fn() },
}))
vi.mock('@/features/admin/users/api', () => ({ usuariosApi: a.usuarios }))
vi.mock('@/features/admin/roles/api', () => ({ rolesApi: a.roles }))
vi.mock('@/features/master/api', () => ({ masterApi: a.master }))
vi.mock('@/features/admin/audit/api', () => ({ auditApi: a.audit }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'master', permissions: ['*'] }, isAuthenticated: true, can: () => true }
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
  a.usuarios.list.mockResolvedValue([
    { id: 2, email: 'sup@neg.co', nombre: 'Super Visor', role_name: 'supervisor', activo: true,
      bloqueado: false, must_change_password: false, created_at: '2026-06-01T00:00:00', last_login: null },
  ])
  a.roles.list.mockResolvedValue([
    { id: 1, name: 'admin', description: 'Admin', is_system: true, permissions: ['users:read'] },
    { id: 2, name: 'cajero', description: 'Cajero', is_system: false, permissions: ['ventas:create'] },
  ])
  a.roles.listPermissions.mockResolvedValue({ permissions: ['users:read', 'ventas:create'], grouped: { users: ['read'], ventas: ['create'] } })
  a.master.listTenants.mockResolvedValue([])
  a.audit.list.mockResolvedValue({
    items: [{ id: 1, user_id: 1, user_email: 'a@b.co', action: 'login', resource: 'auth', resource_id: null, ip: '127.0.0.1', extra: null, created_at: '2026-06-29T10:00:00' }],
    total: 1, limit: 50, offset: 0,
  })
  a.audit.stats.mockResolvedValue({
    totals: { today: 1, week: 5, month: 20 }, by_action: [{ action: 'login', count: 10 }],
    top_users: [], top_resources: [], hourly_24h: [], anomalies: [],
  })
  a.audit.verify.mockResolvedValue({ ok: true, verified: 20, broken_at: null })
})

describe('admin pages con datos', () => {
  it('RolesPage muestra los roles', async () => {
    const Page = (await import('@/features/admin/roles/RolesPage')).default
    wrap(<Page />)
    expect(await screen.findByText('cajero')).toBeInTheDocument()
  })

  it('UsersPage muestra los usuarios', async () => {
    const Page = (await import('@/features/admin/users/UsersPage')).default
    wrap(<Page />)
    expect(await screen.findByText('Super Visor')).toBeInTheDocument()
  })

  it('AuditPage muestra eventos de auditoría', async () => {
    const Page = (await import('@/features/admin/audit/AuditPage')).default
    wrap(<Page />)
    expect(await screen.findAllByText(/login|a@b\.co/i)).not.toHaveLength(0)
  })
})
