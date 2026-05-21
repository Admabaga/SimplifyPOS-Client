import { useState, useMemo } from 'react'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, BookOpen,
  Package, Lightbulb, ArrowUpRight, ArrowDownRight, BarChart2,
  Minus, ChevronLeft, ChevronRight, Truck, Wallet, FileText, Receipt,
  CalendarDays, Percent, CheckCircle2, PieChart as PieChartIcon,
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

// ── Insight card — rich version ──────────────────────────────────────────────
type InsightSeverity = 'success' | 'warning' | 'danger' | 'info' | 'opportunity'

interface Insight {
  severity: InsightSeverity
  icon: React.ReactNode
  title: string
  description: string
  metric?: string             // Valor numérico destacado
  metricLabel?: string        // Etiqueta del valor
  action?: string             // CTA opcional
}

const SEVERITY_STYLES: Record<InsightSeverity, { wrapper: string; iconWrap: string; chip: string; badge: string; metric: string; label: string }> = {
  success: {
    wrapper: 'border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-50/30',
    iconWrap: 'bg-white text-emerald-600',
    chip: 'bg-emerald-100 text-emerald-700',
    badge: 'Buena señal',
    metric: 'text-emerald-700',
    label: 'text-emerald-600/70',
  },
  warning: {
    wrapper: 'border-amber-100 bg-gradient-to-br from-amber-50 to-amber-50/30',
    iconWrap: 'bg-white text-amber-600',
    chip: 'bg-amber-100 text-amber-700',
    badge: 'Atención',
    metric: 'text-amber-700',
    label: 'text-amber-600/70',
  },
  danger: {
    wrapper: 'border-red-100 bg-gradient-to-br from-red-50 to-red-50/30',
    iconWrap: 'bg-white text-red-600',
    chip: 'bg-red-100 text-red-700',
    badge: 'Crítico',
    metric: 'text-red-700',
    label: 'text-red-600/70',
  },
  info: {
    wrapper: 'border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/30',
    iconWrap: 'bg-white text-blue-600',
    chip: 'bg-blue-100 text-blue-700',
    badge: 'Dato',
    metric: 'text-blue-700',
    label: 'text-blue-600/70',
  },
  opportunity: {
    wrapper: 'border-violet-100 bg-gradient-to-br from-violet-50 to-violet-50/30',
    iconWrap: 'bg-white text-violet-600',
    chip: 'bg-violet-100 text-violet-700',
    badge: 'Oportunidad',
    metric: 'text-violet-700',
    label: 'text-violet-600/70',
  },
}

function InsightCard({ severity, icon, title, description, metric, metricLabel, action }: Insight) {
  const s = SEVERITY_STYLES[severity]
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 ${s.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center shrink-0 ${s.iconWrap}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${s.chip}`}>{s.badge}</span>
            <p className="text-sm font-bold text-slate-800 truncate">{title}</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
          {(metric || action) && (
            <div className="mt-2.5 flex items-end justify-between gap-3 flex-wrap">
              {metric && (
                <div className="leading-none">
                  <p className={`text-lg font-bold tabular-nums ${s.metric}`}>{metric}</p>
                  {metricLabel && <p className={`text-[10px] mt-1 font-medium ${s.label}`}>{metricLabel}</p>}
                </div>
              )}
              {action && (
                <p className="text-[11px] font-semibold text-slate-500 italic">→ {action}</p>
              )}
            </div>
          )}
        </div>
      </div>
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
  const isDesktop = useIsDesktop()
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

  // ── Auto-insights — análisis profundo accionable ──────────────────────────
  const insights = useMemo<Insight[]>(() => {
    if (!data || !stats) return []
    const out: Insight[] = []
    const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    // 1) Día de la semana más fuerte (correlación, no solo "mejor día único")
    const byWeekday = new Map<number, { total: number; count: number; days: number }>()
    for (const d of data.ventas_por_dia) {
      const dow = new Date(d.dia + 'T00:00:00').getDay()
      const prev = byWeekday.get(dow) ?? { total: 0, count: 0, days: 0 }
      byWeekday.set(dow, { total: prev.total + d.total, count: prev.count + d.num_ventas, days: prev.days + 1 })
    }
    const weekdayRanking = Array.from(byWeekday.entries())
      .map(([dow, v]) => ({ dow, avg: v.days > 0 ? v.total / v.days : 0, total: v.total }))
      .filter(x => x.avg > 0)
      .sort((a, b) => b.avg - a.avg)

    if (weekdayRanking.length >= 2) {
      const best = weekdayRanking[0]!
      const worst = weekdayRanking[weekdayRanking.length - 1]!
      const ratio = worst.avg > 0 ? best.avg / worst.avg : 0
      if (ratio >= 1.5) {
        out.push({
          severity: 'opportunity',
          icon: <CalendarDays size={16} />,
          title: `Los ${DAY_NAMES[best.dow]}s venden ${ratio.toFixed(1)}× más que los ${DAY_NAMES[worst.dow]}s`,
          description: `Tu mejor día promedio es ${DAY_NAMES[best.dow]} con ${formatCOP(best.avg)}. Considera reforzar inventario y personal ese día, y promociones en ${DAY_NAMES[worst.dow]} para nivelar.`,
          metric: formatCOP(best.avg),
          metricLabel: `Promedio ${DAY_NAMES[best.dow]}`,
          action: `Refuerza stock los ${DAY_NAMES[best.dow]}s`,
        })
      }
    }

    // 2) Concentración Pareto del producto top
    if (topProductos[0] && stats.totalVentas > 0) {
      const topShare = (topProductos[0].total / stats.totalVentas) * 100
      const top3Share = topProductos.slice(0, 3).reduce((s, p) => s + p.total, 0) / stats.totalVentas * 100
      if (topShare >= 30) {
        out.push({
          severity: 'warning',
          icon: <Package size={16} />,
          title: `Dependes mucho de "${topProductos[0].nombre}"`,
          description: `Este producto solo representa el ${topShare.toFixed(0)}% de tus ventas (${formatCOP(topProductos[0].total)}). Si se agota o sube de costo, te impacta fuerte. Diversifica el catálogo o asegura proveedor backup.`,
          metric: `${topShare.toFixed(0)}%`,
          metricLabel: 'del total de ventas',
          action: 'Diversifica catálogo',
        })
      } else if (top3Share >= 60) {
        out.push({
          severity: 'info',
          icon: <Package size={16} />,
          title: `Tus 3 productos top mueven el ${top3Share.toFixed(0)}% del negocio`,
          description: `Concentración saludable. "${topProductos[0].nombre}" lidera con ${formatCOP(topProductos[0].total)} (${topProductos[0].unidades} u.). Mantén stock prioritario y vigila márgenes.`,
          metric: formatCOP(topProductos[0].total),
          metricLabel: topProductos[0].nombre,
        })
      }
    }

    // 3) Margen — con consejo accionable
    if (stats.totalVentas > 0) {
      if (stats.margen < 15) {
        out.push({
          severity: 'danger',
          icon: <TrendingDown size={16} />,
          title: 'Margen bruto crítico',
          description: `Estás ganando solo ${stats.margen.toFixed(1)}% sobre cada venta. Después de gastos operativos, podrías estar perdiendo. Revisa precios de venta (sube 5-10%) o renegocia con proveedores los productos de mayor volumen.`,
          metric: `${stats.margen.toFixed(1)}%`,
          metricLabel: 'Margen bruto',
          action: 'Sube precios o renegocia',
        })
      } else if (stats.margen < 25) {
        out.push({
          severity: 'warning',
          icon: <Percent size={16} />,
          title: 'Margen ajustado — hay espacio para crecer',
          description: `Tu margen bruto es ${stats.margen.toFixed(1)}%. Un POS profesional opera entre 25-40%. Identifica los productos con menor margen y ajusta precio o costo.`,
          metric: `${stats.margen.toFixed(1)}%`,
          metricLabel: 'Margen bruto',
          action: 'Audita productos de bajo margen',
        })
      } else {
        out.push({
          severity: 'success',
          icon: <Percent size={16} />,
          title: 'Margen saludable',
          description: `${stats.margen.toFixed(1)}% de margen bruto generan ${formatCOP(stats.gananciaB)} sobre ${formatCOP(stats.totalVentas)} en ventas. Mantén pricing y vigila que los costos no suban.`,
          metric: formatCOP(stats.gananciaB),
          metricLabel: 'Ganancia bruta',
        })
      }
    }

    // 4) Ticket promedio + recomendación de upsell
    if (stats.numVentas >= 5) {
      out.push({
        severity: 'info',
        icon: <Receipt size={16} />,
        title: `Ticket promedio: ${formatCOP(stats.ticketProm)}`,
        description: `Hiciste ${stats.numVentas} ventas este mes. Subir el ticket un 10% (combos, productos complementarios, presentaciones más grandes) sumaría ${formatCOP(stats.ticketProm * stats.numVentas * 0.1)} sin atraer un solo cliente nuevo.`,
        metric: formatCOP(stats.ticketProm * stats.numVentas * 0.1),
        metricLabel: 'Potencial extra con +10% ticket',
        action: 'Implementa combos / upsell',
      })
    }

    // 5) Gastos vs ganancia — alerta inteligente
    if (stats.gananciaB > 0) {
      const gastosRatio = (stats.totalGastos / stats.gananciaB) * 100
      if (gastosRatio > 80) {
        out.push({
          severity: 'danger',
          icon: <DollarSign size={16} />,
          title: 'Los gastos se están comiendo la ganancia',
          description: `Gastas ${formatCOP(stats.totalGastos)} para generar ${formatCOP(stats.gananciaB)} de ganancia bruta (${gastosRatio.toFixed(0)}%). Identifica el rubro más alto en "Gastos" y revisa si es recortable.`,
          metric: `${gastosRatio.toFixed(0)}%`,
          metricLabel: 'Gastos / ganancia bruta',
          action: 'Audita gastos del mes',
        })
      } else if (gastosRatio > 50) {
        out.push({
          severity: 'warning',
          icon: <DollarSign size={16} />,
          title: 'Gastos altos vs ganancia',
          description: `Gastas el ${gastosRatio.toFixed(0)}% de tu ganancia bruta en operación. Saludable está debajo de 40%. Revisa gastos recurrentes (arriendo, servicios, publicidad).`,
          metric: formatCOP(stats.totalGastos),
          metricLabel: 'Total gastos',
        })
      } else if (stats.gananciaN > 0) {
        out.push({
          severity: 'success',
          icon: <CheckCircle2 size={16} />,
          title: 'Ganancia neta positiva',
          description: `Después de pagar todo, te quedan ${formatCOP(stats.gananciaN)} libres (${stats.margenNeto.toFixed(1)}% margen neto). Excelente control de gastos.`,
          metric: formatCOP(stats.gananciaN),
          metricLabel: 'Ganancia neta del mes',
        })
      }
    }

    // 6) Categoría de gasto más alta
    if (gastosAgrupados.length > 0 && stats.totalGastos > 0) {
      const top = gastosAgrupados[0]!
      const topShare = (top.total / stats.totalGastos) * 100
      if (topShare >= 40) {
        out.push({
          severity: 'warning',
          icon: <PieChartIcon size={16} />,
          title: `"${top.desc}" concentra ${topShare.toFixed(0)}% de tus gastos`,
          description: `${formatCOP(top.total)} de ${formatCOP(stats.totalGastos)}. Si es un gasto fijo, busca opciones más económicas. Si es variable, evalúa si está bien dimensionado.`,
          metric: formatCOP(top.total),
          metricLabel: top.desc,
        })
      }
    }

    // 7) Cuentas por cobrar — DSO (Days Sales Outstanding) aproximado
    if (data.cuentas_abiertas > 0 && stats.totalVentas > 0) {
      const porCobrar = Number(stats.cuentasPorCobrar) || 0
      const dso = porCobrar > 0 ? (porCobrar / (stats.totalVentas / 30)) : 0
      if (porCobrar > stats.totalVentas * 0.2) {
        out.push({
          severity: 'warning',
          icon: <BookOpen size={16} />,
          title: `${formatCOP(porCobrar)} pendientes de cobro`,
          description: `${data.cuentas_abiertas} cuenta${data.cuentas_abiertas !== 1 ? 's' : ''} abierta${data.cuentas_abiertas !== 1 ? 's' : ''}. Equivale a ~${dso.toFixed(0)} días de venta sin cobrar. Llama o envía recordatorios — el dinero en la calle no te sirve.`,
          metric: `${dso.toFixed(0)} días`,
          metricLabel: 'de ventas sin cobrar',
          action: 'Activa cobranza',
        })
      } else {
        out.push({
          severity: 'info',
          icon: <BookOpen size={16} />,
          title: `${data.cuentas_abiertas} cuenta${data.cuentas_abiertas !== 1 ? 's' : ''} abierta${data.cuentas_abiertas !== 1 ? 's' : ''}`,
          description: `Tienes ${formatCOP(porCobrar)} pendientes y ya cobraste ${data.cuentas_pagadas} cuenta${data.cuentas_pagadas !== 1 ? 's' : ''} este mes. Ritmo de cobro sano.`,
          metric: formatCOP(porCobrar),
          metricLabel: 'Por cobrar',
        })
      }
    }

    // 8) Comparativo mes anterior — con tendencia
    if (stats.pVentas !== null && prevData) {
      const delta = stats.totalVentas - prevData.total_ventas
      if (stats.pVentas > 15) {
        out.push({
          severity: 'success',
          icon: <ArrowUpRight size={16} />,
          title: `¡Creciste ${stats.pVentas.toFixed(1)}% vs ${MONTHS_ES[prevMon - 1]}!`,
          description: `${formatCOP(prevData.total_ventas)} → ${formatCOP(stats.totalVentas)}. Identifica qué hiciste distinto este mes (campañas, nuevos productos, días extra) y repítelo.`,
          metric: `+${formatCOP(delta)}`,
          metricLabel: 'vs mes anterior',
        })
      } else if (stats.pVentas < -15) {
        out.push({
          severity: 'danger',
          icon: <ArrowDownRight size={16} />,
          title: `Caída del ${Math.abs(stats.pVentas).toFixed(1)}% vs ${MONTHS_ES[prevMon - 1]}`,
          description: `${formatCOP(prevData.total_ventas)} → ${formatCOP(stats.totalVentas)}. Revisa: ¿hubo días cerrados? ¿faltó stock? ¿cambió algo en el barrio/zona? Actúa ya: una promo agresiva esta semana.`,
          metric: formatCOP(Math.abs(delta)),
          metricLabel: 'Menos que el mes pasado',
          action: 'Lanza promo de recuperación',
        })
      } else if (Math.abs(stats.pVentas) < 5) {
        out.push({
          severity: 'info',
          icon: <Minus size={16} />,
          title: 'Mes estable vs el anterior',
          description: `Cambio del ${stats.pVentas.toFixed(1)}% — operación predecible. Para crecer necesitas mover una palanca: más tráfico, ticket más alto, o nuevo canal de venta.`,
          metric: `${stats.pVentas >= 0 ? '+' : ''}${stats.pVentas.toFixed(1)}%`,
          metricLabel: 'vs mes anterior',
        })
      }
    }

    // 9) Flujo de caja vs ventas
    if (stats.flujoCaja !== undefined && stats.totalVentas > 0) {
      const flujo = Number(stats.flujoCaja) || 0
      if (flujo < 0) {
        out.push({
          severity: 'danger',
          icon: <Wallet size={16} />,
          title: 'Flujo de caja negativo',
          description: `Saliste ${formatCOP(Math.abs(flujo))} más de lo que entró en caja. Aunque las ventas sean buenas, si sigues así te quedas sin liquidez. Revisa ventas a crédito y gastos pagados con efectivo.`,
          metric: formatCOP(Math.abs(flujo)),
          metricLabel: 'Salida neta',
          action: 'Reduce ventas a crédito',
        })
      }
    }

    return out
  }, [data, stats, topProductos, gastosAgrupados, prevData, prevMon])

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

      <div className="reports-content min-h-[500px]">
      {isLoading ? (
        <div className="flex justify-center py-20" key="loading"><Spinner size={32} /></div>
      ) : !data ? (
        <EmptyState icon={<TrendingUp size={48} />} title="Sin datos para este período" description="Ajusta el mes y año para ver el reporte" />
      ) : (
        <div key={`${year}-${month}`} className="space-y-5">

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
              {isDesktop ? (
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
              ) : (
                <div className="px-4 py-5 text-center text-xs text-slate-400">Gráfico disponible en pantallas más grandes</div>
              )}
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
                  {isDesktop && (
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
                  )}
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
              <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center">
                    <Lightbulb size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 leading-tight">Análisis inteligente</h2>
                    <p className="text-[11px] text-slate-500 leading-tight">{insights.length} {insights.length === 1 ? 'hallazgo' : 'hallazgos'} para {MONTHS_ES[month - 1]} {year}</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                  Auto-generado
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
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
    </div>
  )
}
