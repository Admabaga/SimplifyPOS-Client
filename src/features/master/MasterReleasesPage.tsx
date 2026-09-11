/**
 * Master — Releases
 *
 * La sala de máquinas: qué funcionalidades existen en la plataforma. No es una
 * pantalla de configuración de un negocio, es el interruptor general.
 *
 * Cada release tiene dos interruptores porque encender tiene un orden seguro:
 * primero la API —que no cambia nada de lo que el usuario ve y permite
 * verificar contra datos reales— y después la web. Al apagar, al revés.
 *
 * El estado que hay que poder leer de un vistazo no es "prendido/apagado" sino
 * en cuál de los cuatro cruces está cada release, y sobre todo si está en el
 * peligroso: web sin API, donde la interfaz ofrece algo que el backend
 * rechaza. Ese va en rojo y con su explicación, no con un ícono de alerta.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, EmptyState, PageHeader, Skeleton } from '@/shared/components/ui'
import apiClient from '@/shared/api/client'
import { apiError } from '@/shared/lib/apiError'
import { Papel, Rotulo } from './components/consola'

interface Release {
  clave: string
  nombre: string
  descripcion: string
  que_apaga: string
  riesgo_al_prender: string
  api: boolean
  web: boolean
  completo: boolean
  inconsistente: boolean
  actualizado_at: string | null
  actualizado_por: number | null
}

const releasesApi = {
  listar: () => apiClient.get<Release[]>('/master/releases').then((r) => r.data),
  cambiar: (clave: string, capas: { api?: boolean; web?: boolean }) =>
    apiClient.patch<Release>(`/master/releases/${clave}`, capas).then((r) => r.data),
}

function fechaHora(iso: string | null): string {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Interruptor ──────────────────────────────────────────────────────────────

function Interruptor({
  encendido,
  etiqueta,
  nota,
  onToggle,
  cargando,
}: {
  encendido: boolean
  etiqueta: string
  nota: string
  onToggle: () => void
  cargando: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {etiqueta}
        </p>
        <p className="mt-0.5 text-[11.5px] text-slate-500">{nota}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={encendido}
        aria-label={`${etiqueta}: ${encendido ? 'encendido' : 'apagado'}`}
        disabled={cargando}
        onClick={onToggle}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          encendido ? 'bg-[var(--t-primary)]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            encendido ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

/** Una sola línea que dice en qué cruce está el release. */
function Estado({ r }: { r: Release }) {
  if (r.inconsistente) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-rose-700">
        <AlertCircle size={11} />
        Web sin API
      </span>
    )
  }
  if (r.completo) {
    return (
      <span className="rounded px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] t-bg-lt t-text-dk">
        Activo
      </span>
    )
  }
  if (r.api) {
    return (
      <span className="rounded bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-amber-700">
        Solo API
      </span>
    )
  }
  return (
    <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
      Apagado
    </span>
  )
}

// ─── Ficha de un release ──────────────────────────────────────────────────────

function FichaRelease({ r }: { r: Release }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (capas: { api?: boolean; web?: boolean }) => releasesApi.cambiar(r.clave, capas),
    onSuccess: (actualizado) => {
      qc.invalidateQueries({ queryKey: ['master', 'releases'] })
      qc.invalidateQueries({ queryKey: ['releases'] })
      const capa = actualizado.completo ? 'de punta a punta' : ''
      toast.success(`${actualizado.nombre} actualizado ${capa}`.trim())
    },
    onError: (e) => toast.error(apiError(e)),
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-display text-[17px] font-semibold text-slate-900">{r.nombre}</h3>
        <Estado r={r} />
      </div>
      <p className="text-xs leading-relaxed text-slate-600">{r.descripcion}</p>

      <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
        <Interruptor
          etiqueta="API"
          nota="El backend atiende. Préndelo primero: no cambia nada de lo que se ve."
          encendido={r.api}
          cargando={mutation.isPending}
          onToggle={() => mutation.mutate({ api: !r.api })}
        />
        <Interruptor
          etiqueta="Web"
          nota="La interfaz lo dibuja. Préndelo cuando la API esté verificada."
          encendido={r.web}
          cargando={mutation.isPending}
          onToggle={() => mutation.mutate({ web: !r.web })}
        />
      </div>

      {r.inconsistente && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11.5px] leading-relaxed text-rose-800">
          La web está ofreciendo esta funcionalidad y la API la está rechazando: quien la use va
          a ver un error. Prende la API o apaga la web.
        </p>
      )}

      <div className="mt-4 space-y-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Qué desaparece al apagarlo
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600">{r.que_apaga}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Antes de prenderlo
          </p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600">
            {r.riesgo_al_prender}
          </p>
        </div>
      </div>

      <p className="num mt-4 border-t border-slate-100 pt-3 text-[10.5px] text-slate-400">
        Último cambio: {fechaHora(r.actualizado_at)}
        {r.actualizado_por ? ` · usuario #${r.actualizado_por}` : ''}
      </p>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MasterReleasesPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['master', 'releases'],
    queryFn: releasesApi.listar,
    staleTime: 30_000,
  })

  const activos = (data ?? []).filter((r) => r.completo).length
  const enRiesgo = (data ?? []).filter((r) => r.inconsistente).length

  return (
    <div className="space-y-7">
      <PageHeader
        subtitle="Qué funcionalidades existen en la plataforma, y en qué capa"
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<Loader2 size={13} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
        }
      />

      {isLoading && <Skeleton className="h-64 rounded-xl" />}

      {error != null && (
        <EmptyState
          icon={<AlertCircle size={30} className="text-rose-400" />}
          title="No se pudieron cargar los releases"
          description={apiError(error)}
        />
      )}

      {data && (
        <>
          <Papel className="p-5">
            <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
              <div>
                <p className="num font-display text-[26px] leading-none text-slate-900">
                  {activos}/{data.length}
                </p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Activos de punta a punta
                </p>
              </div>
              {enRiesgo > 0 && (
                <div>
                  <p className="num font-display text-[26px] leading-none text-rose-600">
                    {enRiesgo}
                  </p>
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600">
                    Con la web adelantada a la API
                  </p>
                </div>
              )}
            </div>
          </Papel>

          <div>
            <Rotulo contador={data.length}>Releases</Rotulo>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.map((r) => (
                <FichaRelease key={r.clave} r={r} />
              ))}
            </div>
          </div>

          <p className="border-t border-slate-100 pt-4 text-[10.5px] leading-relaxed text-slate-400">
            El orden seguro para encender es API primero, verificar, y después web; para apagar,
            al revés. Un cambio tarda hasta 30 segundos en propagarse a todos los procesos del
            servidor. Nada de esto afecta al ticket POS: vender, imprimir y cuadrar caja
            funcionan con todos los interruptores abajo.
          </p>
        </>
      )}
    </div>
  )
}
