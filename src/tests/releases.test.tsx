/**
 * Releases en la web.
 *
 * Lo que se prueba es la promesa del interruptor: con la capa web apagada la
 * funcionalidad no se dibuja, y con ella prendida sí. Y por encima de todo, que
 * el POS no dependa de ningún release.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))

const client = {
  get: h.get,
  patch: h.patch,
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: {} },
  interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
}
vi.mock('@/shared/api/client', () => ({
  default: client,
  apiClient: client,
  httpErrorMessage: () => 'error',
}))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}))

const authState = {
  user: { id: 1, role: 'master', permissions: ['*'] },
  isAuthenticated: true,
  can: () => true,
}
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

const RELEASES = [
  {
    clave: 'facturacion_electronica',
    nombre: 'Facturación electrónica DIAN',
    descripcion: 'Transmisión de documentos a la DIAN.',
    que_apaga: 'Los endpoints DIAN y su interfaz.',
    riesgo_al_prender: 'Requiere credenciales del proveedor.',
    api: false,
    web: false,
    completo: false,
    inconsistente: false,
    actualizado_at: null,
    actualizado_por: null,
  },
  {
    clave: 'suscripciones_saas',
    nombre: 'Suscripciones y cobro SaaS',
    descripcion: 'Planes y cobro automático.',
    que_apaga: 'El bloqueo por suscripción vencida.',
    riesgo_al_prender: 'Empieza a bloquear negocios en mora.',
    api: true,
    web: false,
    completo: false,
    inconsistente: false,
    actualizado_at: '2026-09-01T10:00:00Z',
    actualizado_por: 1,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  h.get.mockImplementation((url: string) => {
    if (url === '/master/releases') return Promise.resolve({ data: RELEASES })
    if (url === '/releases')
      return Promise.resolve({
        data: {
          facturacion_electronica: { api: false, web: false },
          suscripciones_saas: { api: true, web: false },
        },
      })
    return Promise.resolve({ data: [] })
  })
  h.patch.mockResolvedValue({ data: { ...RELEASES[0], api: true, nombre: RELEASES[0]!.nombre } })
})

describe('Master · Releases', () => {
  it('muestra cada release con sus dos interruptores', async () => {
    const Page = (await import('@/features/master/MasterReleasesPage')).default
    wrap(<Page />)

    expect(await screen.findByText('Facturación electrónica DIAN')).toBeInTheDocument()
    expect(screen.getByText('Suscripciones y cobro SaaS')).toBeInTheDocument()

    // Dos interruptores por release: API y web.
    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(4)
  })

  it('distingue apagado de encendido solo en la API', async () => {
    const Page = (await import('@/features/master/MasterReleasesPage')).default
    wrap(<Page />)

    await screen.findByText('Facturación electrónica DIAN')
    expect(screen.getByText('Apagado')).toBeInTheDocument()
    expect(screen.getByText('Solo API')).toBeInTheDocument()
  })

  it('prender la API manda solo esa capa, sin arrastrar la web', async () => {
    const Page = (await import('@/features/master/MasterReleasesPage')).default
    wrap(<Page />)

    await screen.findByText('Facturación electrónica DIAN')
    const apiSwitch = screen.getAllByRole('switch')[0]!
    await userEvent.click(apiSwitch)

    await waitFor(() =>
      expect(h.patch).toHaveBeenCalledWith('/master/releases/facturacion_electronica', {
        api: true,
      }),
    )
  })

  it('avisa cuando la web va adelantada a la API', async () => {
    h.get.mockImplementation((url: string) =>
      url === '/master/releases'
        ? Promise.resolve({
            data: [{ ...RELEASES[0], api: false, web: true, inconsistente: true }],
          })
        : Promise.resolve({ data: [] }),
    )
    const Page = (await import('@/features/master/MasterReleasesPage')).default
    wrap(<Page />)

    expect(await screen.findByText('Web sin API')).toBeInTheDocument()
    expect(
      screen.getByText(/la web está ofreciendo esta funcionalidad y la api la está rechazando/i),
    ).toBeInTheDocument()
  })
})

describe('Releases · lo que la web esconde', () => {
  it('el login no ofrece planes si las suscripciones están apagadas', async () => {
    const LoginPage = (await import('@/features/auth/LoginPage')).default
    wrap(<LoginPage />)

    await waitFor(() => expect(h.get).toHaveBeenCalledWith('/releases'))
    await waitFor(() =>
      expect(screen.queryByText(/mira nuestros planes/i)).not.toBeInTheDocument(),
    )
    expect(screen.queryByText(/¿no tienes cuenta\?/i)).not.toBeInTheDocument()
  })

  it('y sí lo ofrece cuando están publicadas', async () => {
    h.get.mockImplementation((url: string) =>
      url === '/releases'
        ? Promise.resolve({
            data: {
              facturacion_electronica: { api: false, web: false },
              suscripciones_saas: { api: true, web: true },
            },
          })
        : Promise.resolve({ data: [] }),
    )
    const LoginPage = (await import('@/features/auth/LoginPage')).default
    wrap(<LoginPage />)

    expect(await screen.findByText(/mira nuestros planes/i)).toBeInTheDocument()
  })

  it('el hook responde apagado mientras no ha cargado', async () => {
    const { useRelease } = await import('@/shared/hooks/useReleases')
    const { renderHook } = await import('@testing-library/react')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useRelease('facturacion_electronica'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    })

    // Aparecer y desaparecer es peor que tardar un instante en aparecer.
    expect(result.current).toBe(false)
  })

  it('el hook mira la capa web, no la de API', async () => {
    const { useRelease } = await import('@/shared/hooks/useReleases')
    const { renderHook } = await import('@testing-library/react')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useRelease('suscripciones_saas'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    })

    // suscripciones_saas viene con api:true y web:false — la UI no debe dibujarlo.
    await waitFor(() => expect(h.get).toHaveBeenCalledWith('/releases'))
    await waitFor(() => expect(result.current).toBe(false))
  })
})
