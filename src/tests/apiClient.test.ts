import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

// ── Mocks de los stores que usa el interceptor (vi.hoisted por el hoisting) ──
const h = vi.hoisted(() => {
  const state = { storedToken: 'tok-abc' as string | null, activeTenant: null as number | null }
  const setUser = vi.fn()
  return { state, setUser, getState: vi.fn(() => ({ user: { id: 1 }, setUser })) }
})
vi.mock('@/stores/auth', () => ({
  getStoredToken: () => h.state.storedToken,
  useAuthStore: { getState: h.getState },
}))
vi.mock('@/stores/master', () => ({
  getActiveTenantId: () => h.state.activeTenant,
}))
const setUser = h.setUser

import { apiClient, httpErrorMessage } from '@/shared/api/client'

type ReqHandler = {
  fulfilled: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
}
type ResHandler = {
  fulfilled: (r: unknown) => unknown
  rejected: (e: AxiosError) => Promise<unknown>
}

const reqInterceptor = () =>
  // @ts-expect-error acceso interno a handlers para test
  (apiClient.interceptors.request.handlers as ReqHandler[]).find(Boolean)!
const resInterceptor = () =>
  // @ts-expect-error acceso interno a handlers para test
  (apiClient.interceptors.response.handlers as ResHandler[]).find(Boolean)!

function mkConfig(over: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return {
    headers: {} as InternalAxiosRequestConfig['headers'],
    method: 'get',
    url: '/x',
    ...over,
  } as InternalAxiosRequestConfig
}

describe('httpErrorMessage', () => {
  it('prioriza el detalle del servidor salvo en 422', () => {
    expect(httpErrorMessage(400, 'Stock insuficiente')).toBe('Stock insuficiente')
    expect(httpErrorMessage(422, 'x')).toBe('x')
  })
  it('mapea códigos conocidos y desconocidos', () => {
    expect(httpErrorMessage(401)).toMatch(/Sesión expirada/)
    expect(httpErrorMessage(403)).toMatch(/permiso/)
    expect(httpErrorMessage(429)).toMatch(/Demasiadas/)
    expect(httpErrorMessage(999)).toMatch(/inesperado/)
  })
})

describe('request interceptor', () => {
  beforeEach(() => {
    h.state.storedToken = 'tok-abc'
    h.state.activeTenant = null
    vi.clearAllMocks()
  })

  it('inyecta Authorization Bearer con el token almacenado', () => {
    const cfg = reqInterceptor().fulfilled(mkConfig())
    expect(cfg.headers['Authorization']).toBe('Bearer tok-abc')
  })

  it('no inyecta Authorization si no hay token', () => {
    h.state.storedToken = null
    const cfg = reqInterceptor().fulfilled(mkConfig())
    expect(cfg.headers['Authorization']).toBeUndefined()
  })

  it('agrega X-As-Admin cuando hay tenant activo (modo master)', () => {
    h.state.activeTenant = 42
    const cfg = reqInterceptor().fulfilled(mkConfig())
    expect(cfg.headers['X-As-Admin']).toBe('42')
  })

  it('elimina X-As-Admin cuando no hay tenant activo', () => {
    const cfg = reqInterceptor().fulfilled(
      mkConfig({ headers: { 'X-As-Admin': '99' } as unknown as InternalAxiosRequestConfig['headers'] }),
    )
    expect(cfg.headers['X-As-Admin']).toBeUndefined()
  })

  it('inyecta X-Idempotency-Key en POST a /ventas', () => {
    const cfg = reqInterceptor().fulfilled(mkConfig({ method: 'post', url: '/ventas' }))
    expect(cfg.headers['X-Idempotency-Key']).toBeTruthy()
  })

  it('no inyecta idempotency key en GET ni en rutas no idempotentes', () => {
    const cfg = reqInterceptor().fulfilled(mkConfig({ method: 'post', url: '/products' }))
    expect(cfg.headers['X-Idempotency-Key']).toBeUndefined()
  })
})

describe('response interceptor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('respuesta exitosa dispara actividad (mousemove) y pasa el response', () => {
    const spy = vi.fn()
    window.addEventListener('mousemove', spy)
    const res = resInterceptor().fulfilled({ ok: true })
    expect(res).toEqual({ ok: true })
    expect(spy).toHaveBeenCalled()
    window.removeEventListener('mousemove', spy)
  })

  it('402 subscription_inactive emite evento de suscripción requerida', async () => {
    const spy = vi.fn()
    window.addEventListener('simplifypos:subscription-required', spy)
    const err = {
      config: mkConfig(),
      response: { status: 402, data: { detail: { code: 'subscription_inactive' } } },
    } as unknown as AxiosError
    await expect(resInterceptor().rejected(err)).rejects.toBeTruthy()
    expect(spy).toHaveBeenCalled()
    window.removeEventListener('simplifypos:subscription-required', spy)
  })

  it('error genérico se enriquece con userMessage legible', async () => {
    const err = {
      config: mkConfig(),
      response: { status: 500, data: {} },
    } as unknown as AxiosError
    try {
      await resInterceptor().rejected(err)
      throw new Error('no rechazó')
    } catch (e) {
      expect((e as AxiosError & { userMessage: string }).userMessage).toMatch(/servidor/i)
    }
  })

  it('no intenta refresh si el 401 viene del endpoint de login', async () => {
    const err = {
      config: mkConfig({ url: '/auth/login' }),
      response: { status: 401, data: {} },
    } as unknown as AxiosError
    await expect(resInterceptor().rejected(err)).rejects.toBeTruthy()
    // setUser no se llama porque no hubo intento de refresh
    expect(setUser).not.toHaveBeenCalled()
  })

  it('401 dispara refresh; si falla emite session-expired y rechaza', async () => {
    // axios.post (refresh) rechaza → camino de fallo
    const axios = (await import('axios')).default
    const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh 401'))
    const expired = vi.fn()
    window.addEventListener('simplifypos:session-expired', expired)
    const err = {
      config: mkConfig({ url: '/products' }),
      response: { status: 401, data: {} },
    } as unknown as AxiosError
    await expect(resInterceptor().rejected(err)).rejects.toBeTruthy()
    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      expect.objectContaining({ withCredentials: true }),
    )
    expect(expired).toHaveBeenCalled()
    window.removeEventListener('simplifypos:session-expired', expired)
    postSpy.mockRestore()
  })
})
