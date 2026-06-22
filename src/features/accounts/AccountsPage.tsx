/**
 * AccountsPage — app-shell master-detail de cuentas de crédito.
 *
 * Desktop (lg+): layout de 3 regiones tipo SaaS profesional
 *   ┌ sidebar (Layout) ┬──────── centro ────────┬──── lista (borde) ────┐
 *   │                  │ toolbar: KPIs + crear   │ tabs · búsqueda       │
 *   │                  │ + venta rápida (fija)   │ filas (scroll)        │
 *   │                  │ detalle inline (scroll) │ paginación · totales  │
 *   └──────────────────┴─────────────────────────┴───────────────────────┘
 *   La selección vive en la URL (?id=) → deep-link + back del navegador.
 *   La lista queda pegada al borde derecho (Layout aplica full-bleed en /accounts).
 *
 * Mobile (<lg): se preserva el comportamiento previo — toolbar + lista apiladas;
 *   al seleccionar una cuenta se muestra el detalle a pantalla completa con "volver".
 */
import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Circle, CheckCircle2, TrendingUp, BookOpen, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { PageHeader, StatCard, EmptyState } from '@/shared/components/ui'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import Can from '@/shared/components/Can'
import { formatCOP } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { cuentasApi } from './api'
import { useCajaGuard } from '@/shared/hooks/useCajaGuard'
import NuevaCuentaInline from './NuevaCuentaInline'
import AccountsListPanel, { type FilterTab, type DateFilter } from './AccountsListPanel'
import { AccountDetailPanel } from './AccountDetailPage'

const DAY_MS = 86_400_000

export default function AccountsPage() {
  const qc = useQueryClient()
  const isDesktop = useIsDesktop(1024)
  const { requireCaja } = useCajaGuard()

  // ── Estado en URL: selección (?id) + filtros (?tab,?q,?range) ─────────────────
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id') ? Number(params.get('id')) : null
  const tab = (params.get('tab') as FilterTab) || 'abiertas'
  const search = params.get('q') ?? ''
  const dateFilter = (params.get('range') as DateFilter) || 'todas'

  const patchParams = (patch: Record<string, string | null>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k)
        else next.set(k, v)
      }
      return next
    }, { replace: true })
  }

  const setTab = (t: FilterTab) => patchParams({ tab: t === 'abiertas' ? null : t })
  const setSearch = (q: string) => patchParams({ q: q || null })
  const setDateFilter = (d: DateFilter) => patchParams({ range: d === 'todas' ? null : d })
  const selectCuenta = (id: number) => patchParams({ id: String(id) })
  const clearSelection = () => patchParams({ id: null })

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ['accounts', tab],
    queryFn: () => cuentasApi.getAll(tab === 'abiertas' ? { solo_abiertas: true } : { limit: 100 }),
    refetchOnMount: 'always',
  })

  const { data: statsData } = useQuery({
    queryKey: ['accounts', 'stats'],
    queryFn: cuentasApi.stats,
    refetchOnMount: 'always',
  })

  const createMutation = useMutation({
    mutationFn: (dto: { nombre: string; cliente_id?: number }) => cuentasApi.create(dto),
    onSuccess: (newCuenta) => {
      qc.setQueryData(['accounts', newCuenta.id], newCuenta)
      qc.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Cuenta creada')
      selectCuenta(newCuenta.id)   // ← se renderiza inline, sin navegar de página
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al crear cuenta')),
  })

  const stats = useMemo(() => ({
    abiertas: statsData?.abiertas ?? 0,
    pagadas: statsData?.pagadas ?? 0,
    deudaTotal: statsData?.deuda_total ?? 0,
    recaudado: statsData?.recaudado ?? 0,
  }), [statsData])

  // ── Filtrado client-side ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now()
    let result = cuentas

    if (tab === 'abiertas') result = result.filter((c) => !c.esta_pagada)
    if (tab === 'pagadas') result = result.filter((c) => c.esta_pagada)

    if (dateFilter !== 'todas') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90
      result = result.filter((c) => now - new Date(c.fecha_creacion).getTime() <= days * DAY_MS)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.nombre.toLowerCase().includes(q))
    }

    return [...result].sort((a, b) => {
      if (a.esta_pagada !== b.esta_pagada) return a.esta_pagada ? 1 : -1
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    })
  }, [cuentas, tab, search, dateFilter])

  const tabItems = useMemo(() => ([
    { key: 'abiertas' as FilterTab, label: 'Abiertas', count: stats.abiertas },
    { key: 'pagadas' as FilterTab, label: 'Pagadas', count: stats.pagadas },
    { key: 'todas' as FilterTab, label: 'Todas', count: cuentas.length },
  ]), [stats.abiertas, stats.pagadas, cuentas.length])

  // ── Bloques reutilizables ─────────────────────────────────────────────────────
  const kpis = (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Por cobrar"
        value={formatCOP(stats.deudaTotal)}
        subValue={`${stats.abiertas} abierta${stats.abiertas !== 1 ? 's' : ''}`}
        icon={<AlertCircle size={16} className="text-yellow-500" />}
        accent="yellow"
      />
      <StatCard label="Abiertas" value={String(stats.abiertas)} icon={<Circle size={16} className="text-blue-500" />} accent="blue" />
      <StatCard label="Pagadas" value={String(stats.pagadas)} icon={<CheckCircle2 size={16} className="text-green-600" />} accent="green" />
      <StatCard label="Recaudado" value={formatCOP(stats.recaudado)} icon={<TrendingUp size={16} className="text-purple-500" />} accent="purple" />
    </div>
  )

  const toolbar = (
    <div className="space-y-4">
      {kpis}
      <Can permission="cuentas:create">
        <NuevaCuentaInline
          onCrear={(payload) => createMutation.mutate(payload)}
          creating={createMutation.isPending}
          guardCaja={requireCaja}
        />
      </Can>
    </div>
  )

  const list = (fillHeight: boolean) => (
    <AccountsListPanel
      filtered={filtered}
      isLoading={isLoading}
      tab={tab}
      onTab={setTab}
      tabItems={tabItems}
      search={search}
      onSearch={setSearch}
      dateFilter={dateFilter}
      onDateFilter={setDateFilter}
      selectedId={selectedId}
      onSelect={selectCuenta}
      fillHeight={fillHeight}
    />
  )

  // ── Mobile (<lg): comportamiento previo ───────────────────────────────────────
  if (!isDesktop) {
    if (selectedId) {
      return <AccountDetailPanel cuentaId={selectedId} onBack={clearSelection} embedded />
    }
    return (
      <div className="space-y-5">
        <PageHeader title="Cuentas de crédito" subtitle="Gestión de ventas a crédito y pagos" />
        {toolbar}
        <div className="rounded-xl border border-slate-200/80 shadow-xs overflow-hidden bg-white">
          {list(false)}
        </div>
      </div>
    )
  }

  // ── Desktop (lg+): app-shell de 3 regiones, full-bleed ────────────────────────
  return (
    <div className="h-[calc(100dvh-3.5rem)] flex overflow-hidden bg-slate-50">
      {/* Centro: toolbar + detalle scrollean JUNTOS (el top se va con el scroll) */}
      <section className="flex-1 min-w-0 overflow-y-auto">
        <div className="px-6 pt-5 pb-4 border-b border-slate-200/70">
          {toolbar}
        </div>
        <div className="px-6 py-5">
          {selectedId ? (
            <AccountDetailPanel cuentaId={selectedId} onBack={clearSelection} embedded />
          ) : (
            <div className="flex items-center justify-center min-h-[40vh]">
              <EmptyState
                icon={<BookOpen size={44} />}
                title="Selecciona una cuenta"
                description="Elige una cuenta de la lista para ver su detalle, o crea una nueva desde el panel superior. Se mostrará aquí mismo."
              />
            </div>
          )}
        </div>
      </section>

      {/* Lista pegada al borde derecho — scroll y paginación propios */}
      <aside className="w-[380px] xl:w-[400px] shrink-0 border-l border-slate-200 bg-white flex flex-col min-h-0">
        <header className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Sparkles size={15} className="t-text" />
          <h2 className="text-sm font-bold text-slate-800">Mis cuentas</h2>
          <span className="ml-auto text-[11px] text-slate-400 tabular-nums">{filtered.length}</span>
        </header>
        <div className="flex-1 min-h-0">
          {list(true)}
        </div>
      </aside>
    </div>
  )
}
