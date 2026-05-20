/**
 * Singleton del QueryClient.
 *
 * Estrategia anti-"flash de data vieja":
 *  - staleTime: 0  → toda data se considera stale inmediatamente al montar
 *  - refetchOnMount: 'always'  → siempre refetchea al navegar a la página
 *  - El usuario ve loading en vez de data de un tenant anterior o un estado obsoleto
 *
 * Para listas donde sí queremos cache (catálogos estables como categorías,
 * permisos, roles), se sobrescribe a nivel de useQuery con un staleTime mayor.
 */
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                  // siempre stale → refetch al montar
      refetchOnMount: 'always',      // garantiza data fresca al entrar a la página
      refetchOnWindowFocus: false,   // pero no spam al cambiar de pestaña
      retry: 1,
      // No mostrar data vieja mientras se refetchea — fuerza loading state.
      // (Si una query quiere comportamiento contrario, sobrescribe placeholderData)
    },
  },
})
