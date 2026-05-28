import { describe, it, expect } from 'vitest'
import { apiError } from '@/shared/lib/apiError'

describe('apiError', () => {
  it('extrae data.error de FastAPI custom handler', () => {
    const err = { response: { data: { error: 'Caja ya abierta', code: 'CAJA_ABIERTA' } } }
    expect(apiError(err)).toBe('Caja ya abierta')
  })

  it('extrae data.detail string de HTTPException', () => {
    const err = { response: { data: { detail: 'No autorizado' } } }
    expect(apiError(err)).toBe('No autorizado')
  })

  it('extrae primer msg de array de validation errors', () => {
    const err = { response: { data: { detail: [{ msg: 'field required' }] } } }
    expect(apiError(err)).toBe('field required')
  })

  it('retorna fallback si el error es null', () => {
    expect(apiError(null)).toBe('Error inesperado')
  })

  it('retorna fallback personalizado', () => {
    expect(apiError(null, 'Algo salió mal')).toBe('Algo salió mal')
  })

  it('extrae userMessage inyectado por interceptor Axios', () => {
    const err = { userMessage: 'Sesión expirada. Inicia sesión nuevamente.' }
    expect(apiError(err)).toBe('Sesión expirada. Inicia sesión nuevamente.')
  })

  it('extrae message nativo de Error JS', () => {
    const err = { message: 'Network Error' }
    expect(apiError(err)).toBe('Network Error')
  })
})
