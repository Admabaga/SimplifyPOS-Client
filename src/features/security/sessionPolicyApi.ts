import { useQuery } from '@tanstack/react-query'
import apiClient from '@/shared/api/client'
import { useAuthStore } from '@/stores/auth'

/** Política de sesión efectiva del negocio (la fija el master por cliente). */
export interface SessionPolicy {
  /** Minutos de inactividad antes de cerrar sesión. 0 = sin bloqueo. */
  idle_timeout_min: number
  /** Minutos de vida del token de sesión. El front no lo usa: lo aplica el servidor. */
  session_timeout_min: number
  idle_desactivado: boolean
  /** false = el negocio hereda los valores del sistema. */
  personalizada: boolean
  idle_por_defecto: number
  sesion_por_defecto: number
}

export const sessionPolicyApi = {
  get: (): Promise<SessionPolicy> =>
    apiClient.get<SessionPolicy>('/security/session-policy').then((r) => r.data),

  /** Solo master, sobre el negocio activo (cabecera X-As-Admin). */
  update: (body: {
    idle_timeout_min: number | null
    session_timeout_min: number | null
  }): Promise<SessionPolicy> =>
    apiClient.put<SessionPolicy>('/security/session-policy', body).then((r) => r.data),
}

/**
 * Política del negocio en curso.
 *
 * Se consulta una vez por sesión y se cachea: el temporizador de inactividad la
 * necesita en cada render y no tiene sentido volver a pedirla.
 */
export function useSessionPolicy() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['session-policy'],
    queryFn: sessionPolicyApi.get,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}
