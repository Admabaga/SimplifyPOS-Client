/**
 * Releases — qué funcionalidades existen en esta instalación.
 *
 * Cada release tiene dos interruptores, api y web, y esta capa mira **solo el
 * de web**: es el que dice si la interfaz debe dibujar algo. El de api es del
 * backend, y se prende primero para poder verificar sin que nadie tropiece con
 * la funcionalidad a medias.
 *
 * Mientras la consulta está en vuelo se responde `false`. Es deliberado:
 * aparecer y desaparecer es peor que tardar un instante en aparecer, sobre
 * todo en la barra lateral.
 */
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/shared/api/client'

export type ReleaseKey = 'facturacion_electronica' | 'suscripciones_saas'

export interface ReleaseCapas {
  api: boolean
  web: boolean
}

export type EstadoReleases = Record<string, ReleaseCapas>

const APAGADO: ReleaseCapas = { api: false, web: false }

export function useReleases() {
  return useQuery({
    queryKey: ['releases'],
    queryFn: async (): Promise<EstadoReleases> => {
      const { data } = await apiClient.get<EstadoReleases>('/releases')
      return data
    },
    // El endpoint es público: la pantalla de login y la de planes también
    // necesitan saber qué existe antes de que nadie haya entrado.
    // Cambian una vez al mes; no tiene sentido repreguntar en cada navegación.
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** Si la interfaz debe dibujar la funcionalidad. */
export function useRelease(clave: ReleaseKey): boolean {
  const { data } = useReleases()
  return (data?.[clave] ?? APAGADO).web
}

/** Estado completo de un release, para el panel Master. */
export function useReleaseCapas(clave: ReleaseKey): ReleaseCapas {
  const { data } = useReleases()
  return data?.[clave] ?? APAGADO
}
