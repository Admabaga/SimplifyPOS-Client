import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

interface Props {
  /** Si se especifica, el usuario necesita tener al menos uno de estos permisos. */
  permission?: string | string[]
}

export default function ProtectedRoute({ permission }: Props) {
  const { isAuthenticated, can } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission]
    const hasAny = perms.some((p) => can(p))
    if (!hasAny) {
      return <Navigate to="/403" replace />
    }
  }

  return <Outlet />
}
