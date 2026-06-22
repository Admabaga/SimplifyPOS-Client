import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getStoredToken } from '@/stores/auth'
import { getActiveTenantId } from '@/stores/master'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// Mensajes de error por código HTTP
export function httpErrorMessage(status: number | undefined, serverDetail?: string): string {
  if (serverDetail && status !== 422) return serverDetail
  switch (status) {
    case 400: return 'Datos inválidos. Revisa los campos.'
    case 401: return 'Sesión expirada. Inicia sesión nuevamente.'
    case 403: return 'No tienes permiso para esta acción.'
    case 404: return 'El recurso no existe o fue eliminado.'
    case 409: return 'Conflicto de datos. Recarga e intenta de nuevo.'
    case 422: return serverDetail ?? 'Hay campos con errores de validación.'
    case 429: return 'Demasiadas solicitudes. Espera un momento.'
    case 500: return 'Error interno del servidor. Intenta más tarde.'
    case 502: return 'Servidor no disponible. Intenta más tarde.'
    case 503: return 'Servicio temporalmente no disponible.'
    case 504: return 'El servidor tardó demasiado. Intenta de nuevo.'
    default:  return 'Ocurrió un error inesperado.'
  }
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000, // 15 s — evita requests colgados
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // envía la cookie httpOnly del refresh token
})

// ─── Request interceptor: inyecta Bearer token + Idempotency-Key ─────────────

// Rutas que el backend exige X-Idempotency-Key (debe coincidir con middleware)
const _IDEMPOTENT_FRAGMENTS = ['/ventas', '/pagos']

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  // Modo master: inyecta X-As-Admin para filtrar por tenant activo
  const tenantId = getActiveTenantId()
  if (tenantId !== null) {
    config.headers['X-As-Admin'] = String(tenantId)
  } else {
    delete config.headers['X-As-Admin']
  }

  // Inyecta idempotency key en POST que lo requieran (solo si no viene ya)
  if (
    config.method?.toUpperCase() === 'POST' &&
    _IDEMPOTENT_FRAGMENTS.some((f) => config.url?.includes(f)) &&
    !config.headers['X-Idempotency-Key']
  ) {
    config.headers['X-Idempotency-Key'] = crypto.randomUUID()
  }

  return config
})

// ─── Response interceptor: refresca token si expira ──────────────────────────

let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token as string)
  })
  pendingQueue = []
}

// Enriquece el error con un mensaje legible antes de rechazar
function enrichError(error: AxiosError): AxiosError {
  const status  = error.response?.status
  const detail  = (error.response?.data as Record<string, unknown> | undefined)?.detail
  const message = httpErrorMessage(status, typeof detail === 'string' ? detail : undefined)
  ;(error as AxiosError & { userMessage: string }).userMessage = message
  return error
}

apiClient.interceptors.response.use(
  (response) => {
    // Cualquier respuesta exitosa cuenta como actividad — resetea el idle timer
    window.dispatchEvent(new Event('mousemove'))
    return response
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
      _retryCount?: number
    }

    // ── 402: suscripción inactiva (impago) → avisar al SubscriptionGate ─────
    if (error.response?.status === 402) {
      const detail = (error.response?.data as { detail?: { code?: string } } | undefined)?.detail
      if (detail?.code === 'subscription_inactive') {
        window.dispatchEvent(new CustomEvent('simplifypos:subscription-required'))
      }
      return Promise.reject(enrichError(error))
    }

    // ── Retry automático en 503 / 504 (servidor no disponible o timeout) ───
    const retryableStatuses = [503, 504]
    const maxRetries = 2
    if (
      retryableStatuses.includes(error.response?.status ?? 0) &&
      (original._retryCount ?? 0) < maxRetries
    ) {
      original._retryCount = (original._retryCount ?? 0) + 1
      await new Promise((r) => setTimeout(r, 500 * original._retryCount!))
      return apiClient(original)
    }

    // ── Token refresh en 401 ────────────────────────────────────────────────
    // No intentar refresh si el error viene del propio endpoint de login
    const isAuthEndpoint = original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`
          return apiClient(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post<{ access_token: string }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = data.access_token

        // Guardar el nuevo token donde corresponda (respeta rememberMe)
        const { useAuthStore } = await import('@/stores/auth')
        const { user } = useAuthStore.getState()
        if (user) {
          useAuthStore.getState().setUser(user, newToken)
        }

        apiClient.defaults.headers['Authorization'] = `Bearer ${newToken}`
        processQueue(null, newToken)
        original.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Emitir evento de sesión expirada en lugar de redirigir duro
        window.dispatchEvent(new CustomEvent('simplifypos:session-expired'))
        return Promise.reject(enrichError(error))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(enrichError(error))
  }
)

export default apiClient
