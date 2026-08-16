import { useState } from 'react'
import { useSalesStats } from './useSalesStats'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Receipt, TrendingUp, ShoppingCart, ArrowRight, Package,
} from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import {
  PageHeader, Card, Table, Th, Td, Spinner, EmptyState, Button,
  DateRangeBar, SearchInput, InfoBanner, Pagination,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import { formatCOP, formatDate } from '@/shared/lib/formatters'
import { ventasApi } from './api'
import { productsApi } from '@/features/products/api'
import { cuentasApi } from '@/features/accounts/api'

interface TooltipPayloadEntry { name: string; value: number; color: string }
interface ChartTooltipProps { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>{formatCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Readout ──────────────────────────────────────────────────────────────────
// Lectura de apoyo dentro de la franja. Sin acción asociada (a diferencia de
// Productos, aquí no hay un filtro equivalente), pero mismo lenguaje visual.

function Readout({
  label, value, hint, tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  const dot = tone === 'bad' ? 'bg-red-500' : tone === 'good' ? 't-bg' : 'bg-slate-300'
  const num = tone === 'bad' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className="min-w-0 px-4 py-3.5 sm:min-w-[150px] sm:px-5 sm:py-5">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </span>
      </span>
      <span className={`mt-1.5 block num text-[20px] font-bold leading-none sm:text-[24px] ${num}`}>
        {value}
      </span>
      {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
    </div>
  )
}

// ─── Salud del margen ─────────────────────────────────────────────────────────
// El equivalente en Ventas a la alarma de stock en Productos: lo que exige
// atención aquí es la venta donde se ganó poco o se perdió plata. La franja de
// la fila lo delata sin tener que leer cada cifra.

const MARGEN_BAJO = 15  // %

function margenTone(ganancia: number, total: number) {
  const pct = total > 0 ? (ganancia / total) * 100 : 0
  if (ganancia < 0)      return { pct, stripe: 'border-l-red-400',   num: 'text-red-600',   label: 'Pérdida' }
  if (pct < MARGEN_BAJO) return { pct, stripe: 'border-l-amber-400', num: 'text-amber-700', label: 'Margen bajo' }
  return                        { pct, stripe: 'border-l-transparent', num: 'text-slate-900', label: '' }
}

export default function SalesPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const today     = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [desde, setDesde] = useState(thirtyAgo)
  const [hasta, setHasta] = useState(today)
  const [search, setSearch] = useState('')

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas', desde, hasta],
    queryFn: () => ventasApi.getAll({ desde, hasta, limit: 500 }),
  })

  // Mismo queryKey y params que ProductsPage: sin { limit: 500 } el backend
  // devuelve solo los primeros 25 productos y las ventas de los demás se
  // mostraban como "#42" en vez del nombre (y no se podían buscar). Además,
  // al compartir queryKey con ProductsPage, la caché quedaba incompleta según
  // qué pantalla cargara primero.
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ limit: 500 }),
  })

  const { data: cuentas = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => cuentasApi.getAll(),
  })

  const { stats, chartData, topProductos, filtered, productoNombre, cuentaNombre, vendedorNombre } =
    useSalesStats(ventas, products, cuentas, search)

  const pg = usePagination(filtered)

  return (
    <div>
      <PageHeader subtitle="Ventas registradas a través de cuentas de crédito" />

      {/* ── Franja de instrumentos ──────────────────────────────────────────
          Mismo criterio que Productos: una sola superficie, el dato que manda
          (lo vendido) domina por escala y el resto son lecturas de apoyo. */}
      <Card padding={false} className="mb-6 overflow-hidden">
        <div className="flex flex-col divide-y divide-slate-100 sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
          <div className="flex-1 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Total vendido
            </p>
            <p className="mt-2 num text-[32px] font-bold leading-none tracking-[-0.03em] text-slate-900 sm:text-[40px]">
              {formatCOP(stats.totalVentas)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              <span className="num font-bold text-slate-700">{stats.count}</span>{' '}
              transacción{stats.count !== 1 ? 'es' : ''}
              {' · '}
              <span className="num font-bold text-slate-700">
                {stats.totalUnidades.toLocaleString('es-CO')}
              </span>{' '}
              uds vendidas
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:divide-x sm:divide-slate-100">
            <Readout
              label="Ganancia bruta"
              value={formatCOP(stats.totalGanancia)}
              hint={`${stats.margen.toFixed(1)}% margen`}
              tone={stats.totalGanancia < 0 ? 'bad' : 'good'}
            />
            <Readout
              label="Unidades"
              value={stats.totalUnidades.toLocaleString('es-CO')}
              hint={`en ${stats.count} venta${stats.count !== 1 ? 's' : ''}`}
            />
          </div>
        </div>
      </Card>

      {/* ── Charts (si hay datos suficientes) ─────────────────────────────── */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Barras diarias — fácil de leer para el comerciante */}
          <Card padding={false} className="lg:col-span-2">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="t-text" />
                <h2 className="text-sm font-semibold text-slate-800">Ventas por día</h2>
              </div>
              {(() => {
                const bestDay = chartData.reduce((a, b) => (b.ventas > a.ventas ? b : a), chartData[0]!)
                return bestDay && bestDay.ventas > 0 ? (
                  <span className="text-[11px] text-slate-500">
                    Mejor día: <span className="font-semibold text-slate-700">{bestDay.dia}</span> · <span className="font-semibold t-text tabular-nums">{formatCOP(bestDay.ventas)}</span>
                  </span>
                ) : null
              })()}
            </div>
            {isDesktop ? (
              <div className="px-2 pt-3 pb-2">
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Bar dataKey="ventas" name="Ventas" fill="var(--t-primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Mobile: mini barras horizontales — sin Recharts, fáciles de leer */
              <div className="px-4 py-3 space-y-2 max-h-[260px] overflow-y-auto">
                {(() => {
                  const max = Math.max(...chartData.map((d) => d.ventas), 1)
                  return chartData.slice(-10).reverse().map((d, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-slate-500">{d.dia}</span>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums">{formatCOP(d.ventas)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full t-bg rounded-full" style={{ width: `${(d.ventas / max) * 100}%` }} />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </Card>

          {/* Top productos período */}
          <Card padding={false}>
            <div className="p-4 border-b border-slate-50 flex items-center gap-2">
              <Package size={15} className="text-purple-600" />
              <h2 className="text-sm font-semibold text-slate-800">Top del período</h2>
            </div>
            <div className="p-4 space-y-3">
              {topProductos.map((p, i) => {
                const max = topProductos[0]?.total || 1
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-700 font-medium truncate max-w-[130px]">{p.nombre}</span>
                      <span className="text-xs font-bold text-slate-800 tabular-nums">{formatCOP(p.total)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(p.total / max) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.unidades} unidades</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start">
        <DateRangeBar
          desde={desde}
          hasta={hasta}
          onDesde={setDesde}
          onHasta={setHasta}
          presets={['today', 'yesterday', 'week', 'month', 'lastMonth']}
          className="flex-1"
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Producto o vendedor..." className="w-full sm:max-w-xs" />
      </div>

      {/* Tip */}
      <div className="mb-4">
        <InfoBanner icon={<ShoppingCart size={14} />} variant="info">
          Las ventas se agregan desde el detalle de cada cuenta de crédito.{' '}
          <button onClick={() => navigate('/accounts')} className="font-semibold underline hover:no-underline">
            Ir a Cuentas →
          </button>
        </InfoBanner>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={40} />}
          title={search ? 'Sin resultados' : 'Sin ventas en este período'}
          description={search ? `Sin coincidencias para "${search}"` : 'Ajusta el rango de fechas para ver ventas'}
        />
      ) : (
        <Card padding={false} className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th className="pl-5 tracking-[0.1em]">Producto</Th>
                <Th className="hidden sm:table-cell tracking-[0.1em]">Vendedor</Th>
                <Th className="hidden sm:table-cell text-right tracking-[0.1em]">Cant.</Th>
                <Th className="hidden md:table-cell text-right tracking-[0.1em]">Precio unit.</Th>
                <Th className="text-right tracking-[0.1em]">Total</Th>
                <Th className="hidden sm:table-cell text-right tracking-[0.1em]">Ganancia</Th>
                <Th className="hidden lg:table-cell tracking-[0.1em]">Fecha</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {pg.paginated.map((v) => {
                const m = margenTone(v.ganancia, v.precio_venta)
                return (
                <tr key={v.id} className="hover:bg-slate-50/70 transition-colors group">
                  <Td className={`border-l-2 ${m.stripe} pl-4 font-medium text-slate-800`}>
                    <div className="min-w-0 max-w-[240px]">
                      <span className="block truncate">{productoNombre(v.producto_id)}</span>
                      {/* Mobile: vendedor + cantidad como sub-línea */}
                      <span className="sm:hidden text-[10px] text-slate-500 truncate block max-w-[160px]">
                        {vendedorNombre(v)} · {v.cantidad_unidades} uds
                      </span>
                    </div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-sm text-slate-700 truncate block max-w-[140px]">
                      {vendedorNombre(v)}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell text-right num text-slate-600">{v.cantidad_unidades}</Td>
                  <Td className="hidden md:table-cell text-right num text-slate-500">{formatCOP(v.precio_unitario)}</Td>
                  <Td className="text-right num text-[15px] font-bold text-slate-900 whitespace-nowrap">{formatCOP(v.precio_venta)}</Td>
                  {/* Ganancia + margen: el monto solo no dice si la venta fue buena */}
                  <Td className="hidden sm:table-cell text-right whitespace-nowrap">
                    <span className={`block num text-[15px] font-bold ${m.num}`}>
                      {formatCOP(v.ganancia)}
                    </span>
                    <span className={`block text-[10px] font-medium ${m.label ? m.num : 'text-slate-400'}`}>
                      {m.label || `${m.pct.toFixed(0)}% margen`}
                    </span>
                  </Td>
                  <Td className="text-slate-400 text-xs whitespace-nowrap hidden lg:table-cell">{formatDate(v.fecha_venta)}</Td>
                  <Td>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={<ArrowRight size={13} />}
                      onClick={() => navigate(`/accounts/${v.cuenta_id}`)}
                      className="t-text opacity-0 group-hover:opacity-100"
                    />
                  </Td>
                </tr>
                )
              })}
            </tbody>
          </Table>

          <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
            <span>
              <span className="num font-bold text-slate-700">{filtered.length}</span>{' '}
              venta{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-4">
              <span>
                Total{' '}
                <span className="num font-bold text-slate-700">
                  {formatCOP(filtered.reduce((s, v) => s + v.precio_venta, 0))}
                </span>
              </span>
              <span>
                Ganancia{' '}
                <span className="num font-bold t-text-dk">
                  {formatCOP(filtered.reduce((s, v) => s + v.ganancia, 0))}
                </span>
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
