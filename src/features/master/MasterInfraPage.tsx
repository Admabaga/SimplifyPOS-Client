/**
 * Master — Infraestructura
 *
 * La pregunta real de esta pantalla no es "¿qué tan sano está el sistema?"
 * sino "¿cuándo me toca pagar más, y por qué". Por eso desaparece el
 * medidor circular con un 87/100: un número compuesto se ve muy bien y no
 * se puede accionar. En su lugar va una regla de capacidad — dónde está la
 * base hoy, dónde quedan los umbrales que cuestan plata, y en cuántos
 * meses se llega a cada uno al ritmo actual.
 *
 * El resto sigue el lenguaje de la consola: papel, rótulos, cifras.
 */
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Activity, CheckCircle2, ChevronRight, Database, Loader2,
  RefreshCw, Server, Sparkles,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Button, PageHeader, Spinner } from '@/shared/components/ui'
import { infraApi, type InfraMetrics } from './infraApi'
import { Cifra, Cifras, Papel, Rotulo } from './components/consola'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

/** Meses restantes → cuán urgente es. Bajo 3 meses ya es decisión de este trimestre. */
function urgencia(meses: number | null) {
  if (meses === null) return { texto: 'text-slate-400', marca: 'bg-slate-300', label: 'sin proyección' }
  if (meses < 3) return { texto: 'text-rose-700', marca: 'bg-rose-500', label: `~${meses} meses` }
  if (meses < 9) return { texto: 'text-amber-700', marca: 'bg-amber-500', label: `~${meses} meses` }
  return { texto: 'text-emerald-700', marca: 'bg-emerald-500', label: `~${meses} meses` }
}

function Proporcion({ valor, max, tono = 'slate' }: { valor: number; max: number; tono?: 'primary' | 'slate' }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${tono === 'primary' ? 't-bg' : 'bg-slate-400'}`}
        style={{ width: `${max > 0 ? Math.max(2, (valor / max) * 100) : 0}%` }}
      />
    </div>
  )
}

// ─── Regla de capacidad ───────────────────────────────────────────────────────

/**
 * Escala logarítmica de 10 MB a 2 GB con la posición actual marcada y los
 * umbrales que importan. Logarítmica porque los saltos de plan son por
 * órdenes de magnitud: en lineal, 40 MB contra 2 GB se ve pegado al cero y
 * no se distingue nada.
 */
function ReglaDeCapacidad({ m }: { m: InfraMetrics }) {
  const MIN = 10
  const MAX = 2048
  const pos = (mb: number) => {
    const t = (Math.log10(Math.max(mb, MIN)) - Math.log10(MIN)) / (Math.log10(MAX) - Math.log10(MIN))
    return Math.min(100, Math.max(0, t * 100))
  }

  const hitos = [
    { mb: 500, label: '500 MB', meses: m.proyecciones.months_to_500mb },
    { mb: 2048, label: '2 GB', meses: m.proyecciones.months_to_2gb },
  ]
  const actual = m.db.size_mb

  return (
    <div>
      <div className="relative h-14">
        {/* Riel */}
        <div className="absolute inset-x-0 top-7 h-1.5 rounded-full bg-slate-100" />
        {/* Recorrido consumido */}
        <div
          className="t-bg absolute top-7 left-0 h-1.5 rounded-full"
          style={{ width: `${pos(actual)}%` }}
        />

        {/* Umbrales */}
        {hitos.map((h) => (
          <div
            key={h.mb}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pos(h.mb)}%` }}
          >
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {h.label}
            </span>
            <span className="mt-1 h-5 w-px bg-slate-300" />
            <span className={`num mt-1 text-[10px] font-semibold ${urgencia(h.meses).texto}`}>
              {urgencia(h.meses).label}
            </span>
          </div>
        ))}

        {/* Posición actual */}
        <div
          className="absolute top-[18px] flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${pos(actual)}%` }}
        >
          <span className="h-4 w-[3px] rounded-full bg-slate-900" />
          <span className="num mt-1 whitespace-nowrap font-display text-[13px] text-slate-900">
            {actual} MB
          </span>
        </div>
      </div>

      <p className="mt-2 border-t border-slate-100 pt-2 text-[10.5px] text-slate-400">
        Escala logarítmica. La proyección usa el crecimiento del último mes
        (~{m.crecimiento.monthly_growth_mb_estimado} MB/mes): si el ritmo cambia, las fechas
        cambian con él.
      </p>
    </div>
  )
}

// ─── Panel de IA ──────────────────────────────────────────────────────────────

function PanelIA() {
  const [analisis, setAnalisis] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => infraApi.analyze(),
    onSuccess: (data) => setAnalisis(data.analysis),
  })

  return (
    <div>
      <Rotulo
        accion={
          analisis ? (
            <button
              type="button"
              onClick={() => { setAnalisis(null); mutation.mutate() }}
              className="shrink-0 text-[10.5px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Analizar de nuevo
            </button>
          ) : undefined
        }
      >
        Lectura asistida
      </Rotulo>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {!analisis && !mutation.isPending && !mutation.isError && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-800">
                ¿Cuándo toca escalar, y qué exactamente?
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Claude lee las métricas de arriba y devuelve un plan concreto: qué crece más
                rápido, qué umbral se cruza primero y qué señales vigilar.
              </p>
            </div>
            <Button size="sm" icon={<Sparkles size={13} />} onClick={() => mutation.mutate()}>
              Analizar
            </Button>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex items-center gap-3 py-6">
            <Loader2 size={18} className="animate-spin text-slate-400" />
            <p className="text-xs text-slate-500">Leyendo las métricas…</p>
          </div>
        )}

        {mutation.isError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-[13px] font-semibold text-rose-800">No se pudo conectar con Claude</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-rose-700/80">
              {(mutation.error as { response?: { data?: { detail?: string } }; message?: string })
                ?.response?.data?.detail ||
                (mutation.error as Error)?.message ||
                'Error desconocido. Verifica que ANTHROPIC_API_KEY esté configurada.'}
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => mutation.mutate()}>
              Reintentar
            </Button>
          </div>
        )}

        {analisis && (
          <div className="max-w-3xl">
            {analisis.split('\n').map((linea, i) => {
              if (!linea.trim()) return <div key={i} className="h-2" />
              if (linea.startsWith('##')) {
                return (
                  <h3
                    key={i}
                    className="mt-4 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 first:mt-0"
                  >
                    {linea.replace(/^#+\s*/, '')}
                  </h3>
                )
              }
              if (linea.startsWith('-') || linea.startsWith('•')) {
                return (
                  <div key={i} className="mb-1 flex items-start gap-2">
                    <ChevronRight size={11} className="mt-0.5 shrink-0 text-slate-300" />
                    <span className="text-xs leading-relaxed text-slate-600">
                      {linea.replace(/^[-•]\s*/, '')}
                    </span>
                  </div>
                )
              }
              return (
                <p key={i} className="mb-1 text-xs leading-relaxed text-slate-600">{linea}</p>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Cuerpo ───────────────────────────────────────────────────────────────────

function Metricas({ m }: { m: InfraMetrics }) {
  const { db, crecimiento: cr, actividad: act, tenants, salud } = m

  const topTablas = Object.entries(db.tabla_rows).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxTabla = topTablas[0]?.[1] ?? 1

  return (
    <div className="space-y-7">
      <Papel className="p-5">
        <Cifras>
          <Cifra valor={`${db.size_mb} MB`} etiqueta="Tamaño de la base" nota={db.engine} />
          <Cifra
            valor={fmt(db.total_rows, 0)}
            etiqueta="Filas guardadas"
            nota={`crece ~${cr.monthly_growth_mb_estimado} MB al mes`}
          />
          <Cifra
            valor={`${act.peak_eventos_hora}/h`}
            etiqueta="Pico de actividad"
            nota={`promedio ${act.avg_eventos_hora}/h`}
          />
          <Cifra
            valor={String(act.errores_mes)}
            etiqueta="Errores del mes"
            tono={act.errores_mes > 100 ? 'red' : 'neutro'}
            nota="registrados en auditoría"
          />
        </Cifras>
      </Papel>

      {/* ── Cuánto falta para el siguiente plan ── */}
      <div>
        <Rotulo>Cuánto falta para el siguiente escalón</Rotulo>
        <div className="rounded-xl border border-slate-200 bg-white px-5 pb-4 pt-5">
          <ReglaDeCapacidad m={m} />
        </div>
      </div>

      {/* ── Qué está mal ── */}
      <div>
        <Rotulo contador={salud.issues.length || undefined}>Qué requiere mano</Rotulo>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {salud.issues.length === 0 ? (
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <p className="text-xs text-slate-500">
                Nada crítico. El sistema opera dentro de lo esperado.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {salud.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-xs leading-relaxed text-slate-600">{issue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Actividad ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <Rotulo>Actividad mes a mes</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {cr.audit_serie_mensual.length > 0 ? (
              <ResponsiveContainer width="100%" height={175}>
                <LineChart data={cr.audit_serie_mensual} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="ym" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmt(v, 0)}
                    width={34}
                  />
                  <Tooltip formatter={(v) => [fmt(Number(v), 0), 'eventos']} />
                  <Line
                    type="monotone"
                    dataKey="n"
                    stroke="#0f172a"
                    strokeWidth={1.75}
                    dot={{ r: 2.5, fill: '#0f172a', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-xs text-slate-400">Sin datos suficientes</p>
            )}
          </div>
        </div>

        <div>
          <Rotulo>Últimas 24 horas</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {act.ultimas_24h.length > 0 ? (
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={act.ultimas_24h} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="h" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip formatter={(v) => [Number(v), 'eventos']} />
                  <Bar dataKey="n" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-xs text-slate-400">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Crecimiento + carga ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <Rotulo>Ritmo de crecimiento</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <ul className="space-y-4">
              {[
                { label: 'Actividad del sistema', curr: cr.audit_mes_actual, prev: cr.audit_mes_prev, pct: cr.audit_growth_pct },
                { label: 'Ventas registradas', curr: cr.ventas_mes_actual, prev: cr.ventas_mes_prev, pct: cr.ventas_growth_pct },
              ].map(({ label, curr, prev, pct }) => (
                <li key={label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-medium text-slate-700">{label}</span>
                    <span
                      className={`num text-xs font-semibold ${
                        pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
                    </span>
                  </div>
                  <p className="num mt-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{fmt(curr, 0)}</span> este mes ·{' '}
                    {fmt(prev, 0)} el anterior
                  </p>
                  <div className="mt-1.5">
                    <Proporcion valor={curr} max={Math.max(curr, prev, 1)} tono="primary" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <Rotulo contador={tenants.carga_por_tenant.length || undefined}>Quién carga el sistema</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            {tenants.carga_por_tenant.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Sin datos de carga</p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {tenants.carga_por_tenant.slice(0, 6).map((t) => (
                    <li key={t.admin_id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="num text-[11px] text-slate-500">Negocio #{t.admin_id}</span>
                        <span className="num text-xs font-semibold text-slate-900">{t.pct}%</span>
                      </div>
                      <Proporcion valor={t.pct} max={100} />
                    </li>
                  ))}
                </ul>
                {tenants.top_tenant_concentracion_pct > 60 && (
                  <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-amber-700">
                    Un solo negocio genera el {tenants.top_tenant_concentracion_pct}% del tráfico:
                    lo que le pase a él se siente en toda la plataforma.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Dónde está el volumen ── */}
      <div>
        <Rotulo>Dónde está el volumen guardado</Rotulo>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {topTablas.map(([tabla, filas]) => (
              <li key={tabla}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-[11px] text-slate-600">{tabla}</span>
                  <span className="num text-xs font-semibold text-slate-900">{fmt(filas, 0)}</span>
                </div>
                <Proporcion valor={filas} max={maxTabla} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MasterInfraPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['master', 'infra', 'metrics'],
    queryFn: () => infraApi.getMetrics(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return (
    <div className="space-y-7">
      <PageHeader
        subtitle="Qué tan cerca está el sistema de necesitar más músculo"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : data ? (
        <>
          <Metricas m={data} />
          <PanelIA />
          <p className="num flex items-center gap-1.5 border-t border-slate-100 pt-4 text-[10.5px] text-slate-400">
            <Database size={10} />
            Corte: {new Date(data.generated_at).toLocaleString('es-CO')}
            <Activity size={10} className="ml-2" />
            Las métricas se releen cada 2 minutos.
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <Server size={30} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">No se pudieron cargar las métricas</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  )
}
