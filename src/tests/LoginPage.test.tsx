import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '@/features/auth/LoginPage'

// Mock de módulos externos
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/auth/api', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (s: { setUser: () => void; isAuthenticated: boolean }) => unknown) =>
    selector({ setUser: vi.fn(), isAuthenticated: false }),
}))

// Importamos DESPUÉS del mock para obtener la referencia mockeada
import { authApi } from '@/features/auth/api'
import toast from 'react-hot-toast'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.mocked(authApi.login).mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
  })

  it('renderiza el formulario de login', () => {
    renderLogin()
    expect(screen.getAllByText('Iniciar sesión').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText('usuario@empresa.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('muestra error de validación si el email está vacío', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))
    await waitFor(() => {
      expect(screen.getByText(/correo/i)).toBeInTheDocument()
    })
  })

  it('llama authApi.login con las credenciales correctas', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user_id: 1,
      email: 'test@test.com',
      nombre: 'Cajero',
      role: 'ADMIN',
      permissions: [],
      must_change_password: false,
      access_token: 'tok123',
    })

    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      })
    })
  })

  it('navega a /dashboard tras login exitoso', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      user_id: 1,
      email: 'admin@pos.com',
      nombre: 'Admin',
      role: 'ADMIN',
      permissions: [],
      must_change_password: false,
      access_token: 'tok456',
    })

    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
      target: { value: 'admin@pos.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('muestra toast.error si las credenciales son incorrectas', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: { data: { detail: 'Credenciales incorrectas' } },
    })

    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), {
      target: { value: 'wrong@email.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciales incorrectas')
    })
  })
})
