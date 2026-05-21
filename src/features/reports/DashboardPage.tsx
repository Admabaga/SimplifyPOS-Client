import React, { useMemo, useState } from 'react'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart, TrendingUp, DollarSign, Users, Package, ArrowUpRight,
  ArrowDownRight, Minus, BarChart3, CreditCard, AlertCircle,
  CheckCircle2, ChevronRight, Store, Wallet, X,
} from 'lucide-react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { reportesApi } from './api'
import { productsApi } from '@/features/products/api'
import { cuentasApi } from '@/features/accounts/api'
import { billingApi } from '@/features/billing/api'
import { Card, Spinner, Badge, StatCard, TabBar } from '@/shared/components/ui'
import { AIAdvisorPanel } from '@/shared/components/AIAdvisorPanel'
import { aiApi } from '@/shared/api/aiApi'
import { formatCOP, MONTHS_ES } from '@/shared/lib/formatters'
const BOG = 'America/Bogota'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/shared/api/client'

// ─── Types ───────────────────────────────────────────────────────────────────

type Periodo = 'mes' | 'semana' | 'hoy'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold" style={{ color: p.color }}>{formatCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 truncate mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold t-text-dk">{formatCOP(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function calcTrend(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return ((current - prev) / prev) * 100
}

function TrendIcon({ pct }: { pct: number }) {
  if (pct > 0)  return <ArrowUpRight   size={14} className="text-green-600 shrink-0" />
  if (pct < 0)  return <ArrowDownRight size={14} className="text-red-500 shrink-0" />
  return              <Minus           size={14} className="text-slate-400 shrink-0" />
}

function getWeekRange() {
  const now = new Date()
  const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1)
  const prev  = new Date(start); prev.setDate(prev.getDate() - 7)
  return { start, prevStart: prev }
}

function isThisWeek(dateStr: string, start: Date): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const end = new Date(start); end.setDate(start.getDate() + 6)
  return d >= start && d <= end
}

function isLastWeek(dateStr: string, prevStart: Date): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const prevEnd = new Date(prevStart); prevEnd.setDate(prevStart.getDate() + 6)
  return d >= prevStart && d <= prevEnd
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getYesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const isDesktop = useIsDesktop()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const now = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const prevYear  = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1

  const canSeeReports = !!user?.permissions?.includes('reportes:read')
  const canSeeVentas  = !!user?.permissions?.includes('ventas:read')
  const mesActual = MONTHS_ES[month - 1] ?? ''
  const mesAnterior = MONTHS_ES[prevMonth - 1] ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', year, month],
    queryFn: () => reportesApi.monthly(year, month),
    enabled: canSeeReports || canSeeVentas,
  })

  const { data: dataPrev } = useQuery({
    queryKey: ['reports', 'monthly', prevYear, prevMonth],
    queryFn: () => reportesApi.monthly(prevYear, prevMonth),
    enabled: canSeeReports || canSeeVentas,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
    enabled: canSeeReports,
  })

  const { data: cuentas = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => cuentasApi.getAll(),
  })

  const productName = (id: number) => products.find((p) => p.id === id)?.nombre ?? `Producto #${id}`

  // ── Comparativas ──────────────────────────────────────────────────────────
  const comparativas = useMemo(() => {
    if (!data?.ventas_por_dia) return null
    const vpd: { dia: string; num_ventas: number; total: number; ganancia: number }[] = data.ventas_por_dia
    const today = getToday()
    const yesterday = getYesterday()
    const { start, prevStart } = getWeekRange()

    const totalHoy      = vpd.filter((d) => d.dia === today).reduce((s, d) => s + d.total, 0)
    const totalAyer     = vpd.filter((d) => d.dia === yesterday).reduce((s, d) => s + d.total, 0)
    const gananciaHoy   = vpd.filter((d) => d.dia === today).reduce((s, d) => s + d.ganancia, 0)

    const totalSemana     = vpd.filter((d) => isThisWeek(d.dia, start)).reduce((s, d) => s + d.total, 0)
    const gananciasSemana = vpd.filter((d) => isThisWeek(d.dia, start)).reduce((s, d) => s + d.ganancia, 0)

    // Semana pasada del mes anterior no disponible sin query extra — usamos ventas_por_dia del mes actual
    const totalSemPasada = vpd.filter((d) => isLastWeek(d.dia, prevStart)).reduce((s, d) => s + d.total, 0)

    const trendHoy  = calcTrend(totalHoy, totalAyer)
    const trendSem  = calcTrend(totalSemana, totalSemPasada)
    const trendMes  = calcTrend(data.total_ventas, dataPrev?.total_ventas ?? 0)

    return {
      hoy: totalHoy, ayer: totalAyer, gananciaHoy,
      semana: totalSemana, gananciasSemana, semPasada: totalSemPasada,
      mes: data.total_ventas, mesAnterior: dataPrev?.total_ventas ?? 0,
      trendHoy, trendSem, trendMes,
    }
  }, [data, dataPrev])

  // ── Chart data ───────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data?.ventas_por_dia) return []
    return data.ventas_por_dia
      .slice(-30)
      .map((d: { dia: string; total: number; ganancia: number }) => ({
        dia:      new Date(d.dia + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: BOG }),
        ventas:   d.total,
        ganancia: d.ganancia,
      }))
  }, [data])

  const topChartData = useMemo(() => {
    if (!data?.top_productos) return []
    return data.top_productos.slice(0, 6).map((p: { producto_id: number; total: number; unidades: number }) => ({
      nombre:   productName(p.producto_id).slice(0, 22),
      total:    p.total,
      unidades: p.unidades,
    }))
  }, [data, products])

  // ── Stats rápidas de cuentas ──────────────────────────────────────────────
  const cuentasStats = useMemo(() => {
    const abiertas = cuentas.filter((c) => !c.esta_pagada)
    const deuda    = abiertas.reduce((s, c) => s + (c.valor_pendiente ?? 0), 0)
    return { abiertas: abiertas.length, deuda }
  }, [cuentas])

  // ── KPI datos según período ───────────────────────────────────────────────
  const periodoLabels: Record<Periodo, string> = {
    hoy: 'hoy', semana: 'esta semana', mes: `${mesActual}`,
  }

  const periodoData = useMemo(() => {
    if (!comparativas) return { ventas: 0, ganancia: 0, trend: 0, vsLabel: '' }
    switch (periodo) {
      case 'hoy':    return { ventas: comparativas.hoy,    ganancia: comparativas.gananciaHoy,     trend: comparativas.trendHoy, vsLabel: 'vs ayer' }
      case 'semana': return { ventas: comparativas.semana, ganancia: comparativas.gananciasSemana,  trend: comparativas.trendSem, vsLabel: 'vs sem. pasada' }
      case 'mes':    return { ventas: comparativas.mes,    ganancia: data?.ganancia_bruta ?? 0,     trend: comparativas.trendMes, vsLabel: `vs ${mesAnterior}` }
    }
  }, [comparativas, periodo, data])

  const COLORS = ['var(--t-primary)', '#2563eb', '#9333ea', '#f59e0b', '#ef4444', '#06b6d4']

  // ── Vista supervisor (ventas:read, sin reportes:read) ────────────────────
  if (!canSeeReports && canSeeVentas) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">¡Hola, {user?.nombre ?? 'usuario'}! </h1>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
              {mesActual} {year}
              <Badge variant="green" dot>supervisor</Badge>
            </p>
          </div>
          <TabBar
            tabs={[
              { key: 'hoy',    label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes',    label: 'Mes' },
            ]}
            active={periodo}
            onChange={(k) => setPeriodo(k as Periodo)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : !data ? (
          <Card className="py-12 text-center">
            <ShoppingCart size={36} className="t-text mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Sin ventas este mes</p>
            <p className="text-sm text-slate-400 mt-1.5">Ve a <strong>Cuentas</strong> para registrar ventas.</p>
          </Card>
        ) : (
          <>
            {/* KPIs de ventas — sin ganancia ni gastos */}
            {comparativas && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={`Ventas ${periodoLabels[periodo]}`}
                  value={formatCOP(periodoData.ventas)}
                  icon={<ShoppingCart size={17} className="t-text" />}
                  accent="green"
                  trend={periodoData.trend}
                  trendLabel={periodoData.vsLabel}
                />
                <StatCard
                  label="Cuentas abiertas"
                  value={String(cuentasStats.abiertas)}
                  subValue={`Pendiente: ${formatCOP(cuentasStats.deuda)}`}
                  icon={<Users size={17} className="text-yellow-600" />}
                  accent="yellow"
                />
              </div>
            )}

            {/* Comparativas ventas */}
            {comparativas && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Hoy vs ayer',           current: comparativas.hoy,    prev: comparativas.ayer,       pct: comparativas.trendHoy },
                  { label: 'Semana vs anterior',     current: comparativas.semana, prev: comparativas.semPasada,  pct: comparativas.trendSem },
                  { label: `${mesActual} vs ${mesAnterior}`, current: comparativas.mes, prev: comparativas.mesAnterior, pct: comparativas.trendMes },
                ].map((c) => (
                  <Card key={c.label} className="p-3">
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">{c.label}</p>
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">{formatCOP(c.current)}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">vs {formatCOP(c.prev)}</p>
                      </div>
                      <div className={clsx(
                        'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-1 rounded-lg shrink-0',
                        c.pct > 0 ? 'bg-green-50 text-green-700' : c.pct < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                      )}>
                        <TrendIcon pct={c.pct} />
                        {c.pct > 0 ? '+' : ''}{c.pct.toFixed(1)}%
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Ventas por día — chart simplificado */}
            {chartData.length > 0 && (
              <Card padding={false}>
                <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                  <TrendingUp size={15} className="t-text" />
                  <h2 className="text-sm font-semibold text-slate-800">Ventas por día — {mesActual}</h2>
                </div>
                {isDesktop ? (
                  <div className="px-2 pt-3 pb-2 overflow-hidden">
                    <ResponsiveContainer width="100%" height={160} minWidth={0}>
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                          interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={40} />
                        <Tooltip content={<BarTooltip />} />
                        <Bar dataKey="ventas" name="Ventas" fill="var(--t-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="px-4 py-5 text-center text-xs text-slate-400">Gráfico disponible en pantallas más grandes</div>
                )}
                <div className="px-4 py-3 border-t border-slate-50 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total {mesActual}</p>
                  <p className="text-base font-bold t-text-dk tabular-nums mt-0.5">{formatCOP(data.total_ventas)}</p>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    )
  }

  if (!canSeeReports) {
    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">¡Hola, {user?.nombre ?? 'usuario'}! 👋</h1>
          <p className="text-sm text-slate-500 mt-1">
            <Badge variant={user?.role === 'master' ? 'purple' : user?.role === 'admin' ? 'blue' : 'green'}>
              {user?.role}
            </Badge>
          </p>
        </div>
        <Card className="py-12 text-center">
          <Users size={36} className="t-text mx-auto mb-3" />
          <p className="font-semibold text-slate-700 text-base">Bienvenido, {user?.nombre}</p>
          <p className="text-sm text-slate-500 mt-1.5">Ve a <strong>Cuentas</strong> para registrar ventas y pagos.</p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Cuentas abiertas"
            value={String(cuentasStats.abiertas)}
            icon={<Users size={17} className="text-yellow-600" />}
            accent="yellow"
          />
          <StatCard
            label="Deuda pendiente"
            value={formatCOP(cuentasStats.deuda)}
            icon={<AlertCircle size={17} className="text-red-500" />}
            accent="red"
          />
        </div>
      </div>
    )
  }

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-28 gap-3">
      <Spinner size={36} />
      <p className="text-sm text-slate-400">Cargando dashboard...</p>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            ¡Hola, {user?.nombre ?? 'usuario'}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
            {mesActual} {year}
            <Badge variant={user?.role === 'master' ? 'purple' : user?.role === 'admin' ? 'blue' : 'green'} dot>
              {user?.role}
            </Badge>
          </p>
        </div>

        {/* Período selector */}
        <TabBar
          tabs={[
            { key: 'hoy',    label: 'Hoy' },
            { key: 'semana', label: 'Semana' },
            { key: 'mes',    label: 'Mes' },
          ]}
          active={periodo}
          onChange={(k) => setPeriodo(k as Periodo)}
        />
      </div>

      {/* Checklist de configuración — visible hasta que todo esté listo */}
      <GettingStartedChecklist />

      {!data ? (
        <Card className="py-14 text-center">
          <BarChart3 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Sin datos para {mesActual} {year}</p>
          <p className="text-sm text-slate-400 mt-1">Registra ventas o facturas para ver estadísticas.</p>
        </Card>
      ) : (
        <>
          {/* ── KPI Strip ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={`Ventas ${periodoLabels[periodo]}`}
              value={formatCOP(periodoData.ventas)}
              icon={<ShoppingCart size={17} className="t-text" />}
              accent="green"
              trend={periodoData.trend}
              trendLabel={periodoData.vsLabel}
            />
            <StatCard
              label="Ganancia bruta"
              value={formatCOP(periodoData.ganancia)}
              subValue={periodoData.ventas > 0 ? `${Math.round((periodoData.ganancia / periodoData.ventas) * 100)}% margen` : undefined}
              icon={<TrendingUp size={17} className="text-blue-600" />}
              accent="blue"
            />
            <StatCard
              label="Gastos del mes"
              value={formatCOP(data.total_gastos)}
              subValue={`Ganancia neta: ${formatCOP(data.ganancia_neta)}`}
              icon={<DollarSign size={17} className="text-red-500" />}
              accent="red"
            />
            <StatCard
              label="Cuentas abiertas"
              value={String(data.cuentas_abiertas)}
              subValue={`Deuda: ${formatCOP(cuentasStats.deuda)}`}
              icon={<Users size={17} className="text-yellow-600" />}
              accent="yellow"
            />
          </div>

          {/* ── Comparativas strip ─────────────────────────────────────────── */}
          {comparativas && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Hoy vs ayer',
                  current: comparativas.hoy, prev: comparativas.ayer,
                  pct: comparativas.trendHoy,
                },
                {
                  label: 'Semana vs anterior',
                  current: comparativas.semana, prev: comparativas.semPasada,
                  pct: comparativas.trendSem,
                },
                {
                  label: `${mesActual} vs ${mesAnterior}`,
                  current: comparativas.mes, prev: comparativas.mesAnterior,
                  pct: comparativas.trendMes,
                },
              ].map((c) => (
                <Card key={c.label} className="p-3">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">{c.label}</p>
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-slate-900 tabular-nums truncate">{formatCOP(c.current)}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">vs {formatCOP(c.prev)}</p>
                    </div>
                    <div className={clsx(
                      'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-1 rounded-lg shrink-0',
                      c.pct > 0 ? 'bg-green-50 text-green-700' : c.pct < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                    )}>
                      <TrendIcon pct={c.pct} />
                      {c.pct > 0 ? '+' : ''}{c.pct.toFixed(1)}%
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* ── Charts ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Área chart — ventas por día */}
            <Card padding={false} className="lg:col-span-2">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} className="t-text" />
                  <h2 className="text-sm font-semibold text-slate-800">Ventas por día — {mesActual}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm t-bg inline-block" />Ventas</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 inline-block" />Ganancia</span>
                </div>
              </div>
              {isDesktop ? (
                <div className="px-2 pt-3 pb-2 overflow-hidden">
                  {chartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos este mes</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180} minWidth={0}>
                      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="dia"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          width={44}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="ventas"   name="Ventas"   fill="var(--t-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="ganancia" name="Ganancia" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ) : (
                <div className="px-4 py-5 text-center text-xs text-slate-400">Gráfico disponible en pantallas más grandes</div>
              )}
              {/* Footer resumen */}
              <div className="px-4 py-3 border-t border-slate-50 grid grid-cols-3 divide-x divide-slate-100 overflow-hidden">
                {[
                  { label: 'Total mes',   value: formatCOP(data.total_ventas) },
                  { label: 'Ganancia',    value: formatCOP(data.ganancia_bruta) },
                  { label: 'Neto',        value: formatCOP(data.ganancia_neta) },
                ].map((s) => (
                  <div key={s.label} className="px-1 sm:px-3 first:pl-0 last:pr-0 text-center">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums mt-0.5 truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top productos — donut */}
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <Package size={15} className="t-text" />
                <h2 className="text-sm font-semibold text-slate-800">Top productos</h2>
              </div>
              <div className="p-4 overflow-hidden">
                {topChartData.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Sin ventas este mes</div>
                ) : (
                  <>
                    {isDesktop && (
                      <ResponsiveContainer width="100%" height={180} minWidth={0}>
                        <PieChart>
                          <Pie
                            data={topChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey="total"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {topChartData.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const item = payload[0]
                              const total = topChartData.reduce((s: number, d: any) => s + d.total, 0)
                              const pct = total > 0 ? ((item?.value as number ?? 0) / total * 100).toFixed(1) : '0'
                              return (
                                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs max-w-[180px]">
                                  <p className="font-semibold text-slate-700 mb-1 truncate">{item?.name}</p>
                                  <p className="text-slate-500">Total: <span className="font-bold text-slate-800">{formatCOP(item?.value as number ?? 0)}</span></p>
                                  <p className="text-slate-400">{pct}% del período</p>
                                </div>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {/* Leyenda */}
                    <div className="space-y-1.5 mt-1">
                      {topChartData.map((p: any, i: number) => {
                        const total = topChartData.reduce((s: number, d: any) => s + d.total, 0)
                        const pct = total > 0 ? ((p.total / total) * 100).toFixed(0) : '0'
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-slate-600 truncate flex-1">{p.nombre}</span>
                            <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* ── Bottom row ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top productos — tabla */}
            {data.top_productos?.length > 0 && (
              <Card padding={false}>
                <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                  <BarChart3 size={15} className="text-blue-600" />
                  <h2 className="text-sm font-semibold text-slate-800">Ranking ventas — {mesActual}</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {data.top_productos.slice(0, 6).map((p: any, i: number) => {
                    const maxTotal = Math.max(...data.top_productos.map((x: any) => x.total))
                    const pct = maxTotal > 0 ? (p.total / maxTotal) * 100 : 0
                    return (
                      <div key={p.producto_id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xs font-bold text-slate-300 w-4 shrink-0 tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{productName(p.producto_id)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full t-bg rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{p.unidades} u.</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold t-text-dk shrink-0 tabular-nums">{formatCOP(p.total)}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Resumen financiero */}
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <CreditCard size={15} className="text-purple-600" />
                <h2 className="text-sm font-semibold text-slate-800">Resumen financiero — {mesActual}</h2>
              </div>
              <div className="p-4 space-y-4">
                {[
                  {
                    label: 'Ventas brutas',
                    value: data.total_ventas,
                    color: 't-bg',
                    pct: 100,
                    textColor: 't-text-dk',
                  },
                  {
                    label: 'Ganancia bruta',
                    value: data.ganancia_bruta,
                    color: 'bg-green-500',
                    pct: data.total_ventas > 0 ? (data.ganancia_bruta / data.total_ventas) * 100 : 0,
                    textColor: 'text-green-700',
                  },
                  {
                    label: 'Gastos operativos',
                    value: data.total_gastos,
                    color: 'bg-red-400',
                    pct: data.total_ventas > 0 ? (data.total_gastos / data.total_ventas) * 100 : 0,
                    textColor: 'text-red-600',
                  },
                  {
                    label: 'Neto estimado',
                    value: data.total_ventas - data.total_gastos,
                    color: (data.total_ventas - data.total_gastos) >= 0 ? 'bg-green-600' : 'bg-red-500',
                    pct: data.total_ventas > 0 ? ((data.total_ventas - data.total_gastos) / data.total_ventas) * 100 : 0,
                    textColor: (data.total_ventas - data.total_gastos) >= 0 ? 'text-green-700' : 'text-red-700',
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-slate-600">{row.label}</span>
                      <span className={`text-sm font-bold tabular-nums ${row.textColor}`}>{formatCOP(row.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-right">{row.pct.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
              {/* Cuentas pendientes */}
              <div className="mx-4 mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-700">{data.cuentas_abiertas} cuentas pendientes</span>
                </div>
                <span className="text-sm font-bold text-yellow-700 tabular-nums">{formatCOP(cuentasStats.deuda)}</span>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── AI Advisor ─────────────────────────────────────────────────────── */}
      {canSeeReports && (
        <AIAdvisorPanel
          title="Asesor de negocio"
          subtitle="Claude analiza tus ventas, cuentas y stock, y te dice qué hacer esta semana"
          cta="Pedir consejo a la IA"
          iconGradient="from-emerald-500 to-teal-600"
          onAnalyze={() => aiApi.posAdvisor()}
        />
      )}
    </div>
  )
}

// Helper missing import fix
function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ─── Getting Started Checklist ────────────────────────────────────────────────
/**
 * Se muestra en el dashboard del admin cuando faltan pasos de configuración.
 * Desaparece automáticamente cuando todos los pasos están completos.
 */
export function GettingStartedChecklist() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'master'
  const dismissKey = `checklist_dismissed_${user?.id}`
  const [dismissed, setDismissed] = React.useState(
    () => localStorage.getItem(dismissKey) === '1'
  )

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const { data: empresa } = useQuery({
    queryKey: ['empresa'],
    queryFn: () => billingApi.getEmpresa(),
    enabled: isAdmin,
    staleTime: 120_000,
  })

  const { data: medios = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => apiClient.get<{ id: number; activo: boolean }[]>('/payment-methods').then((r) => r.data),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const { data: cajaStatus } = useQuery({
    queryKey: ['caja', 'estado'],
    queryFn: () => apiClient.get<{ estado: string } | null>('/caja/estado').then((r) => r.data),
    enabled: isAdmin,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  if (!isAdmin) return null
  if (dismissed) return null

  const steps = [
    {
      label:     'Configura los datos de tu negocio',
      desc:      'Nombre, NIT y dirección para tus recibos y facturas',
      done:      !!empresa?.razon_social,
      icon:      <Store size={16} />,
      action:    () => navigate('/billing'),
      actionLabel: 'Ir a Facturación',
    },
    {
      label:     'Agrega tu primer producto',
      desc:      'Sin productos no puedes registrar ventas',
      done:      products.length > 0,
      icon:      <Package size={16} />,
      action:    () => navigate('/products'),
      actionLabel: 'Ir a Productos',
    },
    {
      label:     'Activa un medio de pago',
      desc:      'Efectivo, Nequi, tarjeta... al menos uno',
      done:      medios.some((m) => m.activo),
      icon:      <CreditCard size={16} />,
      action:    () => navigate('/payment-methods'),
      actionLabel: 'Ir a Medios de pago',
    },
    {
      label:     'Abre la caja para empezar a vender',
      desc:      'Requerida antes de registrar cualquier pago',
      done:      cajaStatus?.estado === 'abierta',
      icon:      <Wallet size={16} />,
      action:    () => navigate('/caja'),
      actionLabel: 'Ir a Caja',
    },
  ]

  const pending = steps.filter((s) => !s.done)
  if (pending.length === 0) return null  // todo configurado → no mostrar

  return (
    <Card className="border-2 border-[var(--t-primary-light)] bg-[var(--t-primary-xlight)]/30">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--t-primary)] text-white flex items-center justify-center shrink-0">
          <ChevronRight size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm">
            Configura tu negocio — {steps.filter((s) => s.done).length}/{steps.length} pasos
          </h3>
          <p className="text-xs text-slate-500">
            Completa estos pasos para empezar a vender.
          </p>
        </div>
        <button
          onClick={() => { localStorage.setItem(dismissKey, '1'); setDismissed(true) }}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 -mt-0.5"
          title="Ocultar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
              s.done
                ? 'bg-green-50 border border-green-100 opacity-60'
                : 'bg-white border border-slate-200 cursor-pointer hover:border-[var(--t-primary-light)]'
            }`}
            onClick={!s.done ? s.action : undefined}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              s.done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {s.done ? <CheckCircle2 size={14} /> : s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {s.label}
              </p>
              {!s.done && <p className="text-[11px] text-slate-400 truncate">{s.desc}</p>}
            </div>
            {!s.done && (
              <span className="text-[11px] text-[var(--t-primary)] font-medium shrink-0 flex items-center gap-0.5">
                {s.actionLabel} <ChevronRight size={11} />
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
