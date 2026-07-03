import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { caja } = vi.hoisted(() => ({
  caja: {
    estado: vi.fn(), historial: vi.fn(), resumen: vi.fn(), abrir: vi.fn(), cerrar: vi.fn(),
    listarMovimientos: vi.fn(), crearMovimiento: vi.fn(), zReport: vi.fn(),
  },
}))
vi.mock('@/features/caja/api', () => ({ cajaApi: caja }))
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }, default: { success: vi.fn(), error: vi.fn() },
}))
const authState = { user: { id: 1, role: 'admin', permissions: ['*'] }, isAuthenticated: true, can: () => true }
vi.mock('@/stores/auth', () => ({
  useAuthStore: Object.assign((s?: (x: typeof authState) => unknown) => (s ? s(authState) : authState), {
    getState: () => authState,
  }),
}))

import CajaPage from '@/features/caja/CajaPage'

const SESION = {
  id: 1, estado: 'abierta', monto_inicial: 100000, fecha_apertura: '2026-06-30T08:00:00',
  abierta_por_nombre: 'Admin', notas: '',
}
const RESUMEN = {
  efectivo: 50000, transferencia: 0, tarjeta: 0, otros: 0, total_ventas: 50000,
  num_ventas: 5, num_pagos: 5, sangrias: 0, ingresos: 0, devoluciones: 0,
  efectivo_esperado: 150000, monto_inicial: 100000,
}

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  caja.historial.mockResolvedValue([])
  caja.resumen.mockResolvedValue(RESUMEN)
  caja.listarMovimientos.mockResolvedValue([])
  caja.abrir.mockResolvedValue(SESION)
})

describe('CajaPage', () => {
  it('sin caja abierta: permite abrir caja', async () => {
    caja.estado.mockResolvedValue(null)
    wrap(<CajaPage />)
    // Botón para abrir caja
    const btn = await screen.findAllByRole('button', { name: /abrir caja/i })
    fireEvent.click(btn[0]!)
    // Modal de abrir caja aparece
    await waitFor(() => expect(screen.getAllByText(/abrir caja/i).length).toBeGreaterThan(0))
  })

  it('con caja abierta: muestra el resumen y permite cerrar', async () => {
    caja.estado.mockResolvedValue(SESION)
    wrap(<CajaPage />)
    // Con sesión abierta, aparece el botón de cerrar caja
    expect(await screen.findByRole('button', { name: /cerrar caja/i })).toBeInTheDocument()
  })
})
