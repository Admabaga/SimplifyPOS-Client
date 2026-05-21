import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ClipboardList, AlertTriangle, Users, Activity, Clock,
} from 'lucide-react'
import { auditApi } from './api'
import type { AuditAnomaly } from './api'
import {
  Card, PageHeader, Table, Th, Td, Badge, Spinner, EmptyState,
  StatCard, Pagination, SearchInput, DateRangeBar, InfoBanner, SectionHeader,
} from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/formatters'

const PAGE_SIZE = 50

const ACTION_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'gray'> = {
  create: 'green',
  delete: 'red',
  update: 'yellow',
  login: 'blue',
  logout: 'gray',
}

const SEVERITY_COLORS: Record<AuditAnomaly['severity'], 'red' | 'yellow' | 'blue'> = {
  high: 'red',
  medium: 'yellow',
  low: 'blue',
}

const ACTION_OPTIONS = ['', 'create', 'update', 'delete', 'login', 'logout']

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [resource, setResource] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const offset = (page - 1) * PAGE_SIZE

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['audit', offset, search, resource, action, dateFrom, dateTo],
    queryFn: () =>
      auditApi.list({
        limit: PAGE_SIZE,
        offset,
        search: search || undefined,
        resource: resource || undefined,
        action: action || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.stats(),
    staleTime: 60_000,
  })

  const items = listData?.items ?? []
  const total = listData?.total ?? 0

  const highAnomalies = stats?.anomalies?.filter((a) => a.severity === 'high') ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Actividad del sistema SimplifyPOS — solo visible para master"
      />

      {/* KPI Stats */}
      {statsLoading ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Hoy"
              value={String(stats.totals.today)}
              icon={<Clock size={18} />}
              iconBg="bg-blue-100"
              accent="blue"
            />
            <StatCard
              label="Esta semana"
              value={String(stats.totals.week)}
              icon={<Activity size={18} />}
              iconBg="bg-green-100"
              accent="green"
            />
            <StatCard
              label="Este mes"
              value={String(stats.totals.month)}
              icon={<ClipboardList size={18} />}
              iconBg="bg-purple-100"
              accent="green"
            />
            <StatCard
              label="Anomalías altas"
              value={String(highAnomalies.length)}
              icon={<AlertTriangle size={18} />}
              iconBg={highAnomalies.length > 0 ? 'bg-red-100' : 'bg-gray-100'}
              accent="green"
            />
          </div>

          {/* Anomalías */}
          {stats.anomalies.length > 0 && (
            <div className="space-y-2">
              <SectionHeader title="Alertas de anomalías" icon={<AlertTriangle size={16} />} />
              {stats.anomalies.map((a, i) => (
                <InfoBanner
                  key={i}
                  variant={a.severity === 'high' ? 'warning' : 'info'}
                  icon={<AlertTriangle size={16} />}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SEVERITY_COLORS[a.severity]}>{a.severity}</Badge>
                    <span className="text-sm">{a.message}</span>
                    {a.user_email && (
                      <span className="text-xs text-gray-500">· {a.user_email}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">({a.count} eventos)</span>
                  </div>
                </InfoBanner>
              ))}
            </div>
          )}

          {/* Top users & resources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <SectionHeader title="Top usuarios" icon={<Users size={15} />} />
              <div className="mt-3 space-y-2">
                {stats.top_users.slice(0, 5).map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate">{u.user_email}</span>
                    <Badge variant="gray">{u.count}</Badge>
                  </div>
                ))}
                {stats.top_users.length === 0 && (
                  <p className="text-xs text-gray-400">Sin datos</p>
                )}
              </div>
            </Card>
            <Card>
              <SectionHeader title="Top recursos" icon={<ClipboardList size={15} />} />
              <div className="mt-3 space-y-2">
                {stats.top_resources.slice(0, 5).map((r) => (
                  <div key={r.resource} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.resource}</span>
                    <Badge variant="gray">{r.count}</Badge>
                  </div>
                ))}
                {stats.top_resources.length === 0 && (
                  <p className="text-xs text-gray-400">Sin datos</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Buscar por email, IP o recurso…"
          className="w-full sm:w-64"
        />
        <input
          type="text"
          placeholder="Recurso (ej: productos)"
          value={resource}
          onChange={(e) => { setResource(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none bg-white w-40"
        />
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a || 'Todas las acciones'}</option>
          ))}
        </select>
        <DateRangeBar
          desde={dateFrom}
          hasta={dateTo}
          onDesde={(v) => { setDateFrom(v); setPage(1) }}
          onHasta={(v) => { setDateTo(v); setPage(1) }}
          presets={['today', 'week', 'month']}
        />
      </div>

      {/* Tabla */}
      <Card padding={false}>
        {listLoading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ClipboardList size={40} />} title="Sin registros" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Usuario</Th>
                  <Th>Acción</Th>
                  <Th>Recurso</Th>
                  <Th className="hidden sm:table-cell">ID recurso</Th>
                  <Th className="hidden md:table-cell">IP</Th>
                  <Th className="hidden sm:table-cell">Fecha</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <Td>
                      <div>
                        <p className="text-xs font-medium text-gray-700 truncate max-w-[140px]">{e.user_email}</p>
                        <p className="text-[10px] text-gray-400 sm:hidden">{formatDate(e.created_at)}</p>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={ACTION_COLORS[e.action] ?? 'gray'}>{e.action}</Badge>
                    </Td>
                    <Td className="text-xs text-gray-600">{e.resource}</Td>
                    <Td className="text-xs text-gray-400 hidden sm:table-cell">{e.resource_id ?? '—'}</Td>
                    <Td className="text-xs font-mono text-gray-400 hidden md:table-cell">{e.ip}</Td>
                    <Td className="text-xs text-gray-400 hidden sm:table-cell">{formatDate(e.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
    </div>
  )
}
