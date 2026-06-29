import { describe, it, expect, beforeEach, vi } from 'vitest'

const { clear } = vi.hoisted(() => ({ clear: vi.fn() }))
vi.mock('@/shared/api/queryClient', () => ({ queryClient: { clear } }))

import { useMasterStore, getActiveTenantId } from '@/stores/master'

describe('master store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useMasterStore.setState({ activeTenantId: null, activeTenantName: null })
    vi.clearAllMocks()
  })

  it('setActiveTenant fija id+nombre y limpia cache al cambiar de tenant', () => {
    useMasterStore.getState().setActiveTenant(5, 'Tienda 5')
    expect(getActiveTenantId()).toBe(5)
    expect(useMasterStore.getState().activeTenantName).toBe('Tienda 5')
    expect(clear).toHaveBeenCalledTimes(1)
  })

  it('setActiveTenant al mismo id NO limpia cache de nuevo', () => {
    useMasterStore.getState().setActiveTenant(5, 'Tienda 5')
    clear.mockClear()
    useMasterStore.getState().setActiveTenant(5, 'Tienda 5 (rename)')
    expect(clear).not.toHaveBeenCalled()
    expect(useMasterStore.getState().activeTenantName).toBe('Tienda 5 (rename)')
  })

  it('clearActiveTenant limpia cache solo si había tenant activo', () => {
    useMasterStore.getState().clearActiveTenant()
    expect(clear).not.toHaveBeenCalled() // no había tenant
    useMasterStore.getState().setActiveTenant(9, 'X')
    clear.mockClear()
    useMasterStore.getState().clearActiveTenant()
    expect(clear).toHaveBeenCalledTimes(1)
    expect(getActiveTenantId()).toBeNull()
  })
})
