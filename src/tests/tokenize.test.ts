import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tokenizeCard, cardMeta } from '@/features/subscription/tokenize'
import type { SubscriptionConfig } from '@/features/subscription/types'

const mockCfg = (over: Partial<SubscriptionConfig> = {}): SubscriptionConfig => ({
  provider: 'mock',
  currency: 'COP',
  public_key: '',
  acceptance_token: 'tok',
  ...over,
})

const visa = { number: '4242 4242 4242 4242', holder: ' Ana Pérez ', exp: '12/29', cvc: '123' }

describe('cardMeta', () => {
  it('extrae marca, últimos 4, titular (trim) y vencimiento', () => {
    const m = cardMeta(visa)
    expect(m.brand).toBe('VISA')
    expect(m.last4).toBe('4242')
    expect(m.holder).toBe('Ana Pérez')
    expect(m.exp).toBe('12/29')
  })

  it('marca desconocida cae a CARD y maneja exp corto', () => {
    const m = cardMeta({ number: '0000', holder: 'X', exp: '5', cvc: '1' })
    expect(m.brand).toBe('CARD')
    expect(m.exp).toBe('5')
  })
})

describe('tokenizeCard (mock provider)', () => {
  it('tarjeta normal → tok_test_XXXX', async () => {
    const t = await tokenizeCard(mockCfg(), visa)
    expect(t).toBe('tok_test_4242')
  })

  it('tarjeta 4111… → token de rechazo', async () => {
    const t = await tokenizeCard(mockCfg(), { ...visa, number: '4111 1111 1111 1111' })
    expect(t).toBe('tok_decline_1111')
  })

  it('sin número usa 4242 por defecto', async () => {
    const t = await tokenizeCard(mockCfg(), { ...visa, number: '' })
    expect(t).toBe('tok_test_4242')
  })
})

describe('tokenizeCard (wompi provider)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('POST a sandbox con llave pub_test y devuelve el id del token', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'tok_live_99' } }) })
    const t = await tokenizeCard(mockCfg({ provider: 'wompi', public_key: 'pub_test_abc' }), visa)
    expect(t).toBe('tok_live_99')
    const url = fetchMock.mock.calls[0]![0] as string
    expect(url).toContain('sandbox.wompi.co')
  })

  it('usa production cuando la llave es pub_prod_', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'x' } }) })
    await tokenizeCard(mockCfg({ provider: 'wompi', public_key: 'pub_prod_abc' }), visa)
    expect(fetchMock.mock.calls[0]![0]).toContain('production.wompi.co')
  })

  it('lanza error legible si Wompi rechaza la tarjeta', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { messages: ['número inválido'] } }),
    })
    await expect(
      tokenizeCard(mockCfg({ provider: 'wompi', public_key: 'pub_test_abc' }), visa),
    ).rejects.toThrow(/inválido/)
  })
})
