/** LogoUploader — subida del logo del comercio. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const getLogo = vi.fn()
const uploadLogo = vi.fn()
const deleteLogo = vi.fn()

vi.mock('@/features/billing/api', () => ({
  billingApi: {
    getLogo: (...a: unknown[]) => getLogo(...a),
    uploadLogo: (...a: unknown[]) => uploadLogo(...a),
    deleteLogo: (...a: unknown[]) => deleteLogo(...a),
  },
}))

const toastError = vi.fn()
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a) },
  default: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a) },
}))

import LogoUploader from '@/features/billing/components/LogoUploader'

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>)
}

const LOGO = {
  data_uri: 'data:image/png;base64,AAAA',
  data_uri_mono: 'data:image/png;base64,BBBB',
  ancho: 400,
  alto: 200,
  actualizado_at: '2026-08-16T10:00:00Z',
}

beforeEach(() => {
  getLogo.mockReset().mockResolvedValue(null)
  uploadLogo.mockReset().mockResolvedValue(LOGO)
  deleteLogo.mockReset().mockResolvedValue(undefined)
  toastError.mockReset()
})

describe('LogoUploader', () => {
  it('sin logo invita a subir uno y no ofrece quitarlo', async () => {
    wrap(<LogoUploader />)
    expect(await screen.findByText(/arrastra tu logo/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument()
  })

  it('muestra la vista previa del ticket con el nombre del negocio', async () => {
    wrap(<LogoUploader nombreNegocio="Bar El Loco" />)
    expect(await screen.findByText('Bar El Loco')).toBeInTheDocument()
  })

  it('con logo muestra las dos variantes: color y térmica', async () => {
    getLogo.mockResolvedValue(LOGO)
    wrap(<LogoUploader />)

    const color = await screen.findByAltText('Logo del negocio')
    expect(color).toHaveAttribute('src', LOGO.data_uri)

    // La previsualización del ticket usa la monocroma, no la de color: es la
    // que muestra de verdad cómo va a salir en el papel.
    const imgs = screen.getAllByRole('presentation', { hidden: true })
    expect(imgs.some((i) => i.getAttribute('src') === LOGO.data_uri_mono)).toBe(true)
  })

  it('sube el archivo elegido', async () => {
    const user = userEvent.setup()
    const { container } = wrap(<LogoUploader />)
    await screen.findByText(/arrastra tu logo/i)

    const file = new File(['x'], 'logo.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => expect(uploadLogo).toHaveBeenCalledTimes(1))
    expect(uploadLogo.mock.calls[0]?.[0]).toMatchObject({ name: 'logo.png', type: 'image/png' })
  })

  it('rechaza en el cliente un archivo por encima del tope sin llamar al API', async () => {
    const user = userEvent.setup()
    const { container } = wrap(<LogoUploader />)
    await screen.findByText(/arrastra tu logo/i)

    const grande = new File([new Uint8Array(4 * 1024 * 1024)], 'grande.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, grande)

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(uploadLogo).not.toHaveBeenCalled()
  })

  it('pide confirmación antes de quitar el logo', async () => {
    const user = userEvent.setup()
    getLogo.mockResolvedValue(LOGO)
    wrap(<LogoUploader />)

    await user.click(await screen.findByRole('button', { name: /quitar/i }))
    expect(await screen.findByText(/¿quitar el logo\?/i)).toBeInTheDocument()
    expect(deleteLogo).not.toHaveBeenCalled()
  })
})
