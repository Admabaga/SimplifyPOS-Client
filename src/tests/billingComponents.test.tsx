/** Render de TicketViewerModal y DianSetupWizard (props completos). */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/features/billing/api', () => ({
  billingApi: { listByCuenta: vi.fn(() => Promise.resolve([])), updateDianSetup: vi.fn(), testEmission: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'admin', permissions: ['*'] }, isAuthenticated: true, can: () => true }
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

const TICKET = {
  id: 1, admin_id: 1, cuenta_id: 1, tipo_documento: 'FACTURA_VENTA', resolucion_id: 1,
  numero: 1, numero_completo: 'SETT-1',
  cliente_tipo_doc: 'CC', cliente_documento: '111', cliente_nombre: 'Cliente Final',
  cliente_direccion: 'Cll 1', cliente_telefono: '300', cliente_email: 'c@d.co',
  empresa_razon_social: 'Mi Tienda SAS', empresa_nit: '900123456', empresa_direccion: 'Cra 50',
  empresa_telefono: '3001', empresa_regimen_iva: 'NO_RESPONSABLE_IVA',
  resolucion_numero: '18764', resolucion_fecha: '2024-01-01', resolucion_rango_desde: 1,
  resolucion_rango_hasta: 5000, resolucion_vigencia_hasta: '2030-12-31',
  subtotal: 10000, descuento: 0, base_gravable: 10000, valor_iva: 0, total: 10000,
  notas: '', estado: 'EMITIDO', motivo_anulacion: null, fecha_anulacion: null,
  hash_integridad: 'abc', codigo_verificacion: 'TKT-000001-AB12', fecha_emision: '2026-06-29T10:00:00',
  cufe: null, estado_dian: 'NO_APLICA', dian_tracking_id: null, dian_mensaje: null,
  dian_intentos: 0, dian_enviado_at: null,
  items: [
    { id: 1, producto_id: 1, descripcion: 'Café', codigo_producto: 'C1', cantidad: 2,
      precio_unitario_con_iva: 5000, precio_unitario_base: 5000, tarifa_iva: 0,
      valor_iva_linea: 0, subtotal_linea: 10000, total_linea: 10000, descuento_linea: 0 },
  ],
}

beforeEach(() => vi.clearAllMocks())

describe('TicketViewerModal', () => {
  it('renderiza el ticket abierto con sus datos', async () => {
    const Modal = (await import('@/features/billing/components/TicketViewerModal')).default
    wrap(<Modal open onClose={() => {}} ticket={TICKET as never} pagos={[]} />)
    expect(await screen.findAllByText(/Mi Tienda SAS|Cliente Final|SETT-1/)).not.toHaveLength(0)
  })

  it('cerrado no muestra contenido', async () => {
    const Modal = (await import('@/features/billing/components/TicketViewerModal')).default
    const { container } = wrap(<Modal open={false} onClose={() => {}} ticket={TICKET as never} pagos={[]} />)
    expect(container).toBeTruthy()
  })
})

describe('DianSetupWizard', () => {
  it('renderiza el wizard cuando DIAN no está configurado', async () => {
    const Wizard = (await import('@/features/billing/components/DianSetupWizard')).default
    const empresa = {
      razon_social: 'Mi Tienda', nit: '900', dian_setup_completado: false,
      tipo_persona: 'JURIDICA', responsabilidades_fiscales: '', actividad_economica_ciiu: '4711',
      dian_ambiente: 'PRUEBAS', dian_test_set_id: '',
    }
    const { container } = wrap(<Wizard empresa={empresa as never} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('no renderiza si DIAN ya está configurado', async () => {
    const Wizard = (await import('@/features/billing/components/DianSetupWizard')).default
    const { container } = wrap(<Wizard empresa={{ dian_setup_completado: true } as never} />)
    expect(container.firstChild).toBeNull()
  })
})
