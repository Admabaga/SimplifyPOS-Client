/**
 * Master — Analytics
 *
 * La visión del operador sobre todo el ecosistema. El contenido de esta
 * página siempre fue bueno (sobre todo el motor de hallazgos); lo que
 * fallaba era la forma: doce tarjetas con degradado en cinco colores
 * distintos, cada bloque pidiendo atención por su cuenta. Cuando todo
 * grita, nada se lee.
 *
 * Ahora usa el lenguaje de la consola —papel, rótulos, cifras— y el color
 * queda reservado para lo que significa algo: bien, atención, mal.
 *
 * El bloque de engagement se cambió por una representación anidada: DAU
 * está dentro de WAU, que está dentro de MAU. Es literalmente lo que son,
 * y así el stickiness se ve como proporción en vez de tener que comparar
 * tres números sueltos y leer un porcentaje aparte.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity, AlertCircle, Building2, DollarSign, MapPin, Shield, TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { PageHeader, Spinner, EmptyState } from '@/shared/components/ui'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { formatCOP } from '@/shared/lib/formatters'
import { masterApi, type MasterAnalytics } from './api'
import { Cifra, Cifras, Papel, Rotulo } from './components/consola'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatYM(ym: string) {
  const [y, m] = ym.split('-')
  const idx = Number(m) - 1
  return MESES[idx] && y ? `${MESES[idx]} ${y.slice(2)}` : ym
}

/** Delta como cifra firmada, no como pastilla de color. */
function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const plano = Math.abs(pct) < 0.5
  const color = plano ? 'text-slate-400' : pct > 0 ? 'text-emerald-600' : 'text-rose-600'
  return (
    <span className={`num text-[11px] font-semibold ${color}`}>
      {plano ? '=' : pct > 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs período anterior
    </span>
  )
}

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: { value: number; name: string; dataKey: string; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-lg">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="num text-xs font-semibold text-slate-800">
          {p.dataKey === 'gmv' ? formatCOP(p.value) : p.value.toLocaleString('es-CO')}
          <span className="ml-1.5 font-normal text-slate-400">{p.name}</span>
        </p>
      ))}
    </div>
  )
}

/** Barra de proporción a filete. Un solo tono; la longitud es el dato. */
function Proporcion({ valor, max, tono = 'primary' }: { valor: number; max: number; tono?: 'primary' | 'slate' }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${tono === 'primary' ? 't-bg' : 'bg-slate-400'}`}
        style={{ width: `${max > 0 ? Math.max(2, (valor / max) * 100) : 0}%` }}
      />
    </div>
  )
}

// ─── Engagement anidado ──────────────────────────────────────────────────────

/**
 * DAU ⊂ WAU ⊂ MAU. Dibujarlos como cajas concéntricas dice la relación sola:
 * si el bloque interior llena casi todo el exterior, la app se usa a diario.
 */
function Engagement({ e }: { e: MasterAnalytics['engagement'] }) {
  const mau = Math.max(e.mau, 1)
  const anchoWau = Math.max(3, (e.wau / mau) * 100)
  const anchoDau = Math.max(2, (e.dau / mau) * 100)

  const capas = [
    { k: 'MAU', v: e.mau, ancho: 100, clase: 'bg-slate-200', txt: 'text-slate-600', desc: 'activos en 30 días' },
    { k: 'WAU', v: e.wau, ancho: anchoWau, clase: 'bg-slate-400', txt: 'text-slate-700', desc: 'activos en 7 días' },
    { k: 'DAU', v: e.dau, ancho: anchoDau, clase: 't-bg', txt: 't-text-dk', desc: 'activos hoy' },
  ]

  return (
    <div>
      <div className="space-y-1.5">
        {capas.map((c) => (
          <div key={c.k} className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {c.k}
            </span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-50">
              <div className={`h-full rounded-md ${c.clase}`} style={{ width: `${c.ancho}%` }} />
              <span className="absolute inset-y-0 left-2.5 flex items-center">
                <span className={`num font-display text-[15px] ${c.txt}`}>
                  {c.v.toLocaleString('es-CO')}
                </span>
              </span>
            </div>
            <span className="hidden w-32 shrink-0 text-[10.5px] text-slate-400 sm:block">{c.desc}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-2.5">
        <p className="text-[11px] text-slate-500">
          Vuelven a diario{' '}
          <span className="num font-semibold text-slate-800">{e.dau_wau_ratio.toFixed(0)}%</span>
          <span className="text-slate-400"> de los semanales</span>
        </p>
        <p className="text-[11px] text-slate-500">
          Vuelven cada semana{' '}
          <span className="num font-semibold text-slate-800">{e.wau_mau_ratio.toFixed(0)}%</span>
          <span className="text-slate-400"> de los mensuales</span>
        </p>
      </div>
    </div>
  )
}

// ─── Motor de hallazgos ──────────────────────────────────────────────────────

type Severidad = 'success' | 'warning' | 'danger' | 'info' | 'opportunity'

interface Hallazgo {
  severidad: Severidad
  titulo: string
  detalle: string
  cifra?: string
  cifraEtiqueta?: string
}

const SEVERIDAD: Record<Severidad, { etiqueta: string; punto: string; texto: string }> = {
  success:     { etiqueta: 'Buena señal', punto: 'bg-emerald-500', texto: 'text-emerald-700' },
  warning:     { etiqueta: 'Atención',    punto: 'bg-amber-500',   texto: 'text-amber-700' },
  danger:      { etiqueta: 'Crítico',     punto: 'bg-rose-500',    texto: 'text-rose-700' },
  info:        { etiqueta: 'Dato',        punto: 'bg-slate-400',   texto: 'text-slate-600' },
  opportunity: { etiqueta: 'Oportunidad', punto: 'bg-violet-500',  texto: 'text-violet-700' },
}

function hallazgos(d: MasterAnalytics): Hallazgo[] {
  const out: Hallazgo[] = []

  if (d.tenants.delta_pct !== null && d.tenants.delta_pct > 20) {
    out.push({
      severidad: 'success',
      titulo: `Crecimiento del ${d.tenants.delta_pct.toFixed(1)}% en nuevos negocios`,
      detalle: `${d.tenants.nuevos_30d} negocios se registraron en los últimos 30 días, contra ${d.tenants.nuevos_30d_prev} del período anterior. Sostén la inversión en adquisición que está funcionando.`,
      cifra: `+${d.tenants.nuevos_30d}`,
      cifraEtiqueta: 'nuevos en 30 días',
    })
  } else if (d.tenants.delta_pct !== null && d.tenants.delta_pct < -20) {
    out.push({
      severidad: 'danger',
      titulo: 'Caída en adquisición de nuevos negocios',
      detalle: `${d.tenants.nuevos_30d} nuevos contra ${d.tenants.nuevos_30d_prev} del período anterior. Revisa el embudo de registro y las campañas activas.`,
      cifra: String(d.tenants.nuevos_30d),
      cifraEtiqueta: 'nuevos en 30 días',
    })
  }

  if (d.gmv.delta_pct !== null && d.gmv.delta_pct > 15) {
    out.push({
      severidad: 'success',
      titulo: `El volumen transado creció ${d.gmv.delta_pct.toFixed(1)}% frente al mes pasado`,
      detalle: `${formatCOP(d.gmv.mes_actual)} este mes contra ${formatCOP(d.gmv.mes_anterior)} el anterior. Con este ritmo conviene revisar la capacidad de infraestructura antes de que apriete.`,
      cifra: formatCOP(d.gmv.mes_actual),
      cifraEtiqueta: 'transado este mes',
    })
  } else if (d.gmv.delta_pct !== null && d.gmv.delta_pct < -15) {
    out.push({
      severidad: 'warning',
      titulo: `El volumen transado bajó ${Math.abs(d.gmv.delta_pct).toFixed(1)}% frente al mes pasado`,
      detalle: `${formatCOP(d.gmv.mes_actual)} contra ${formatCOP(d.gmv.mes_anterior)}. Antes de asumir que es estacional, mira si hay negocios que dejaron de operar.`,
      cifra: formatCOP(d.gmv.mes_actual),
      cifraEtiqueta: 'transado este mes',
    })
  }

  if (d.engagement.wau > 0) {
    if (d.engagement.dau_wau_ratio > 40) {
      out.push({
        severidad: 'success',
        titulo: 'El POS entró en la rutina diaria',
        detalle: `${d.engagement.dau_wau_ratio.toFixed(0)}% de quienes usan la app en la semana la abren también todos los días. Es la señal más difícil de conseguir y la más difícil de perder.`,
        cifra: `${d.engagement.dau_wau_ratio.toFixed(0)}%`,
        cifraEtiqueta: 'de los semanales, a diario',
      })
    } else if (d.engagement.dau_wau_ratio < 20) {
      out.push({
        severidad: 'warning',
        titulo: 'La app no se está usando a diario',
        detalle: `Sólo ${d.engagement.dau_wau_ratio.toFixed(0)}% de los usuarios de la semana vuelven cada día. Un POS que no se abre a diario es un POS que se puede cambiar sin dolor.`,
        cifra: `${d.engagement.dau_wau_ratio.toFixed(0)}%`,
        cifraEtiqueta: 'de los semanales, a diario',
      })
    }
  }

  if (d.tenants.total > 0) {
    const pctInactivos = (d.tenants.inactivos / d.tenants.total) * 100
    if (pctInactivos > 15) {
      out.push({
        severidad: 'danger',
        titulo: `${d.tenants.inactivos} negocios inactivos (${pctInactivos.toFixed(0)}% de la base)`,
        detalle: 'Cada negocio inactivo es una baja que todavía no se ha formalizado. Recuperar uno cuesta menos que conseguir uno nuevo, pero la ventana se cierra rápido.',
        cifra: String(d.tenants.inactivos),
        cifraEtiqueta: 'sin actividad',
      })
    }
  }

  if (d.top_tenants.length > 0 && d.gmv.total > 0) {
    const peso = (d.top_tenants[0]!.gmv / d.gmv.total) * 100
    if (peso > 20) {
      out.push({
        severidad: 'warning',
        titulo: `${d.top_tenants[0]!.nombre} concentra el ${peso.toFixed(0)}% del volumen`,
        detalle: 'Si ese cliente se va o baja el ritmo, el golpe se siente en el mes. Vale la pena empujar a los negocios medianos para repartir el peso.',
        cifra: `${peso.toFixed(0)}%`,
        cifraEtiqueta: 'del volumen total',
      })
    }
  }

  if (d.tenants.geo.length > 0 && d.tenants.total > 0) {
    const ciudad = d.tenants.geo[0]!
    const peso = (ciudad.n / d.tenants.total) * 100
    if (peso > 50) {
      out.push({
        severidad: 'opportunity',
        titulo: `${ciudad.ciudad} concentra el ${peso.toFixed(0)}% de los negocios`,
        detalle: 'El mercado está concentrado en una sola plaza. Lo que funcionó ahí es replicable, y hoy es la vía de crecimiento más barata que tienes.',
        cifra: ciudad.ciudad,
        cifraEtiqueta: `${ciudad.n} negocios`,
      })
    }
  }

  if (d.gmv.total > 0 && d.totales.cuentas_por_cobrar > d.gmv.total * 0.3) {
    out.push({
      severidad: 'info',
      titulo: `${formatCOP(d.totales.cuentas_por_cobrar)} en fiados sin cobrar`,
      detalle: 'Tus negocios tienen mucha plata en la calle. Ahí hay producto por vender: recordatorios automáticos y enlaces de pago por WhatsApp.',
      cifra: formatCOP(d.totales.cuentas_por_cobrar),
      cifraEtiqueta: 'por cobrar en la red',
    })
  }

  if (d.audit.serie_diaria.length >= 14) {
    const reciente = d.audit.serie_diaria.slice(-7).reduce((s, r) => s + r.n, 0)
    const previa = d.audit.serie_diaria.slice(-14, -7).reduce((s, r) => s + r.n, 0)
    if (previa > 0) {
      const cambio = ((reciente - previa) / previa) * 100
      if (Math.abs(cambio) > 50) {
        out.push({
          severidad: cambio > 0 ? 'info' : 'warning',
          titulo: `La actividad registrada ${cambio > 0 ? 'subió' : 'bajó'} ${Math.abs(cambio).toFixed(0)}% esta semana`,
          detalle: `${reciente} eventos contra ${previa} la semana pasada. ${
            cambio > 0
              ? 'Puede ser más uso o más operaciones sensibles: conviene confirmar que sea actividad legítima.'
              : 'Vale la pena confirmar que los negocios sigan operando con normalidad.'
          }`,
          cifra: String(reciente),
          cifraEtiqueta: 'eventos en 7 días',
        })
      }
    }
  }

  return out
}

/** Un hallazgo se lee como una nota de informe: marca, título, cuerpo y cifra. */
function Nota({ h }: { h: Hallazgo }) {
  const s = SEVERIDAD[h.severidad]
  return (
    <li className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.punto}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-[9.5px] font-bold uppercase tracking-[0.12em] ${s.texto}`}>
            {s.etiqueta}
          </span>
          <p className="text-[13px] font-semibold text-slate-900">{h.titulo}</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{h.detalle}</p>
      </div>
      {h.cifra && (
        <div className="hidden shrink-0 pl-3 text-right sm:block sm:w-40">
          <p className="num font-display text-[17px] leading-none tracking-[-0.02em] text-slate-900">
            {h.cifra}
          </p>
          {h.cifraEtiqueta && (
            <p className="mt-1 text-[10px] leading-tight text-slate-400">{h.cifraEtiqueta}</p>
          )}
        </div>
      )}
    </li>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function MasterAnalyticsPage() {
  const isDesktop = useIsDesktop()
  const { data, isLoading, error } = useQuery({
    queryKey: ['master', 'analytics'],
    queryFn: () => masterApi.analytics(),
    staleTime: 60_000,
  })

  const notas = useMemo(() => (data ? hallazgos(data) : []), [data])

  const encabezado = (
    <PageHeader
      subtitle="El ecosistema completo, en una sola vista"
      actions={
        data ? (
          <span className="num text-[11px] text-slate-400">
            Corte:{' '}
            {new Date(data.generated_at).toLocaleString('es-CO', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        ) : undefined
      }
    />
  )

  if (isLoading) {
    return (
      <div>
        {encabezado}
        <div className="flex justify-center py-24"><Spinner size={34} /></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        {encabezado}
        <EmptyState
          icon={<AlertCircle size={30} className="text-rose-400" />}
          title="No se pudieron cargar las métricas"
          description="Intenta recargar la página."
        />
      </div>
    )
  }

  const serieTenants = data.tenants.serie_mensual.map((r) => ({ mes: formatYM(r.ym), nuevos: r.n }))
  const serieGmv = data.gmv.serie_mensual.map((r) => ({ mes: formatYM(r.ym), gmv: r.gmv }))
  const maxGeo = data.tenants.geo[0]?.n ?? 1
  const maxTop = data.top_tenants[0]?.gmv ?? 1
  const maxAccion = data.audit.top_acciones[0]?.n ?? 1

  return (
    <div className="space-y-7">
      {encabezado}

      {/* ── Cabecera de cifras ── */}
      <Papel className="p-5">
        <Cifras>
          <Cifra
            valor={data.tenants.total.toLocaleString('es-CO')}
            etiqueta="Negocios"
            nota={`${data.tenants.activos} activos · ${data.tenants.inactivos} inactivos`}
          />
          <Cifra
            valor={formatCOP(data.gmv.total)}
            etiqueta="Transado histórico"
            nota={`${data.totales.ventas.toLocaleString('es-CO')} ventas`}
          />
          <Cifra
            valor={formatCOP(data.gmv.mes_actual)}
            etiqueta="Transado este mes"
            nota={<Delta pct={data.gmv.delta_pct} />}
          />
          <Cifra
            valor={data.tenants.nuevos_30d.toString()}
            etiqueta="Nuevos en 30 días"
            nota={<Delta pct={data.tenants.delta_pct} />}
          />
        </Cifras>
      </Papel>

      {/* ── Uso real ── */}
      <div>
        <Rotulo>Uso real de la plataforma</Rotulo>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <Engagement e={data.engagement} />
        </div>
      </div>

      {/* ── Crecimiento ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <Rotulo>Volumen transado por mes</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {isDesktop ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={serieGmv} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                    width={38}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Bar dataKey="gmv" name="transado" fill="var(--t-primary)" radius={[2, 2, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-2 p-1">
                {serieGmv.map((r, i) => (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-slate-500">{r.mes}</span>
                      <span className="num font-semibold text-slate-800">{formatCOP(r.gmv)}</span>
                    </div>
                    <Proporcion valor={r.gmv} max={Math.max(...serieGmv.map((x) => x.gmv), 1)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <Rotulo>Negocios que entran cada mes</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {isDesktop ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={serieTenants} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="nuevos"
                    name="negocios"
                    stroke="#0f172a"
                    strokeWidth={1.75}
                    dot={{ r: 2.5, fill: '#0f172a', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-2 p-1">
                {serieTenants.map((r, i) => (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-slate-500">{r.mes}</span>
                      <span className="num font-semibold text-slate-800">{r.nuevos}</span>
                    </div>
                    <Proporcion
                      valor={r.nuevos}
                      max={Math.max(...serieTenants.map((x) => x.nuevos), 1)}
                      tono="slate"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quién mueve el volumen + dónde están ── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <Rotulo contador={data.top_tenants.length}>Quién mueve el volumen</Rotulo>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {data.top_tenants.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                Aún no hay transacciones registradas.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {data.top_tenants.map((t, i) => (
                  <li key={t.admin_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="num w-5 shrink-0 text-right text-[11px] font-semibold text-slate-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13px] font-semibold text-slate-800">{t.nombre}</p>
                        <p className="num shrink-0 text-[13px] font-semibold text-slate-900">
                          {formatCOP(t.gmv)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1">
                          <Proporcion valor={t.gmv} max={maxTop} />
                        </div>
                        <span className="num shrink-0 text-[10px] text-slate-400">
                          {t.ventas} ventas
                        </span>
                        {t.ciudad && (
                          <span className="hidden shrink-0 items-center gap-0.5 text-[10px] text-slate-400 sm:flex">
                            <MapPin size={9} /> {t.ciudad}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <Rotulo>Dónde están</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {data.tenants.geo.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Sin datos de ciudad</p>
            ) : (
              <ul className="space-y-2.5">
                {data.tenants.geo.map((g, i) => (
                  <li key={i}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-slate-700">{g.ciudad}</span>
                      <span className="num text-xs font-semibold text-slate-900">{g.n}</span>
                    </div>
                    <Proporcion valor={g.n} max={maxGeo} tono="slate" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Dinero del ecosistema ── */}
      <div>
        <Rotulo>El dinero que mueve la red</Rotulo>
        <Papel className="p-5">
          <Cifras>
            <Cifra valor={data.totales.ventas.toLocaleString('es-CO')} etiqueta="Ventas" />
            <Cifra valor={formatCOP(data.totales.pagos_recibidos)} etiqueta="Pagos recibidos" />
            <Cifra valor={formatCOP(data.totales.gastos_registrados)} etiqueta="Gastos registrados" />
            <Cifra
              valor={formatCOP(data.totales.cuentas_por_cobrar)}
              etiqueta="Fiado sin cobrar"
              tono={data.totales.cuentas_por_cobrar > 0 ? 'yellow' : 'neutro'}
            />
            <Cifra valor={data.totales.usuarios.toLocaleString('es-CO')} etiqueta="Usuarios" />
          </Cifras>
        </Papel>
      </div>

      {/* ── Auditoría ── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <Rotulo>Actividad registrada · últimos 30 días</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {isDesktop ? (
              <ResponsiveContainer width="100%" height={165}>
                <BarChart
                  data={data.audit.serie_diaria.map((r) => ({ d: r.d.slice(5), n: r.n }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="d"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(data.audit.serie_diaria.length / 10) - 1)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Bar dataKey="n" name="eventos" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">
                La gráfica diaria se ve en pantalla grande.
              </p>
            )}
          </div>
        </div>

        <div>
          <Rotulo>Qué se hace más</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            {data.audit.top_acciones.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Sin eventos recientes</p>
            ) : (
              <ul className="space-y-2.5">
                {data.audit.top_acciones.map((a, i) => (
                  <li key={i}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-slate-600">{a.action}</span>
                      <span className="num text-xs font-semibold text-slate-900">{a.n}</span>
                    </div>
                    <Proporcion valor={a.n} max={maxAccion} tono="slate" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Hallazgos ── */}
      {notas.length > 0 && (
        <div>
          <Rotulo contador={notas.length}>Lo que dicen los números</Rotulo>
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <ul className="divide-y divide-slate-100">
              {notas.map((h, i) => (
                <Nota key={i} h={h} />
              ))}
            </ul>
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-slate-400">
            <Activity size={10} />
            Reglas fijas sobre los datos del corte — no es una predicción, es lo que ya pasó.
          </p>
        </div>
      )}

      {notas.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-5 py-4">
          {data.gmv.delta_pct !== null && data.gmv.delta_pct >= 0 ? (
            <TrendingUp size={15} className="text-emerald-600" />
          ) : (
            <TrendingDown size={15} className="text-slate-400" />
          )}
          <p className="text-xs text-slate-500">
            Sin desvíos que valga la pena señalar en este corte: todo se mueve dentro de lo esperado.
          </p>
        </div>
      )}

      <p className="flex items-center gap-1.5 border-t border-slate-100 pt-4 text-[10.5px] text-slate-400">
        <Building2 size={10} />
        Datos consolidados de todos los negocios.
        <Shield size={10} className="ml-2" />
        La actividad registrada proviene del historial de auditoría, que no se puede editar.
      </p>
    </div>
  )
}
