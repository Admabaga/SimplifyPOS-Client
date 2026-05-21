import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { cajaApi } from '@/features/caja/api'
import { useAuthStore } from '@/stores/auth'

export function useCajaGuard() {
  const userId = useAuthStore((s) => s.user?.id)

  const { data: sesion, isLoading } = useQuery({
    queryKey: ['caja', 'estado', userId],   // aislado por usuario
    queryFn: cajaApi.estado,
    staleTime: 0,                            // siempre fresco — es estado de identidad
    refetchOnMount: 'always',
  })

  const cajaAbierta = sesion?.estado === 'abierta'

  /** Llama esto antes de acciones que requieren caja abierta (pagos, cierres).
   *  Devuelve true si la caja está abierta, false (+ toast) si no.
   *  Si isLoading, muestra toast de espera en vez de bloquear silenciosamente. */
  function requireCaja(accion = 'realizar esta acción'): boolean {
    if (isLoading) {
      toast.loading('Verificando estado de caja...', { id: 'caja-loading', duration: 1500 })
      return false
    }
    if (!cajaAbierta) {
      toast.error(`Debes abrir la caja antes de ${accion}`, { id: 'caja-cerrada' })
      return false
    }
    return true
  }

  return { cajaAbierta, isLoading, requireCaja }
}
