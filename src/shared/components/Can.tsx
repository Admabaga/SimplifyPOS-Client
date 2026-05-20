import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth'

interface Props {
  permission: string | string[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Renderiza `children` solo si el usuario tiene el permiso.
 * Útil para ocultar botones/acciones según rol.
 */
export default function Can({ permission, fallback = null, children }: Props) {
  const can = useAuthStore((s) => s.can)
  const perms = Array.isArray(permission) ? permission : [permission]
  const allowed = perms.some((p) => can(p))
  return allowed ? <>{children}</> : <>{fallback}</>
}
