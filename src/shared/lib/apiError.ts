import type { AxiosError } from 'axios'
import { httpErrorMessage } from '@/shared/api/client'

/**
 * Función única para extraer mensajes de error de la API.
 * Prioridad:
 *  1. data.error   — FastAPI custom handler { error, code }
 *  2. data.detail  — FastAPI HTTPException / validation
 *  3. data.message / data.msg / e.message
 *  4. userMessage  — enriquecido por el interceptor Axios (httpErrorMessage)
 *  5. fallback
 */
export function apiError(err: unknown, fallback = 'Error inesperado'): string {
  if (!err || typeof err !== 'object') return fallback
  const e = err as any
  const data = e?.response?.data

  // 1. FastAPI custom { error: string, code: string }
  if (typeof data?.error === 'string' && data.error.trim()) return data.error

  // 2. FastAPI HTTPException { detail: string } o validation { detail: [{msg}] }
  const detail = data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg

  // 3. Otros formatos comunes del backend
  const msg = data?.message ?? data?.msg
  if (typeof msg === 'string' && msg.trim()) return msg

  // 4. Mensaje enriquecido por el interceptor (network errors, 401 refresh, etc.)
  if (typeof e?.userMessage === 'string' && e.userMessage.trim()) return e.userMessage

  // 5. Error JS nativo (ej. network timeout)
  if (typeof e?.message === 'string' && e.message.trim()) return e.message

  return fallback
}

/**
 * @deprecated Usa `apiError` — esta función queda solo por compatibilidad.
 * getApiErrorMessage usa httpErrorMessage que puede sobreescribir el mensaje real del backend.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    return (error as { userMessage: string }).userMessage
  }
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError
    const status = axiosError.response?.status
    const detail = (axiosError.response?.data as Record<string, unknown> | undefined)?.detail
    return httpErrorMessage(status, typeof detail === 'string' ? detail : undefined)
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
