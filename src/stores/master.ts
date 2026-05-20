/**
 * Store para el modo master — permite al master filtrar vistas por tenant.
 * El `activeTenantId` se inyecta en el header X-As-Admin de cada request.
 *
 * Importante: al cambiar de tenant, limpiamos TODO el cache de React Query
 * para que no se muestre data del tenant anterior antes de cargar la nueva.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { queryClient } from '@/shared/api/queryClient'

interface MasterState {
  activeTenantId: number | null
  activeTenantName: string | null
  setActiveTenant: (id: number, nombre: string) => void
  clearActiveTenant: () => void
}

export const useMasterStore = create<MasterState>()(
  persist(
    (set, get) => ({
      activeTenantId: null,
      activeTenantName: null,
      setActiveTenant: (id, nombre) => {
        const previous = get().activeTenantId
        if (previous !== id) {
          // Limpiar TODO el cache para evitar "flash" de data del tenant anterior
          queryClient.clear()
        }
        set({ activeTenantId: id, activeTenantName: nombre })
      },
      clearActiveTenant: () => {
        if (get().activeTenantId !== null) {
          queryClient.clear()
        }
        set({ activeTenantId: null, activeTenantName: null })
      },
    }),
    {
      name: 'simplifypos-master',
      storage: createJSONStorage(() => sessionStorage), // se limpia al cerrar pestaña
    }
  )
)

/** Accessor síncrono para el axios interceptor (fuera de React). */
export function getActiveTenantId(): number | null {
  return useMasterStore.getState().activeTenantId
}
