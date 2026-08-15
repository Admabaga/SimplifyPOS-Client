import { useEffect, useState } from 'react'
import { useAuthStore, getStoredToken } from '@/stores/auth'
import { restoreSession } from '@/shared/api/client'
import { Spinner } from '@/shared/components/ui'

/**
 * Recupera la sesión al arrancar, antes de renderizar nada que llame a la API.
 *
 * El access token vive solo en memoria, así que una recarga lo pierde. La
 * sesión sigue viva en la cookie httpOnly del refresh: aquí la canjeamos por un
 * token nuevo. Sin este paso la app arrancaba igual, pero todas las peticiones
 * del primer render fallaban con 401 y se reintentaban — ruido, latencia y un
 * parpadeo de pantallas vacías.
 */
export default function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  // Solo hay que esperar si nos creemos autenticados pero no tenemos token.
  const [restaurando, setRestaurando] = useState(() => isAuthenticated && !getStoredToken())

  useEffect(() => {
    if (!restaurando) return
    let cancelado = false
    restoreSession().finally(() => {
      if (!cancelado) setRestaurando(false)
    })
    return () => {
      cancelado = true
    }
  }, [restaurando])

  if (restaurando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50">
        <Spinner size={32} />
      </div>
    )
  }

  return <>{children}</>
}
