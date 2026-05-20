import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Receipt, TrendingUp, DollarSign, ShoppingCart, ArrowRight, Package,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import {
  PageHeader, Card, Table, Th, Td, Spinner, EmptyState, Button,
  StatCard, DateRangeBar, SearchInput, Badge, InfoBanner,
} from '@/shared/components/ui'
import { formatCOP, formatDate } from '@/shared/lib/formatters'
import { ventasApi } from './api'
import { productsApi } from '@/features/products/api'
import { cuentasApi } from '@/features/accounts/api'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>{formatCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function SalesPage() {
  const navigate = useNavigate()
  const today     = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [desde, setDesde] = useState(thirtyAgo)
  const [hasta, setHasta] = useState(today)
  const [search, setSearch] = useState('')

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventas', desde, hasta],
    queryFn: () => ventasApi.getAll({ desde, hasta, limit: 500 }),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  })

  const { data: cuentas = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => cuentasApi.getAll(),
  })

  const productoNombre = (id: number) => products.find((p) => p.id === id)?.nombre ?? `#${id}`
  const cuentaNombre   = (id: number) => cuentas.find((c) => c.id === id)?.nombre  ?? `Cuenta #${id}`
  const vendedorNombre = (v: { nombre_cajero?: string | null; vendido_por?: number | null }) =>
    v.nombre_cajero ?? (v.vendido_por ? `Cajero #${v.vendido_por}` : '—')

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalVentas   = ventas.reduce((s, v) => s + v.precio_venta, 0)
    const totalGanancia = ventas.reduce((s, v) => s + v.ganancia, 0)
    const totalUnidades = ventas.reduce((s, v) => s + v.cantidad_unidades, 0)
    const margen        = totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0
    return { totalVentas, totalGanancia, totalUnidades, count: ventas.length, margen }
  }, [ventas])

  // ── Chart: ventas por día ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const byDay = new Map<string, { ventas: number; ganancia: number }>()
    for (const v of ventas) {
      const dia = v.fecha_venta?.slice(0, 10) ?? ''
      if (!dia) continue
      const prev = byDay.get(dia) ?? { ventas: 0, ganancia: 0 }
      byDay.set(dia, { ventas: prev.ventas + v.precio_venta, ganancia: prev.ganancia + v.ganancia })
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, vals]) => ({
        dia: new Date(dia + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
        ventas: vals.ventas,
        ganancia: vals.ganancia,
      }))
  }, [ventas])

  // ── Top productos en período ──────────────────────────────────────────────
  const topProductos = useMemo(() => {
    const map = new Map<number, { nombre: string; total: number; unidades: number }>()
    for (const v of ventas) {
      const prev = map.get(v.producto_id) ?? { nombre: productoNombre(v.producto_id), total: 0, unidades: 0 }
      map.set(v.producto_id, { nombre: prev.nombre, total: prev.total + v.precio_venta, unidades: prev.unidades + v.cantidad_unidades })
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [ventas, products])

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return ventas
    const q = search.toLowerCase()
    return ventas.filter((v) =>
      productoNombre(v.producto_id).toLowerCase().includes(q) ||
      cuentaNombre(v.cuenta_id).toLowerCase().includes(q) ||
      (v.nombre_cajero?.toLowerCase().includes(q) ?? false)
    )
  }, [ventas, search, products, cuentas])

  return (
    <div>
      <PageHeader
        title="Historial de ventas"
        subtitle="Ventas registradas a través de cuentas de crédito"
      />

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total vendido"
          value={formatCOP(stats.totalVentas)}
          icon={<DollarSign size={17} className="t-text" />}
          accent="green"
        />
        <StatCard
          label="Ganancia bruta"
          value={formatCOP(stats.totalGanancia)}
          subValue={`${stats.margen.toFixed(1)}% margen`}
          icon={<TrendingUp size={17} className="text-green-600" />}
          accent="blue"
        />
        <StatCard
          label="Transacciones"
          value={String(stats.count)}
          icon={<Receipt size={17} className="text-purple-600" />}
          accent="purple"
        />
        <StatCard
          label="Unidades vendidas"
          value={stats.totalUnidades.toLocaleString('es-CO')}
          icon={<ShoppingCart size={17} className="text-orange-600" />}
          accent="orange"
        />
      </div>

      {/* ── Charts (si hay datos suficientes) ─────────────────────────────── */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Área chart */}
          <Card padding={false} className="lg:col-span-2">
            <div className="p-4 border-b border-slate-50 flex items-center gap-2">
              <TrendingUp size={15} className="t-text" />
              <h2 className="text-sm font-semibold text-slate-800">Ventas en el período</h2>
            </div>
            <div className="px-2 pt-3 pb-2">
              <ResponsiveContainer width="100%" height={180} minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--t-primary)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--t-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={44} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="ventas" name="Ventas" stroke="var(--t-primary)" strokeWidth={2} fill="url(#gSales)" dot={false} activeDot={{ r: 4, fill: 'var(--t-primary)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
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
                <Th>Producto</Th>
                <Th className="hidden sm:table-cell">Vendedor</Th>
                <Th className="hidden sm:table-cell">Cant.</Th>
                <Th className="hidden md:table-cell">Precio unit.</Th>
                <Th>Total</Th>
                <Th className="hidden sm:table-cell">Ganancia</Th>
                <Th className="hidden lg:table-cell">Fecha</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                  <Td className="font-medium text-slate-800">
                    <div className="min-w-0">
                      <span className="block truncate">{productoNombre(v.producto_id)}</span>
                      {/* Mobile: vendedor + cantidad como sub-línea */}
                      <span className="sm:hidden text-[10px] text-slate-500 truncate block max-w-[160px]">
                        {vendedorNombre(v)} · {v.cantidad_unidades} u.
                      </span>
                    </div>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <span className="text-sm text-slate-700 truncate block max-w-[140px]">
                      {vendedorNombre(v)}
                    </span>
                  </Td>
                  <Td className="text-slate-500 tabular-nums hidden sm:table-cell">{v.cantidad_unidades}</Td>
                  <Td className="text-slate-500 tabular-nums hidden md:table-cell">{formatCOP(v.precio_unitario)}</Td>
                  <Td className="font-semibold text-slate-800 tabular-nums whitespace-nowrap">{formatCOP(v.precio_venta)}</Td>
                  <Td className="hidden sm:table-cell">
                    <Badge variant={v.ganancia >= 0 ? 'green' : 'red'}>
                      {formatCOP(v.ganancia)}
                    </Badge>
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
              ))}
            </tbody>
          </Table>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2 text-xs text-slate-500">
            <span>{filtered.length} venta{filtered.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-4 font-semibold">
              <span className="text-slate-700 tabular-nums">Total: {formatCOP(filtered.reduce((s, v) => s + v.precio_venta, 0))}</span>
              <span className="text-green-700 tabular-nums">Ganancia: {formatCOP(filtered.reduce((s, v) => s + v.ganancia, 0))}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
