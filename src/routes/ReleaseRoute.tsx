/**
 * Guarda de ruta por release.
 *
 * Con el release apagado la ruta no existe: se redirige en vez de mostrar una
 * pantalla vacía o un error. Es el equivalente en la web al 404 que devuelve el
 * backend — llegar por URL a algo apagado no debe dejar al usuario mirando un
 * error que no puede resolver.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useReleases, type ReleaseKey } from '@/shared/hooks/useReleases'
import { Spinner } from '@/shared/components/ui'

export default function ReleaseRoute({
  release,
  redirectTo = '/dashboard',
}: {
  release: ReleaseKey
  /** Adónde mandar si está apagado. Las rutas públicas van al login; las de
   *  dentro de la app, al dashboard. */
  redirectTo?: string
}) {
  const { data, isLoading } = useReleases()

  // Mientras no se sabe, no se decide: redirigir aquí haría que una recarga en
  // la propia página rebotara sin motivo.
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={28} />
      </div>
    )
  }

  return data?.[release]?.web ? <Outlet /> : <Navigate to={redirectTo} replace />
}
