/**
 * AccountsListPanel — lista "master" de cuentas (presentacional).
 *
 * Encapsula header (tabs + búsqueda + filtro de fecha), filas scrollables con
 * resaltado de selección, paginación y footer de totales. No hace fetching ni
 * filtrado de negocio: recibe la lista ya filtrada + el estado de filtros desde
 * AccountsPage (SRP). Soporta dos modos de altura:
 *   • fillHeight  → ocupa el alto disponible (app-shell desktop, scroll interno)
 *   • bounded     → maxHeight fijo (stack mobile)
 */
import { useEffect } from 'react'
import { BookOpen, ChevronRight, Calendar, Receipt } from 'lucide-react'
import { clsx } from 'clsx'
import {
  Badge, Spinner, EmptyState, SearchInput, ProgressBar, Pagination, TabBar,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import { formatCOP, formatDate } from '@/shared/lib/formatters'
import type { Cuenta } from '@/shared/types'

export type FilterTab = 'abiertas' | 'pagadas' | 'todas'
export type DateFilter = 'todas' | '7d' | '30d' | '90d'

interface Props {
  filtered: Cuenta[]
  isLoading: boolean

  tab: FilterTab
  onTab: (t: FilterTab) => void
  tabItems: { key: FilterTab; label: string; count: number }[]

  search: string
  onSearch: (v: string) => void

  dateFilter: DateFilter
  onDateFilter: (d: DateFilter) => void

  selectedId: number | null
  onSelect: (id: number) => void

  /** Ocupa el alto disponible con scroll interno (app-shell desktop). */
  fillHeight?: boolean
}

const DATE_ITEMS: { key: DateFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
]

export default function AccountsListPanel({
  filtered, isLoading, tab, onTab, tabItems,
  search, onSearch, dateFilter, onDateFilter, selectedId, onSelect, fillHeight = false,
}: Props) {
  const pg = usePagination(filtered)

  // Reset de paginación cuando cambian filtros que no alteran el length.
  useEffect(() => { pg.reset() }, [tab, search, dateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendienteFiltrado = filtered
    .filter((c) => !c.esta_pagada)
    .reduce((s, c) => s + (c.valor_pendiente ?? 0), 0)

  return (
    <div className={clsx('flex flex-col bg-white', fillHeight ? 'h-full min-h-0' : 'min-h-0')}>
      {/* Header — tabs + búsqueda + fecha */}
      <div className="p-3 border-b border-slate-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabBar tabs={tabItems} active={tab} onChange={onTab} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            {DATE_ITEMS.map((d) => (
              <button
                key={d.key}
                onClick={() => onDateFilter(d.key)}
                className={clsx(
                  'px-2 py-1 rounded-lg text-[11px] font-medium border transition-all',
                  dateFilter === d.key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <SearchInput value={search} onChange={onSearch} placeholder="Buscar cliente..." />
      </div>

      {/* Cuerpo — filas scrollables */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title={search ? 'Sin resultados' : tab === 'abiertas' ? 'Sin cuentas abiertas' : 'Sin cuentas'}
          description={
            search
              ? `No hay cuentas que coincidan con "${search}"`
              : 'Crea tu primera cuenta desde el panel superior'
          }
        />
      ) : (
        <>
          <div
            className={clsx('divide-y divide-slate-50 overflow-y-auto', fillHeight ? 'flex-1 min-h-0' : '')}
            style={fillHeight ? undefined : { maxHeight: '62vh' }}
          >
            {pg.paginated.map((c) => {
              const pendiente = c.valor_pendiente ?? 0
              const pagado = c.total - pendiente
              const pct = c.total > 0 ? (pagado / c.total) * 100 : 0
              const isAlerta = !c.esta_pagada && pendiente > 100000
              const isSelected = c.id === selectedId
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  aria-current={isSelected ? 'true' : undefined}
                  className={clsx(
                    'w-full text-left px-4 py-3 transition-colors group flex items-center gap-3 relative',
                    isSelected ? 't-bg-xlt' : 'hover:bg-slate-50/80',
                  )}
                >
                  {isSelected && <span className="absolute left-0 top-0 bottom-0 w-[3px] t-bg rounded-r-full" />}
                  <div className={clsx(
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    c.esta_pagada ? 'bg-green-500' : isAlerta ? 'bg-red-500 animate-pulse' : 'bg-yellow-400',
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx('truncate text-sm font-semibold', isSelected ? 't-text-dk' : 'text-slate-800')}>
                        {c.nombre}
                      </span>
                      {c.cliente_documento && (
                        <span
                          title="Factura automática al pagar"
                          aria-label="Factura automática al pagar"
                          className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-600"
                        >
                          <Receipt size={10} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={c.esta_pagada ? 'green' : 'yellow'} dot>
                        {c.esta_pagada ? 'Pagada' : 'Abierta'}
                      </Badge>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatDate(c.fecha_creacion)}</span>
                      {c.total > 0 && !c.esta_pagada && (
                        <div className="hidden sm:flex items-center gap-1.5 min-w-[90px]">
                          <ProgressBar value={pct} color="bg-yellow-400" />
                          <span className="text-[10px] text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{c.esta_pagada ? 'Total' : 'Pendiente'}</p>
                    <p className={clsx('text-sm font-bold tabular-nums', c.esta_pagada ? 'text-slate-500' : 'text-red-600')}>
                      {c.esta_pagada ? formatCOP(c.total) : formatCOP(pendiente)}
                    </p>
                  </div>
                  <ChevronRight size={16} className={clsx('shrink-0 transition-colors', isSelected ? 't-text' : 'text-slate-300')} />
                </button>
              )
            })}
          </div>

          <div className="shrink-0">
            <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{filtered.length} cuenta{filtered.length !== 1 ? 's' : ''}</span>
              <span>Pendiente: <strong className="text-red-600 tabular-nums">{formatCOP(pendienteFiltrado)}</strong></span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
