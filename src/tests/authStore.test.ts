import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mocks de dependencias externas del store (vi.hoisted: las fns existen antes del mock)
const { initForUser, resetUser, clear } = vi.hoisted(() => ({
  initForUser: vi.fn(),
  resetUser: vi.fn(),
  clear: vi.fn(),
}))
vi.mock('@/stores/theme', () => ({
  useThemeStore: { getState: () => ({ initForUser, resetUser }) },
}))
vi.mock('@/shared/api/queryClient', () => ({ queryClient: { clear } }))

import { useAuthStore, getStoredToken } from '@/stores/auth'
import type { User } from '@/shared/types'

const TOKEN_KEY = 'simplifypos_token'
const REMEMBER_KEY = 'simplifypos_remember'

const baseUser: User = {
  id: 7,
  email: 'a@b.co',
  nombre: 'Ana',
  role: 'ADMIN', // uppercase a propósito → debe normalizarse
  permissions: ['productos:read', 'ventas:create'],
  must_change_password: false,
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    useAuthStore.setState({ user: null, isAuthenticated: false })
    vi.clearAllMocks()
  })

  it('el token NUNCA se persiste: solo vive en memoria', () => {
    // Guardarlo en localStorage/sessionStorage lo dejaba al alcance de
    // cualquier XSS. La persistencia entre recargas la da la cookie httpOnly
    // del refresh, que el JavaScript no puede leer.
    useAuthStore.getState().setUser(baseUser, 'tok-123', true)
    expect(getStoredToken()).toBe('tok-123')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('remember=true deja la marca para que el refresh restaure la sesión', () => {
    useAuthStore.getState().setUser(baseUser, 'tok-123', true)
    expect(localStorage.getItem(REMEMBER_KEY)).toBe('1')
  })

  it('remember=false no deja marca ni token persistido', () => {
    useAuthStore.getState().setUser(baseUser, 'tok-xyz', false)
    expect(getStoredToken()).toBe('tok-xyz')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REMEMBER_KEY)).toBeNull()
  })

  it('limpia el token que hubiera dejado una versión anterior', () => {
    localStorage.setItem(TOKEN_KEY, 'token-viejo-persistido')
    sessionStorage.setItem(TOKEN_KEY, 'token-viejo-persistido')
    useAuthStore.getState().setUser(baseUser, 'tok-nuevo', true)
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('normaliza el role a minúsculas y marca autenticado', () => {
    useAuthStore.getState().setUser(baseUser, 'tok', true)
    const { user, isAuthenticated } = useAuthStore.getState()
    expect(user?.role).toBe('admin')
    expect(isAuthenticated).toBe(true)
    expect(initForUser).toHaveBeenCalledWith(7)
  })

  it('setUser sin remember explícito respeta el valor previamente recordado', () => {
    localStorage.setItem(REMEMBER_KEY, '1')
    useAuthStore.getState().setUser(baseUser, 'tok-remember')
    expect(getStoredToken()).toBe('tok-remember')
    expect(localStorage.getItem(REMEMBER_KEY)).toBe('1')
  })

  it('can() refleja los permisos del usuario', () => {
    useAuthStore.getState().setUser(baseUser, 'tok', true)
    expect(useAuthStore.getState().can('productos:read')).toBe(true)
    expect(useAuthStore.getState().can('admin:superpower')).toBe(false)
  })

  it('can() es false sin usuario', () => {
    expect(useAuthStore.getState().can('productos:read')).toBe(false)
  })

  it('updateUser fusiona parcial sobre el usuario actual', () => {
    useAuthStore.getState().setUser(baseUser, 'tok', true)
    useAuthStore.getState().updateUser({ nombre: 'Ana María' })
    expect(useAuthStore.getState().user?.nombre).toBe('Ana María')
    expect(useAuthStore.getState().user?.email).toBe('a@b.co')
  })

  it('updateUser no hace nada sin usuario', () => {
    useAuthStore.getState().updateUser({ nombre: 'X' })
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('clearAuth borra tokens, estado, tema y cache de queries', () => {
    useAuthStore.getState().setUser(baseUser, 'tok', true)
    useAuthStore.getState().clearAuth()
    expect(getStoredToken()).toBeNull()
    expect(localStorage.getItem(REMEMBER_KEY)).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(resetUser).toHaveBeenCalled()
    expect(clear).toHaveBeenCalled()
  })
})
