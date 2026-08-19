/**
 * Master · Inteligencia — los tres estados por los que pasa cada asesor.
 *
 * Interesa sobre todo que el análisis guardado se pinte al montar (es lo que
 * evita quemar tokens de Anthropic en cada visita) y que un fallo de Claude se
 * vea como fallo y no como pantalla vacía.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ posAdvisor: vi.fn(), marketing: vi.fn(), analytics: vi.fn() }))

vi.mock('@/shared/api/aiApi', () => ({ aiApi: { posAdvisor: h.posAdvisor, marketing: h.marketing } }))
vi.mock('@/features/master/api', () => ({ masterApi: { analytics: h.analytics } }))

const authState = { user: { id: 1, role: 'master', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign(
    (s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState),
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

async function montar() {
  const Page = (await import('@/features/master/MasterAIPage')).default
  return wrap(<Page />)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  h.analytics.mockResolvedValue({ tenants: { total: 4 } })
})

describe('Master · Inteligencia', () => {
  it('sin análisis previo invita a generarlo', async () => {
    await montar()
    expect(screen.getByText(/¿qué está pasando hoy en la plataforma\?/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /analizar ecosistema/i })).toBeEnabled()
  })

  it('pinta el análisis guardado en localStorage sin volver a llamar a Claude', async () => {
    localStorage.setItem(
      'master_ai_pos_advisor_v1',
      JSON.stringify({ analysis: '## Diagnóstico\n- La cartera creció 12%', generated_at: new Date().toISOString() }),
    )
    await montar()
    expect(await screen.findByText('Diagnóstico')).toBeInTheDocument()
    expect(screen.getByText('La cartera creció 12%')).toBeInTheDocument()
    expect(h.posAdvisor).not.toHaveBeenCalled()
  })

  it('guarda y muestra el análisis que devuelve Claude', async () => {
    h.posAdvisor.mockResolvedValue({ analysis: '## Resumen\nTodo en orden.' })
    await montar()
    await userEvent.click(screen.getByRole('button', { name: /analizar ecosistema/i }))
    expect(await screen.findByText('Todo en orden.')).toBeInTheDocument()
    expect(localStorage.getItem('master_ai_pos_advisor_v1')).toContain('Todo en orden.')
  })

  it('un fallo de Claude se ve como fallo, con el detalle del servidor', async () => {
    h.posAdvisor.mockRejectedValue({ response: { data: { detail: 'ANTHROPIC_API_KEY no configurada' } } })
    await montar()
    await userEvent.click(screen.getByRole('button', { name: /analizar ecosistema/i }))
    expect(await screen.findByText(/no se pudo conectar con claude/i)).toBeInTheDocument()
    expect(screen.getByText('ANTHROPIC_API_KEY no configurada')).toBeInTheDocument()
  })

  it('la estrategia de marketing espera a que carguen las métricas', async () => {
    h.analytics.mockReturnValue(new Promise(() => {})) // nunca resuelve
    await montar()
    expect(screen.getByRole('button', { name: /cargando datos/i })).toBeDisabled()
  })
})
