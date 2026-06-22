import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts'
import * as authStore from '@/stores/auth'

// Mock useAuthStore para controlar isAuthenticated
vi.mock('@/stores/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof authStore>()
  return { ...actual, useAuthStore: vi.fn() }
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function fireKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.mocked(authStore.useAuthStore).mockReturnValue(true)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  )

  it('F2 navega a /accounts', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper })
    fireKey('F2')
    expect(mockNavigate).toHaveBeenCalledWith('/accounts')
  })

  it('F3 navega a /caja', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper })
    fireKey('F3')
    expect(mockNavigate).toHaveBeenCalledWith('/caja')
  })

  it('F1 navega a /dashboard', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper })
    fireKey('F1')
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('no navega si el usuario no está autenticado', () => {
    vi.mocked(authStore.useAuthStore).mockReturnValue(false)
    renderHook(() => useGlobalShortcuts(), { wrapper })
    fireKey('F2')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('no navega si hay un modal abierto', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper })
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.appendChild(dialog)
    fireKey('F2')
    expect(mockNavigate).not.toHaveBeenCalled()
    document.body.removeChild(dialog)
  })

  it('no navega si el foco está en un input', () => {
    renderHook(() => useGlobalShortcuts(), { wrapper })
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireKey('F2')
    expect(mockNavigate).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })
})
