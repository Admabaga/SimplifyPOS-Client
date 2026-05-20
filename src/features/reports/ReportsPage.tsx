import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, BookOpen,
  Package, Lightbulb, ArrowUpRight, ArrowDownRight, BarChart2,
  Minus, ChevronLeft, ChevronRight, Truck, Wallet, FileText, Receipt,
} from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts'
import {
  PageHeader, Card, Spinner, EmptyState, StatCard,
} from '@/shared/components/ui'
import { formatCOP, MONTHS_ES } from '@/shared/lib/formatters'
import { reportesApi } from './api'
import { productsApi } from '@/features/products/api'

// ── Tooltip for charts ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[150px]">
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

// ── Trend badge ─────────────────────────────────────────────────────────────
function TrendBadge({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) {
  if (pct === null) return <span className="text-[10px] text-slate-400">Sin datos</span>
  const positive = inverse ? pct < 0 : pct > 0
  const neutral  = pct === 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
      neutral ? 'text-slate-400' : positive ? 'text-green-600' : 'text-red-500'
    }`}>
      {neutral ? <Minus size={10} /> : positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {Math.abs(pct).toFixed(1)}% vs mes anterior
    </span>
  )
}

// ── Insight card ────────────────────────────────────────────────────────────
function InsightCard({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${color}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-xs text-slate-700 leading-relaxed">{text}</p>
    </div>
  )
}

// ── Bar colors ───────────────────────────────────────────────────────────────
const BAR_COLORS = ['var(--t-primary)', '#2563eb', '#7c3aed', '#ea580c', '#0891b2']

function pct(a: number, b: number): number | null {
  if (b === 0) return null
  return ((a - b) / b) * 100
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Navigate months
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // Previous month params
  const prevYear  = month === 1 ? year - 1 : year
  const prevMon   = month === 1 ? 12 : month - 1

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: () => reportesApi.monthly(year, month),
  })

  const { data: prevData } = useQuery({
    queryKey: ['reports', 'monthly', prevYear, prevMon],
    queryFn: () => reportesApi.monthly(prevYear, prevMon),
  })

  const { data: gastos = [] } = useQuery({
    queryKey: ['reports', 'expenses', year, month],
    queryFn: () => reportesApi.expensesMonthly(year, month),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  })

  const productoNombre = (id: number) => products.find(p => p.id === id)?.nombre ?? `Producto #${id}`

  // ── Derived stats — toma los KPIs del backend (única fuente de verdad) ────
  const stats = useMemo(() => {
    if (!data) return null
    const totalVentas    = data.total_ventas
    const cogs           = data.cogs
    const gananciaB      = data.ganancia_bruta
    const totalGastos    = data.total_gastos
    const gananciaN      = data.ganancia_neta              // ← del backend
    const totalCompras   = data.total_compras              // ← NEW
    const totalPagos     = data.total_pagos
    const flujoCaja      = data.flujo_caja_neto            // ← NEW
    const cuentasPorCobrar = data.cuentas_por_cobrar       // ← NEW

    const margen         = totalVentas > 0 ? (gananciaB / totalVentas) * 100 : 0
    const margenNeto     = totalVentas > 0 ? (gananciaN / totalVentas) * 100 : 0
    const numVentas      = data.ventas_por_dia.reduce((s, d) => s + d.num_ventas, 0)
    const ticketProm     = numVentas > 0 ? totalVentas / numVentas : 0

    const pVentas   = pct(totalVentas, prevData?.total_ventas ?? 0)
    const pGanancia = pct(gananciaB,  prevData?.ganancia_bruta ?? 0)
    const pGastos   = pct(totalGastos, prevData?.total_gastos ?? 0)
    const pNeta     = pct(gananciaN,  prevData?.ganancia_neta ?? 0)
    const pCompras  = pct(totalCompras, prevData?.total_compras ?? 0)

    return {
      totalVentas, cogs, gananciaB, totalGastos, gananciaN,
      totalCompras, totalPagos, flujoCaja, cuentasPorCobrar,
      margen, margenNeto, numVentas, ticketProm,
      pVentas, pGanancia, pGastos, pNeta, pCompras,
    }
  }, [data, prevData])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data) return []
    return data.ventas_por_dia.map(d => ({
      dia: new Date(d.dia + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      ventas: d.total,
      ganancia: d.ganancia,
      num: d.num_ventas,
    }))
  }, [data])

  // ── Top productos ──────────────────────────────────────────────────────────
  const topProductos = useMemo(() => {
    if (!data) return []
    return data.top_productos.map(p => ({
      ...p,
      nombre: productoNombre(p.producto_id),
    })).slice(0, 5)
  }, [data, products])

  // ── Gastos breakdown ───────────────────────────────────────────────────────
  const gastosAgrupados = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of gastos) {
      map.set(g.descripcion, (map.get(g.descripcion) ?? 0) + Number(g.monto))
    }
    return Array.from(map.entries())
      .map(([desc, total]) => ({ desc, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [gastos])

  // ── Auto-insights ──────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!data || !stats) return []
    const result: { icon: React.ReactNode; text: string; color: string }[] = []

    // Best day
    const bestDay = [...data.ventas_por_dia].sort((a, b) => b.total - a.total)[0]
    if (bestDay) {
      const fecha = new Date(bestDay.dia + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
      result.push({
        icon: <TrendingUp size={14} className="t-text" />,
        text: `El día de mayor venta fue el ${fecha} con ${formatCOP(bestDay.total)} en ${bestDay.num_ventas} transacciones.`,
        color: 't-bg-xlt t-border',
      })
    }

    // Top product
    if (topProductos[0]) {
      result.push({
        icon: <Package size={14} className="text-purple-600" />,
        text: `"${topProductos[0].nombre}" fue el producto más vendido con ${formatCOP(topProductos[0].total)} en ventas (${topProductos[0].unidades} unidades).`,
        color: 'bg-purple-50 border-purple-200',
      })
    }

    // Margin alert
    if (stats.margen < 20) {
      result.push({
        icon: <TrendingDown size={14} className="text-red-500" />,
        text: `El margen bruto es ${stats.margen.toFixed(1)}%, por debajo del 20% recomendado. Considera revisar precios de venta o costos de compra.`,
        color: 'bg-red-50 border-red-200',
      })
    } else {
      result.push({
        icon: <TrendingUp size={14} className="text-blue-600" />,
        text: `Margen bruto saludable del ${stats.margen.toFixed(1)}%. Ganancia bruta: ${formatCOP(stats.gananciaB)} sobre ventas totales de ${formatCOP(stats.totalVentas)}.`,
        color: 'bg-blue-50 border-blue-200',
      })
    }

    // Gastos vs ganancia
    if (stats.gananciaB > 0) {
      const gastosRatio = (stats.totalGastos / stats.gananciaB) * 100
      if (gastosRatio > 50) {
        result.push({
          icon: <DollarSign size={14} className="text-orange-600" />,
          text: `Los gastos operativos (${formatCOP(stats.totalGastos)}) representan el ${gastosRatio.toFixed(0)}% de la ganancia bruta. Ganancia neta: ${formatCOP(stats.gananciaN)}.`,
          color: 'bg-orange-50 border-orange-200',
        })
      }
    }

    // Cuentas abiertas
    if (data.cuentas_abiertas > 0) {
      result.push({
        icon: <BookOpen size={14} className="text-yellow-600" />,
        text: `Hay ${data.cuentas_abiertas} cuenta${data.cuentas_abiertas !== 1 ? 's' : ''} de crédito abierta${data.cuentas_abiertas !== 1 ? 's' : ''} pendientes de pago. ${data.cuentas_pagadas} cuenta${data.cuentas_pagadas !== 1 ? 's' : ''} fueron pagadas este mes.`,
        color: 'bg-yellow-50 border-yellow-200',
      })
    }

    // vs previous month
    if (stats.pVentas !== null && prevData) {
      if (stats.pVentas > 10) {
        result.push({
          icon: <ArrowUpRight size={14} className="t-text" />,
          text: `Comparando con ${MONTHS_ES[prevMon - 1]}: ventas aumentaron ${stats.pVentas.toFixed(1)}% (de ${formatCOP(prevData.total_ventas)} a ${formatCOP(stats.totalVentas)}).`,
          color: 't-bg-xlt t-border',
        })
      } else if (stats.pVentas < -10) {
        result.push({
          icon: <ArrowDownRight size={14} className="text-red-500" />,
          text: `Comparando con ${MONTHS_ES[prevMon - 1]}: ventas bajaron ${Math.abs(stats.pVentas).toFixed(1)}% (de ${formatCOP(prevData.total_ventas)} a ${formatCOP(stats.totalVentas)}).`,
          color: 'bg-red-50 border-red-200',
        })
      }
    }

    return result
  }, [data, stats, topProductos, prevData])

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Análisis mensual de operaciones"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={15} className="text-slate-500" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:outline-none"
              >
                {MONTHS_ES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:outline-none"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} className="text-slate-500" />
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size={32} /></div>
      ) : !data ? (
        <EmptyState icon={<TrendingUp size={48} />} title="Sin datos para este período" description="Ajusta el mes y año para ver el reporte" />
      ) : (
        <div className="space-y-5">

          {/* ── KPI Row 1 ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total vendido"
              value={formatCOP(stats?.totalVentas ?? 0)}
              subValue={<TrendBadge pct={stats?.pVentas ?? null} />}
              icon={<ShoppingCart size={17} className="t-text" />}
              accent="green"
            />
            <StatCard
              label="Ganancia bruta"
              value={formatCOP(stats?.gananciaB ?? 0)}
              subValue={<TrendBadge pct={stats?.pGanancia ?? null} />}
              icon={<TrendingUp size={17} className="text-blue-600" />}
              accent="blue"
            />
            <StatCard
              label="Total gastos"
              value={formatCOP(stats?.totalGastos ?? 0)}
              subValue={<TrendBadge pct={stats?.pGastos ?? null} inverse />}
              icon={<DollarSign size={17} className="text-red-500" />}
              accent="red"
            />
            <StatCard
              label="Ganancia neta"
              value={formatCOP(stats?.gananciaN ?? 0)}
              subValue={<TrendBadge pct={stats?.pNeta ?? null} />}
              icon={<TrendingUp size={17} className="text-purple-600" />}
              accent="purple"
            />
          </div>

          {/* ── KPI Row 2 — Inventario y cuentas ────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Compras a proveedores"
              value={formatCOP(stats?.totalCompras ?? 0)}
              subValue={<TrendBadge pct={stats?.pCompras ?? null} inverse />}
              icon={<Truck size={17} className="text-amber-600" />}
              accent="orange"
            />
            <StatCard
              label="Cuentas por cobrar"
              value={formatCOP(stats?.cuentasPorCobrar ?? 0)}
              subValue={`${data.cuentas_abiertas} abiertas`}
              icon={<Receipt size={17} className="text-yellow-600" />}
              accent="yellow"
            />
            <StatCard
              label="Margen bruto / neto"
              value={`${(stats?.margen ?? 0).toFixed(1)}%`}
              subValue={`Neto ${(stats?.margenNeto ?? 0).toFixed(1)}%`}
              icon={<BarChart2 size={17} className="text-blue-600" />}
              accent="blue"
            />
            <StatCard
              label="Ticket promedio"
              value={formatCOP(stats?.ticketProm ?? 0)}
              subValue={`${stats?.numVentas ?? 0} transacciones`}
              icon={<ShoppingCart size={17} className="t-text" />}
              accent="green"
            />
          </div>

          {/* ── Estado de Resultados (P&L) + Flujo de caja ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* P&L */}
            <Card padding={false}>
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <FileText size={15} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-800">Estado de Resultados</h2>
                <span className="ml-auto text-[10px] text-slate-400 uppercase tracking-wider">P&amp;L del mes</span>
              </div>
              <div className="p-4 text-sm space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>Ingresos por ventas</span>
                  <span className="font-semibold tabular-nums">{formatCOP(stats?.totalVentas ?? 0)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span className="pl-3">− Costo mercancía vendida (COGS)</span>
                  <span className="tabular-nums">− {formatCOP(stats?.cogs ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-blue-700">
                  <span>= Ganancia bruta</span>
                  <span className="tabular-nums">{formatCOP(stats?.gananciaB ?? 0)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span className="pl-3">− Gastos operativos</span>
                  <span className="tabular-nums">− {formatCOP(stats?.totalGastos ?? 0)}</span>
                </div>
                <div className={`flex justify-between border-t-2 pt-2 font-bold ${
                  (stats?.gananciaN ?? 0) >= 0
                    ? 'border-emerald-200 text-emerald-700'
                    : 'border-rose-200 text-rose-700'
                }`}>
                  <span>= Ganancia neta</span>
                  <span className="tabular-nums">{formatCOP(stats?.gananciaN ?? 0)}</span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  Margen bruto {(stats?.margen ?? 0).toFixed(1)}% · Margen neto {(stats?.margenNeto ?? 0).toFixed(1)}%
                </p>
              </div>
            </Card>

            {/* Flujo de caja */}
            <Card padding={false}>
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <Wallet size={15} className="text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-800">Flujo de Caja</h2>
                <span className="ml-auto text-[10px] text-slate-400 uppercase tracking-wider">Cash flow</span>
              </div>
              <div className="p-4 text-sm space-y-2">
                <div className="flex justify-between text-emerald-700">
                  <span>+ Pagos recibidos</span>
                  <span className="font-semibold tabular-nums">+ {formatCOP(stats?.totalPagos ?? 0)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>− Gastos pagados</span>
                  <span className="tabular-nums">− {formatCOP(stats?.totalGastos ?? 0)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>− Compras a proveedores</span>
                  <span className="tabular-nums">− {formatCOP(stats?.totalCompras ?? 0)}</span>
                </div>
                <div className={`flex justify-between border-t-2 pt-2 font-bold ${
                  (stats?.flujoCaja ?? 0) >= 0
                    ? 'border-emerald-200 text-emerald-700'
                    : 'border-rose-200 text-rose-700'
                }`}>
                  <span>= Flujo neto del mes</span>
                  <span className="tabular-nums">{formatCOP(stats?.flujoCaja ?? 0)}</span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
                  Plata real que entró/salió. Distinto a ganancia: ignora ventas a crédito sin cobrar y stock no vendido.
                </p>
              </div>
            </Card>
          </div>

          {/* ── Estado de cuentas ─────────────────────────────────────────────── */}
          <Card padding={false}>
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <BookOpen size={15} className="text-yellow-600" />
              <h2 className="text-sm font-semibold text-slate-800">Cuentas de crédito</h2>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              <div className="p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Abiertas</p>
                <p className="text-lg font-bold text-yellow-700">{data.cuentas_abiertas}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Pagadas este mes</p>
                <p className="text-lg font-bold text-emerald-700">{data.cuentas_pagadas}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Por cobrar</p>
                <p className="text-lg font-bold text-rose-600 tabular-nums">{formatCOP(stats?.cuentasPorCobrar ?? 0)}</p>
              </div>
            </div>
          </Card>

          {/* ── Ventas por día (BarChart) ─────────────────────────────────── */}
          {chartData.length > 0 && (
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <TrendingUp size={15} className="t-text" />
                <h2 className="text-sm font-semibold text-slate-800">Evolución del mes</h2>
                <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm t-bg inline-block" />Ventas</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 inline-block" />Ganancia</span>
                </div>
              </div>
              <div className="px-2 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="dia"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={44}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="ventas"   name="Ventas"   fill="var(--t-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="ganancia" name="Ganancia" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── Top productos + Comparativa ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top productos — donut + lista */}
            <Card padding={false} className="lg:col-span-2">
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <Package size={15} className="text-purple-600" />
                <h2 className="text-sm font-semibold text-slate-800">Top productos del mes</h2>
              </div>
              {topProductos.length === 0 ? (
                <div className="p-6"><EmptyState title="Sin ventas registradas" /></div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-0">
                  {/* Donut */}
                  <div className="flex items-center justify-center p-4 sm:w-[220px] shrink-0">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={topProductos}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={82}
                          paddingAngle={3}
                          dataKey="total"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {topProductos.map((_, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const item = payload[0]
                            const tot = topProductos.reduce((s, p) => s + p.total, 0)
                            const pct = tot > 0 ? ((item?.value as number ?? 0) / tot * 100).toFixed(1) : '0'
                            return (
                              <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs max-w-[180px]">
                                <p className="font-semibold text-slate-700 truncate mb-1">{item?.name ?? ''}</p>
                                <p className="text-slate-500">Total: <span className="font-bold text-slate-800">{formatCOP(item?.value as number ?? 0)}</span></p>
                                <p className="text-slate-400">{pct}% del mes</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Lista */}
                  <div className="flex-1 px-4 pb-4 pt-2 sm:pt-4 space-y-2.5 border-t sm:border-t-0 sm:border-l border-slate-50">
                    {topProductos.map((p, i) => {
                      const tot = topProductos.reduce((s, x) => s + x.total, 0)
                      const pct = tot > 0 ? ((p.total / tot) * 100).toFixed(0) : '0'
                      return (
                        <div key={p.producto_id} className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs text-slate-700 font-medium truncate">{p.nombre}</span>
                              <span className="text-xs font-bold text-slate-800 tabular-nums shrink-0">{formatCOP(p.total)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{pct}% · {p.unidades} uds · {p.num_ventas} ventas</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Comparativa vs mes anterior */}
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <BarChart2 size={15} className="text-orange-500" />
                <h2 className="text-sm font-semibold text-slate-800">Vs. {MONTHS_ES[prevMon - 1]}</h2>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: 'Ventas',      curr: stats?.totalVentas ?? 0, prev: prevData?.total_ventas ?? 0, color: 'text-slate-700' },
                  { label: 'Ganancia',    curr: stats?.gananciaB ?? 0,   prev: prevData?.ganancia_bruta ?? 0, color: 'text-green-600' },
                  { label: 'Gastos',      curr: stats?.totalGastos ?? 0, prev: prevData?.total_gastos ?? 0, color: 'text-red-500', inverse: true },
                  { label: 'Neta',        curr: stats?.gananciaN ?? 0,   prev: (prevData?.ganancia_bruta ?? 0) - (prevData?.total_gastos ?? 0), color: (stats?.gananciaN ?? 0) >= 0 ? 'text-green-700' : 'text-red-700' },
                ].map(({ label, curr, prev, color, inverse }) => {
                  const p = pct(curr, prev)
                  const positive = p === null ? null : (inverse ? p < 0 : p > 0)
                  return (
                    <div key={label}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-slate-500">{label}</span>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${color} tabular-nums`}>{formatCOP(curr)}</p>
                          {p !== null && (
                            <span className={`text-[10px] font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
                              {positive ? '▲' : '▼'} {Math.abs(p).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-300 rounded-full" style={{ width: prev > 0 ? `${Math.min(100, (prev / Math.max(curr, prev)) * 100)}%` : '0%' }} />
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">{(MONTHS_ES[prevMon - 1] ?? '').slice(0, 3)}</p>
                        </div>
                        <div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: curr > 0 ? `${Math.min(100, (curr / Math.max(curr, prev)) * 100)}%` : '0%', backgroundColor: color.includes('green') ? '#16a34a' : color.includes('red') ? '#ef4444' : color.includes('slate') ? '#64748b' : '#64748b' }} />
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">{(MONTHS_ES[month - 1] ?? '').slice(0, 3)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* ── Gastos breakdown ─────────────────────────────────────────── */}
          {gastosAgrupados.length > 0 && (
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <DollarSign size={15} className="text-red-500" />
                <h2 className="text-sm font-semibold text-slate-800">Desglose de gastos</h2>
                <span className="ml-auto text-xs text-slate-400">{gastos.length} registro{gastos.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-4 space-y-3">
                {gastosAgrupados.map(({ desc, total }, i) => {
                  const maxG = gastosAgrupados[0]?.total || 1
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-700 font-medium truncate flex-1 max-w-[200px]">{desc}</span>
                      <div className="flex-1 mx-2">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${(total / maxG) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-800 tabular-nums shrink-0">{formatCOP(total)}</span>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <span className="text-xs text-slate-500 font-medium">Total gastos</span>
                  <span className="text-sm font-bold text-red-600 tabular-nums">{formatCOP(stats?.totalGastos ?? 0)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* ── Auto-insights ─────────────────────────────────────────────── */}
          {insights.length > 0 && (
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <Lightbulb size={15} className="text-yellow-500" />
                <h2 className="text-sm font-semibold text-slate-800">Insights automáticos</h2>
                <span className="ml-auto text-[10px] text-slate-400">Generado para {MONTHS_ES[month - 1]} {year}</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((insight, i) => (
                  <InsightCard key={i} {...insight} />
                ))}
              </div>
            </Card>
          )}

          {/* ── Ventas por día tabla ──────────────────────────────────────── */}
          {data.ventas_por_dia.length > 0 && (
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <ShoppingCart size={15} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-800">Detalle por día</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Fecha</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Trans.</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Total</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Ganancia</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ventas_por_dia.map((d, i) => {
                      const margenDia = d.total > 0 ? (d.ganancia / d.total) * 100 : 0
                      const fecha = new Date(d.dia + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
                      const maxDia = Math.max(...data.ventas_por_dia.map(x => x.total))
                      const widthPct = maxDia > 0 ? (d.total / maxDia) * 100 : 0
                      return (
                        <tr key={d.dia} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-0.5 t-bg rounded-full shrink-0" style={{ opacity: widthPct / 100 }} />
                              <span className="text-xs text-slate-600 capitalize">{fecha}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-500 tabular-nums hidden sm:table-cell">{d.num_ventas}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">{formatCOP(d.total)}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold text-green-700 tabular-nums whitespace-nowrap">{formatCOP(d.ganancia)}</td>
                          <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${margenDia >= 20 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {margenDia.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td className="px-3 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">Total del mes</td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600 tabular-nums hidden sm:table-cell">{stats?.numVentas}</td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap">{formatCOP(stats?.totalVentas ?? 0)}</td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-green-700 tabular-nums whitespace-nowrap">{formatCOP(stats?.gananciaB ?? 0)}</td>
                      <td className="px-3 py-3 text-right hidden sm:table-cell">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${(stats?.margen ?? 0) >= 20 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {(stats?.margen ?? 0).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
