/**
 * Padrón de cuentas del Master (Suscripciones).
 *
 * Lo que se cubre es lo único con lógica real de la pantalla: el orden por
 * urgencia. Si un día alguien "arregla" el sort alfabéticamente, el operador
 * deja de ver arriba a quien está bloqueado y no se entera hasta que un
 * cliente llama.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))

const client = {
  get: h.get,
  post: h.post,
  put: h.put,
  patch: vi.fn(),
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

const authState = { user: { id: 1, role: 'master', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign(
    (s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState),
    { getState: () => authState },
  ),
  getStoredToken: () => 'tok',
}))

let siguienteId = 1

function fila(nombre: string, estado: string, extra: Partial<Record<string, unknown>> = {}) {
  return {
    admin_id: siguienteId++,
    admin_email: `${nombre.toLowerCase().replace(/\s/g, '')}@negocio.co`,
    admin_nombre: nombre,
    razon_social: `${nombre} S.A.S.`,
    plan_codigo: 'PRO',
    plan_nombre: 'Pro',
    estado,
    ciclo: 'MENSUAL',
    trial_fin: null,
    periodo_fin: '2026-09-15T00:00:00Z',
    proximo_cobro: '2026-09-15T00:00:00Z',
    documentos_usados: 10,
    documentos_limite: 100,
    excedente_acumulado: 0,
    descuento_proximo_cobro: 0,
    monto_proximo_cobro: 119000,
    tiene_metodo_pago: true,
    metodo_brand: 'VISA',
    metodo_last4: '4242',
    cancel_at_period_end: false,
    created_at: '2026-01-10T00:00:00Z',
    ...extra,
  }
}

/** A propósito en desorden: si el sort no corre, el test lo nota. */
const ROWS = [
  fila('Panadería El Trigal', 'ACTIVE'),
  fila('Bar El Loco', 'SUSPENDED'),
  fila('Tienda La Esquina', 'TRIALING'),
  fila('Minimercado Doña Rosa', 'PAST_DUE'),
]

const METRICS = {
  mrr: 3_240_000, ingresos_mes: 2_890_000, total_tenants: 4,
  por_estado: { ACTIVE: 1, PAST_DUE: 1, SUSPENDED: 1, TRIALING: 1 },
  trials_por_vencer: 1, cobros_aprobados_mes: 18, cobros_rechazados_mes: 3,
  total_rechazado_mes: 267_000, cuentas_bloqueadas: 1, cuentas_en_mora: 1,
}

const MOVIMIENTOS = [{
  id: 1, admin_id: 1, admin_email: 'uno@negocio.co', admin_nombre: 'Bar El Loco',
  monto: 119000, moneda: 'COP', concepto: 'SUSCRIPCION', ciclo: 'MENSUAL',
  estado: 'DECLINED', metodo: 'CARD', mensaje: 'Fondos insuficientes',
  referencia: null, created_at: '2026-08-17T14:30:00Z', finalized_at: null,
}]

const PLANES = [{
  id: 2, codigo: 'PRO', nombre: 'Pro', descripcion: 'El más vendido',
  precio_mensual: 119000, precio_anual: 1190000, limite_documentos_mes: 300,
  precio_excedente: 700, max_usuarios: 5, features: ['pos', 'caja'], activo: true, orden: 2,
}]

beforeEach(() => {
  vi.clearAllMocks()
  h.get.mockImplementation((url: string) => {
    if (url === '/master/subscriptions') return Promise.resolve({ data: ROWS })
    if (url === '/master/subscriptions/metrics') return Promise.resolve({ data: METRICS })
    if (url === '/master/subscriptions/transactions') return Promise.resolve({ data: MOVIMIENTOS })
    if (url === '/master/subscriptions/plans') return Promise.resolve({ data: PLANES })
    return Promise.resolve({ data: [] })
  })
})

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

async function montar() {
  const Page = (await import('@/features/master/MasterSubscriptionsPage')).default
  const utils = wrap(<Page />)
  await screen.findByText('Bar El Loco S.A.S.')
  return utils
}

/** Nombres de los negocios, en el orden en que aparecen en la tabla. */
function ordenEnPantalla(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1) // la cabecera
    .map((tr) => within(tr).getAllByText(/S\.A\.S\./)[0]?.textContent ?? '')
}

describe('Master · Suscripciones', () => {
  it('ordena el padrón por urgencia: bloqueada, mora, prueba y al día', async () => {
    await montar()
    expect(ordenEnPantalla()).toEqual([
      'Bar El Loco S.A.S.',            // SUSPENDED
      'Minimercado Doña Rosa S.A.S.',  // PAST_DUE
      'Tienda La Esquina S.A.S.',      // TRIALING
      'Panadería El Trigal S.A.S.',    // ACTIVE
    ])
  })

  it('el filtro deja sólo las cuentas en mora o bloqueadas', async () => {
    await montar()
    await userEvent.click(screen.getByLabelText(/solo en mora o bloqueadas/i))
    await waitFor(() =>
      expect(ordenEnPantalla()).toEqual([
        'Bar El Loco S.A.S.',
        'Minimercado Doña Rosa S.A.S.',
      ]),
    )
  })

  it('la búsqueda filtra por nombre del negocio', async () => {
    await montar()
    await userEvent.type(screen.getByPlaceholderText(/buscar negocio o correo/i), 'trigal')
    await waitFor(() => expect(ordenEnPantalla()).toEqual(['Panadería El Trigal S.A.S.']))
  })

  it('la pestaña de movimientos muestra el cobro rechazado', async () => {
    await montar()
    await userEvent.click(screen.getByRole('button', { name: /movimientos/i }))
    expect(await screen.findByText('Fondos insuficientes')).toBeInTheDocument()
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
  })

  it('la pestaña de planes abre el editor con el precio actual', async () => {
    await montar()
    await userEvent.click(screen.getByRole('button', { name: /planes/i }))
    expect(await screen.findByDisplayValue('119000')).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre del plan/i)).toHaveValue('Pro')
  })
})
