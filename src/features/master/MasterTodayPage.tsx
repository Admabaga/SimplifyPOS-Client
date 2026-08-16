/**
 * Master — "Mi día"
 *
 * Esta página responde una sola pregunta: ¿a quién llamo hoy y por qué?
 *
 * La versión anterior mostraba el mismo negocio hasta dos veces —una en la
 * lista de alertas y otra en las tarjetas agrupadas por nivel— y abría con
 * cuatro tarjetas de conteo que no dicen qué hacer. Aquí hay UNA cola
 * ordenada por urgencia, y los negocios estables quedan plegados: no
 * necesitan tiempo del founder, sólo la tranquilidad de saber que están ahí.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, Building2, ChevronDown, RefreshCw,
} from 'lucide-react'
import { PageHeader, Button, Spinner, EmptyState } from '@/shared/components/ui'
import { masterApi, type TenantHealth, type HealthLevel } from './api'
import { useMasterStore } from '@/stores/master'
import {
  Cifra, Cifras, Espectro, Marcador, Motivo, NIVEL, Papel, Rotulo,
} from './components/consola'

// ─── Lectura de un negocio ───────────────────────────────────────────────────

/** Traduce los días sin actividad a algo que se lee sin hacer cuentas. */
function haceCuanto(dias: number | null): string {
  if (dias === null) return 'nunca'
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} d`
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`
  return `hace ${Math.floor(dias / 30)} m`
}

function Dato({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {etiqueta}
      </p>
      <p className={`num text-xs mt-0.5 ${alerta ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>
        {valor}
      </p>
    </div>
  )
}

/**
 * Una fila de la cola. No es una tarjeta: es un renglón de un listado de
 * trabajo, y se lee de izquierda a derecha — qué tan mal está, quién es, qué
 * le pasa, qué hago.
 */
function Renglon({ t, onActuar }: { t: TenantHealth; onActuar: () => void }) {
  const motivos = t.reasons
    .filter((r) => r.severity === 'danger' || r.severity === 'warning')
    .slice(0, 4)

  return (
    <li className="group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-slate-50/80">
      <div className="pt-0.5">
        <Marcador score={t.score} nivel={t.level} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{t.nombre}</p>
          <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] ${NIVEL[t.level].texto}`}>
            {NIVEL[t.level].label}
          </span>
        </div>
        <p className="truncate text-[11px] text-slate-400">{t.email}</p>

        {motivos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {motivos.map((r) => (
              <Motivo key={r.key} tono={r.severity === 'danger' ? 'danger' : 'warning'}>
                {r.label}
              </Motivo>
            ))}
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4 sm:max-w-lg">
          <Dato
            etiqueta="Último ingreso"
            valor={haceCuanto(t.days_since_login)}
            alerta={t.days_since_login === null || t.days_since_login > 7}
          />
          <Dato
            etiqueta="Última venta"
            valor={haceCuanto(t.days_since_sale)}
            alerta={t.days_since_sale === null || t.days_since_sale > 3}
          />
          <Dato etiqueta="Caja hoy" valor={t.caja_today ? 'abierta' : 'sin abrir'} alerta={!t.caja_today} />
          <Dato
            etiqueta="Fiados vencidos"
            valor={String(t.cuentas_morosas_30d)}
            alerta={t.cuentas_morosas_30d > 0}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onActuar}
        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900"
      >
        Entrar
        <ArrowRight size={12} />
      </button>
    </li>
  )
}

/** Los estables van plegados: existen, pero no piden nada. */
function Estables({ lista, onActuar }: { lista: TenantHealth[]; onActuar: (t: TenantHealth) => void }) {
  const [abierto, setAbierto] = useState(false)
  if (lista.length === 0) return null

  return (
    <div>
      <Rotulo contador={lista.length}>Estables</Rotulo>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex -space-x-0.5">
          {lista.slice(0, 12).map((t) => (
            <span key={t.admin_id} className="h-5 w-1 rounded-full bg-emerald-400" />
          ))}
        </div>
        <p className="flex-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{lista.length} negocios</span> operando sin
          novedad. No requieren tu tiempo hoy.
        </p>
        <ChevronDown
          size={15}
          className={`text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((t) => (
            <li key={t.admin_id}>
              <button
                type="button"
                onClick={() => onActuar(t)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:border-slate-200 hover:bg-white"
              >
                <span className="num font-display text-[13px] text-emerald-700">{t.score}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{t.nombre}</span>
                <ArrowRight size={11} className="shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function MasterTodayPage() {
  const navigate = useNavigate()
  const { setActiveTenant } = useMasterStore()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['master-health-scores'],
    queryFn: masterApi.healthScores,
    staleTime: 60_000,
  })

  /** La cola: críticos primero y, dentro de cada nivel, el peor score arriba. */
  const cola = useMemo(() => {
    if (!data) return []
    const peso: Record<HealthLevel, number> = { red: 0, yellow: 1, green: 2 }
    return data.tenants
      .filter((t) => t.level !== 'green')
      .sort((a, b) => peso[a.level] - peso[b.level] || a.score - b.score)
  }, [data])

  const estables = useMemo(
    () => (data?.tenants ?? []).filter((t) => t.level === 'green').sort((a, b) => b.score - a.score),
    [data],
  )

  function actuar(t: TenantHealth) {
    setActiveTenant(t.admin_id, t.nombre)
    navigate('/dashboard')
  }

  const encabezado = (
    <PageHeader
      subtitle="A quién llamar hoy, y por qué"
      actions={
        <Button
          size="sm"
          variant="outline"
          icon={<RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />}
          onClick={() => refetch()}
        >
          Actualizar
        </Button>
      }
    />
  )

  if (isLoading) {
    return (
      <div>
        {encabezado}
        <div className="flex justify-center py-16"><Spinner size={30} /></div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div>
        {encabezado}
        <EmptyState
          icon={<AlertCircle size={30} />}
          title="No se pudo cargar"
          description="Reintenta en unos segundos."
        />
      </div>
    )
  }

  const { summary } = data

  if (summary.total === 0) {
    return (
      <div>
        {encabezado}
        <EmptyState
          icon={<Building2 size={30} />}
          title="Sin negocios aún"
          description="A medida que se registren negocios verás aquí su salud."
        />
      </div>
    )
  }

  const puntos = data.tenants.map((t) => ({
    id: t.admin_id,
    nombre: t.nombre,
    score: t.score,
    nivel: t.level,
  }))

  return (
    <div className="space-y-6">
      {encabezado}

      {/* ── El espectro: la forma de la cartera en una sola banda ── */}
      {/* Cifras a la izquierda, espectro llenando lo que sobre: en un monitor
          ancho el panel se lee como la cabecera de un informe, no como una
          columna con aire muerto al costado. */}
      <Papel className="grid gap-6 p-5 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-center xl:gap-8">
        <Cifras>
          <Cifra
            valor={cola.length}
            etiqueta="Piden atención"
            nota={cola.length === 0 ? 'nada pendiente' : `de ${summary.total} negocios`}
            tono={summary.red > 0 ? 'red' : cola.length > 0 ? 'yellow' : 'green'}
          />
          <Cifra valor={summary.red} etiqueta="Críticos" nota="contactar hoy" tono="red" />
          <Cifra valor={summary.yellow} etiqueta="En riesgo" nota="esta semana" tono="yellow" />
          <Cifra valor={summary.green} etiqueta="Estables" tono="green" />
        </Cifras>

        <Espectro
          puntos={puntos}
          onSelect={(id) => {
            const t = data.tenants.find((x) => x.admin_id === id)
            if (t) actuar(t)
          }}
        />
      </Papel>

      {/* ── La cola de trabajo ── */}
      {cola.length > 0 ? (
        <div>
          <Rotulo contador={cola.length}>Tu cola de hoy</Rotulo>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {cola.map((t) => (
                <Renglon key={t.admin_id} t={t} onActuar={() => actuar(t)} />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <Rotulo>Tu cola de hoy</Rotulo>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-8 text-center">
            <p className="font-display text-lg tracking-[-0.02em] text-emerald-900">
              Nada que apagar hoy
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Los {summary.total} negocios están operando. Buen día para construir.
            </p>
          </div>
        </div>
      )}

      <Estables lista={estables} onActuar={actuar} />

      <p className="border-t border-slate-100 pt-4 text-[10.5px] leading-relaxed text-slate-400">
        El score combina ingreso, ventas, apertura de caja, estado DIAN y cobranza. Va de 0 a 100 y
        se recalcula en cada consulta — no es un promedio histórico, es la foto de ahora.
      </p>
    </div>
  )
}
