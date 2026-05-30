import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle2, Circle, AlertCircle, TrendingUp, ChevronRight, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Table, Th, Td, Badge, Spinner, EmptyState,
  Card, StatCard, TabBar, SearchInput, ProgressBar, Pagination,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import Can from '@/shared/components/Can'
import { formatCOP, formatDate } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { cuentasApi } from './api'
import { useCajaGuard } from '@/shared/hooks/useCajaGuard'
import type { Cuenta } from '@/shared/types'
import NuevaCuentaInline from './NuevaCuentaInline'

type FilterTab = 'abiertas' | 'pagadas' | 'todas'

export default function AccountsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { requireCaja } = useCajaGuard()
  const [tab, setTab] = useState<FilterTab>('abiertas')
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'todas' | '7d' | '30d' | '90d'>('todas')

  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => cuentasApi.getAll({ limit: 500 }),
  })

  const createMutation = useMutation({
    mutationFn: (dto: { nombre: string; cliente_id?: number }) => cuentasApi.create(dto),
    onSuccess: (newCuenta) => {
      qc.setQueryData(['accounts'], (old: Cuenta[] | undefined) =>
        old ? [newCuenta, ...old] : [newCuenta]
      )
      qc.setQueryData(['accounts', newCuenta.id], newCuenta)
      toast.success('Cuenta creada')
      navigate(`/accounts/${newCuenta.id}`)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al crear cuenta')),
  })

  // ── Stats globales ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const abiertas   = cuentas.filter((c) => !c.esta_pagada)
    const pagadas    = cuentas.filter((c) => c.esta_pagada)
    const deudaTotal = abiertas.reduce((s, c) => s + (c.valor_pendiente ?? 0), 0)
    const recaudado  = pagadas.reduce((s, c) => s + c.total, 0)
    const totalBruto = cuentas.reduce((s, c) => s + c.total, 0)
    return { abiertas: abiertas.length, pagadas: pagadas.length, deudaTotal, recaudado, totalBruto }
  }, [cuentas])

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now()
    const dayMs = 86400000

    let result = cuentas

    // Tab
    if (tab === 'abiertas') result = result.filter((c) => !c.esta_pagada)
    if (tab === 'pagadas')  result = result.filter((c) =>  c.esta_pagada)

    // Fecha
    if (dateFilter !== 'todas') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90
      result = result.filter((c) => {
        const d = new Date(c.fecha_creacion).getTime()
        return now - d <= days * dayMs
      })
    }

    // Search
    if (search) result = result.filter((c) => c.nombre.toLowerCase().includes(search.toLowerCase()))

    // Sort: abiertas primero, luego por fecha desc
    return [...result].sort((a, b) => {
      if (a.esta_pagada !== b.esta_pagada) return a.esta_pagada ? 1 : -1
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    })
  }, [cuentas, tab, search, dateFilter])

  const pg = usePagination(filtered)

  // Reset paginación cuando cambien filtros
  useEffect(() => { pg.reset() }, [tab, search, dateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const tabItems = [
    { key: 'abiertas' as FilterTab, label: 'Abiertas', count: stats.abiertas },
    { key: 'pagadas'  as FilterTab, label: 'Pagadas',  count: stats.pagadas  },
    { key: 'todas'    as FilterTab, label: 'Todas',    count: cuentas.length },
  ]

  const dateItems: { key: typeof dateFilter; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: '7d',    label: '7 días' },
    { key: '30d',   label: '30 días' },
    { key: '90d',   label: '90 días' },
  ]

  return (
    <div>
      <PageHeader
        title="Cuentas de crédito"
        subtitle="Gestión de ventas a crédito y pagos"
      />

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Deuda pendiente"
          value={formatCOP(stats.deudaTotal)}
          subValue={`${stats.abiertas} cuenta${stats.abiertas !== 1 ? 's' : ''} abiertas`}
          icon={<AlertCircle size={17} className="text-yellow-500" />}
          accent="yellow"
        />
        <StatCard
          label="Cuentas abiertas"
          value={String(stats.abiertas)}
          icon={<Circle size={17} className="text-blue-500" />}
          accent="blue"
        />
        <StatCard
          label="Cuentas pagadas"
          value={String(stats.pagadas)}
          icon={<CheckCircle2 size={17} className="text-green-600" />}
          accent="green"
        />
        <StatCard
          label="Total recaudado"
          value={formatCOP(stats.recaudado)}
          icon={<TrendingUp size={17} className="text-purple-500" />}
          accent="purple"
        />
      </div>

      {/* ── Crear cuenta / venta rápida (inline, sin modal) ──────────────────── */}
      <Can permission="cuentas:create">
        <NuevaCuentaInline
          onCrear={(payload) => createMutation.mutate(payload)}
          creating={createMutation.isPending}
          guardCaja={requireCaja}
        />
      </Can>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <TabBar tabs={tabItems} active={tab} onChange={setTab} />
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            {dateItems.map((d) => (
              <button
                key={d.key}
                onClick={() => setDateFilter(d.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  dateFilter === d.key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full sm:max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cliente..." />
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title={search ? 'Sin resultados' : tab === 'abiertas' ? 'Sin cuentas abiertas' : 'Sin cuentas'}
          description={
            search
              ? `No hay cuentas que coincidan con "${search}"`
              : 'Usa el panel de arriba para crear tu primera cuenta de crédito'
          }
        />
      ) : (
        <Card padding={false} className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th className="hidden sm:table-cell">Total</Th>
                <Th>Pendiente</Th>
                <Th className="hidden sm:table-cell">Progreso</Th>
                <Th className="hidden sm:table-cell">Estado</Th>
                <Th className="hidden md:table-cell">Fecha</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {pg.paginated.map((c) => {
                const pendiente = c.valor_pendiente ?? 0
                const pagado    = c.total - pendiente
                const pct       = c.total > 0 ? (pagado / c.total) * 100 : 0
                const isAlerta  = !c.esta_pagada && pendiente > 100000

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/accounts/${c.id}`)}
                  >
                    <Td className="font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.esta_pagada ? 'bg-green-500' : isAlerta ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{c.nombre}</span>
                            {c.cliente_documento && (
                              <Badge variant="purple">Factura auto</Badge>
                            )}
                          </div>
                          <span className="sm:hidden text-xs text-slate-400">
                            {c.esta_pagada ? 'Pagada' : `Debe ${formatCOP(pendiente)}`}
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600 tabular-nums hidden sm:table-cell">{formatCOP(c.total)}</Td>
                    <Td>
                      <span className={`font-semibold tabular-nums ${
                        c.esta_pagada ? 'text-slate-300' : 'text-red-600'
                      }`}>
                        {c.esta_pagada ? '—' : formatCOP(pendiente)}
                      </span>
                    </Td>
                    <Td className="min-w-[100px] hidden sm:table-cell">
                      {c.total > 0 && (
                        <div className="space-y-0.5">
                          <ProgressBar value={pct} color={c.esta_pagada ? 't-bg' : 'bg-yellow-400'} />
                          <p className="text-[10px] text-slate-400 tabular-nums">{pct.toFixed(0)}%</p>
                        </div>
                      )}
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Badge variant={c.esta_pagada ? 'green' : 'yellow'} dot>
                        {c.esta_pagada ? 'Pagada' : 'Abierta'}
                      </Badge>
                    </Td>
                    <Td className="text-slate-400 text-xs whitespace-nowrap hidden md:table-cell">{formatDate(c.fecha_creacion)}</Td>
                    <Td>
                      <ChevronRight size={16} className="text-slate-300 group-hover:t-text transition-colors" />
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>

          {/* Paginación */}
          <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />

          {/* Footer stats */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>{filtered.length} cuenta{filtered.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-4">
              <span>Total: <strong className="text-slate-700 tabular-nums">{formatCOP(filtered.reduce((s, c) => s + c.total, 0))}</strong></span>
              <span>Pendiente: <strong className="text-red-600 tabular-nums">{formatCOP(filtered.filter((c) => !c.esta_pagada).reduce((s, c) => s + (c.valor_pendiente ?? 0), 0))}</strong></span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
