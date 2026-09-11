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
import { useState } from 'react'
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

/**
 * Un solo interruptor, y dos casillas que eligen sobre qué capas actúa.
 *
 * La alternativa —un interruptor por capa— obliga a pensar en dos cosas a la
 * vez y hace fácil dejar la web encendida con la API apagada sin notarlo. Así
 * la decisión es una sola: "esto va arriba o abajo", y aparte se elige el
 * alcance. Por defecto vienen las dos marcadas, que es lo que se quiere el 90%
 * de las veces; desmarcar una es el gesto deliberado de quien está haciendo un
 * encendido por etapas.
 */
function Interruptor({
  encendido,
  onToggle,
  cargando,
  disabled,
}: {
  encendido: boolean
  onToggle: () => void
  cargando: boolean
  disabled: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={encendido ? 'Apagar release' : 'Encender release'}
      disabled={cargando || disabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        encendido ? 'bg-[var(--t-primary)]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          encendido ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function CasillaCapa({
  etiqueta,
  nota,
  marcada,
  activa,
  onChange,
}: {
  etiqueta: string
  nota: string
  marcada: boolean
  activa: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-2.5 py-2">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={etiqueta}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-[var(--t-primary)]"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {etiqueta}
          </span>
          <span
            className={`text-[9.5px] font-bold uppercase tracking-[0.1em] ${
              activa ? 't-text-dk' : 'text-slate-300'
            }`}
          >
            {activa ? 'activa' : 'apagada'}
          </span>
        </span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-slate-500">{nota}</span>
      </span>
    </label>
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
  // Qué capas toca el interruptor. Las dos por defecto: el encendido por etapas
  // es el caso deliberado, no el habitual.
  const [alcance, setAlcance] = useState({ api: true, web: true })

  const mutation = useMutation({
    mutationFn: (capas: { api?: boolean; web?: boolean }) => releasesApi.cambiar(r.clave, capas),
    onSuccess: (actualizado) => {
      qc.invalidateQueries({ queryKey: ['master', 'releases'] })
      qc.invalidateQueries({ queryKey: ['releases'] })
      toast.success(
        actualizado.completo
          ? `${actualizado.nombre}: activo de punta a punta`
          : `${actualizado.nombre} actualizado`,
      )
    },
    onError: (e) => toast.error(apiError(e)),
  })

  // El interruptor está arriba cuando todas las capas marcadas lo están.
  const capas = [
    { marcada: alcance.api, activa: r.api },
    { marcada: alcance.web, activa: r.web },
  ]
  const marcadas = capas.filter((c) => c.marcada)
  const encendido = marcadas.length > 0 && marcadas.every((c) => c.activa)

  const cambiar = () => {
    const valor = !encendido
    mutation.mutate({
      ...(alcance.api ? { api: valor } : {}),
      ...(alcance.web ? { web: valor } : {}),
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-display text-[17px] font-semibold text-slate-900">{r.nombre}</h3>
        <Estado r={r} />
      </div>
      <p className="text-xs leading-relaxed text-slate-600">{r.descripcion}</p>

      <div className="mt-4 flex items-start gap-5 border-y border-slate-100 py-3">
        <div className="min-w-0 flex-1">
          {mutation.isPending ? (
            <p className="flex items-center gap-2 py-3 text-[11.5px] text-slate-400">
              <Loader2 size={13} className="animate-spin" />
              Aplicando…
            </p>
          ) : (
            <>
              <CasillaCapa
                etiqueta="API"
                nota="El backend atiende. Enciéndela primero: no cambia nada de lo que se ve."
                marcada={alcance.api}
                activa={r.api}
                onChange={(v) => setAlcance((a) => ({ ...a, api: v }))}
              />
              <CasillaCapa
                etiqueta="Web"
                nota="La interfaz lo dibuja. Enciéndela cuando la API esté verificada."
                marcada={alcance.web}
                activa={r.web}
                onChange={(v) => setAlcance((a) => ({ ...a, web: v }))}
              />
            </>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <Interruptor
            encendido={encendido}
            cargando={mutation.isPending}
            disabled={marcadas.length === 0}
            onToggle={cambiar}
          />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
            {marcadas.length === 0 ? 'sin capas' : encendido ? 'encendido' : 'apagado'}
          </span>
        </div>
      </div>

      {marcadas.length === 0 && (
        <p className="mt-3 text-[11.5px] text-slate-400">
          Marca al menos una capa para poder mover el interruptor.
        </p>
      )}

      {r.inconsistente && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11.5px] leading-relaxed text-rose-800">
          La web está ofreciendo esta funcionalidad y la API la está rechazando: quien la use va
          a ver un error. Enciende la API o apaga la web.
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
            Antes de encenderlo
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
