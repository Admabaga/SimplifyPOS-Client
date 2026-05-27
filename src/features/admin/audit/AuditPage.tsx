import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ClipboardList, AlertTriangle, Users, Activity, Clock,
  Shield, ShieldCheck, Filter, X, Eye, Hash, Globe, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { auditApi } from './api'
import type { AuditAnomaly } from './api'
import {
  Button, Card, PageHeader, Table, Th, Td, Badge, Spinner, EmptyState,
  StatCard, Pagination, SearchInput, DateRangeBar, SectionHeader, Modal,
} from '@/shared/components/ui'
import { formatDate, formatDateTime } from '@/shared/lib/formatters'

const PAGE_SIZE = 50

const ACTION_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple'> = {
  create: 'green',
  delete: 'red',
  update: 'yellow',
  login: 'blue',
  logout: 'gray',
  pay: 'green',
  emit: 'purple',
  void: 'red',
  open: 'blue',
  close: 'gray',
  lock: 'red',
  unlock: 'green',
  reset_password: 'yellow',
}

const SEVERITY_STYLES: Record<AuditAnomaly['severity'], { wrapper: string; iconWrap: string; badge: string; badgeText: string }> = {
  high:   { wrapper: 'border-red-100 bg-gradient-to-br from-red-50 to-red-50/30',     iconWrap: 'bg-white text-red-600',    badge: 'bg-red-100 text-red-700',       badgeText: 'Alta' },
  medium: { wrapper: 'border-amber-100 bg-gradient-to-br from-amber-50 to-amber-50/30', iconWrap: 'bg-white text-amber-600',  badge: 'bg-amber-100 text-amber-700',   badgeText: 'Media' },
  low:    { wrapper: 'border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/30',   iconWrap: 'bg-white text-blue-600',   badge: 'bg-blue-100 text-blue-700',     badgeText: 'Baja' },
}

const ACTION_OPTIONS = [
  '', 'create', 'update', 'delete', 'login', 'logout',
  'pay', 'emit', 'void', 'open', 'close', 'lock', 'unlock', 'reset_password',
]

interface AuditEvent {
  id: number
  user_email: string
  user_id?: number
  action: string
  resource: string
  resource_id?: string | null
  ip: string
  extra?: string | null
  prev_hash?: string | null
  hash?: string
  created_at: string
}

export default function AuditPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [resource, setResource] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  const offset = (page - 1) * PAGE_SIZE

  const handleExportCsv = async () => {
    setExportLoading(true)
    try {
      const blob = await auditApi.exportCsv({
        search: search || undefined,
        resource: resource || undefined,
        action: action || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al exportar el audit log')
    } finally {
      setExportLoading(false)
    }
  }

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

  const verifyMutation = useMutation({
    mutationFn: () => auditApi.verify(),
    onSuccess: (r) => {
      if (r.integrity === 'OK') {
        toast.success(`Cadena íntegra: ${r.total_entries.toLocaleString()} entradas válidas`)
      } else {
        toast.error(`Integridad comprometida: ${r.issues_count} problema(s) detectado(s)`)
      }
    },
    onError: () => toast.error('Error al verificar la cadena'),
  })

  const items = listData?.items ?? []
  const total = listData?.total ?? 0

  const highAnomalies = stats?.anomalies?.filter((a) => a.severity === 'high') ?? []

  // Chips de filtros activos
  const activeFilters: { key: string; label: string; clear: () => void }[] = []
  if (search) activeFilters.push({ key: 's', label: `Búsqueda: "${search}"`, clear: () => { setSearch(''); setPage(1) } })
  if (resource) activeFilters.push({ key: 'r', label: `Recurso: ${resource}`, clear: () => { setResource(''); setPage(1) } })
  if (action) activeFilters.push({ key: 'a', label: `Acción: ${action}`, clear: () => { setAction(''); setPage(1) } })
  if (dateFrom) activeFilters.push({ key: 'df', label: `Desde ${dateFrom}`, clear: () => { setDateFrom(''); setPage(1) } })
  if (dateTo) activeFilters.push({ key: 'dt', label: `Hasta ${dateTo}`, clear: () => { setDateTo(''); setPage(1) } })

  const parseExtra = (extra?: string | null): Record<string, unknown> | null => {
    if (!extra) return null
    try { return JSON.parse(extra) } catch { return { raw: extra } }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Log"
        subtitle="Actividad del sistema SimplifyPOS — visible solo para master"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="purple" dot>
              <Shield size={11} className="mr-1" />
              Tamper-evident
            </Badge>
            <Button
              size="sm"
              variant="secondary"
              icon={<Download size={13} />}
              onClick={handleExportCsv}
              loading={exportLoading}
            >
              Exportar CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<ShieldCheck size={13} />}
              onClick={() => verifyMutation.mutate()}
              loading={verifyMutation.isPending}
            >
              Verificar cadena
            </Button>
          </div>
        }
      />

      {/* Resultado de verificación */}
      {verifyMutation.data && (
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              {verifyMutation.data.integrity === 'OK' ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-700">
                      Cadena hash íntegra ✓
                    </p>
                    <p className="text-xs text-slate-500">
                      {verifyMutation.data.total_entries.toLocaleString()} entradas verificadas
                      · {verifyMutation.data.users_checked} usuarios
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700">
                      Cadena comprometida — {verifyMutation.data.issues_count} problema(s)
                    </p>
                    <p className="text-xs text-slate-500">
                      {verifyMutation.data.valid_entries.toLocaleString()} de{' '}
                      {verifyMutation.data.total_entries.toLocaleString()} entradas válidas
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={() => verifyMutation.reset()}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>
            {verifyMutation.data.issues.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                {verifyMutation.data.issues.map((iss, i) => (
                  <div
                    key={i}
                    className="text-[11px] rounded-lg bg-red-50 border border-red-100 p-2"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="red">{iss.type}</Badge>
                      <span className="text-slate-500">
                        Entry #{iss.entry_id} · User {iss.user_id} ·{' '}
                        {iss.action ?? '—'} {iss.resource ?? ''}
                      </span>
                    </div>
                    {iss.type === 'TAMPERED' && (
                      <div className="font-mono text-[10px] text-slate-600">
                        stored: {iss.stored_hash} · expected: {iss.expected_hash}
                      </div>
                    )}
                    {iss.type === 'CHAIN_BROKEN' && (
                      <div className="font-mono text-[10px] text-slate-600">
                        prev: {iss.stored_prev} · expected prev: {iss.expected_prev}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* KPI Stats */}
      {statsLoading ? (
        <div className="flex justify-center py-6"><Spinner size={24} /></div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Hoy" value={String(stats.totals.today)} icon={<Clock size={16} />} accent="blue" />
            <StatCard label="Esta semana" value={String(stats.totals.week)} icon={<Activity size={16} />} accent="green" />
            <StatCard label="Este mes" value={String(stats.totals.month)} icon={<ClipboardList size={16} />} accent="purple" />
            <StatCard
              label="Anomalías altas"
              value={String(highAnomalies.length)}
              icon={<AlertTriangle size={16} />}
              accent={highAnomalies.length > 0 ? 'red' : 'slate'}
            />
          </div>

          {/* Anomalías — cards rich con severidad */}
          {stats.anomalies.length > 0 && (
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center">
                    <AlertTriangle size={15} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 leading-tight">Alertas de anomalías</h2>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {stats.anomalies.length} {stats.anomalies.length === 1 ? 'patrón detectado' : 'patrones detectados'} en el audit
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                  Auto-detección
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {stats.anomalies.map((a, i) => {
                  const s = SEVERITY_STYLES[a.severity]
                  return (
                    <div key={i} className={`relative overflow-hidden rounded-xl border p-4 ${s.wrapper}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center shrink-0 ${s.iconWrap}`}>
                          <AlertTriangle size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${s.badge}`}>{s.badgeText}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{a.count} eventos</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{a.message}</p>
                          {a.user_email && (
                            <p className="text-[11px] text-slate-500 mt-1.5 truncate">
                              <Users size={10} className="inline mr-1 -mt-0.5" />
                              {a.user_email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Top users & resources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50">
                <SectionHeader title="Top usuarios" icon={<Users size={15} />} />
              </div>
              <div className="p-4 space-y-2.5">
                {stats.top_users.slice(0, 5).map((u) => {
                  const max = stats.top_users[0]?.count || 1
                  return (
                    <div key={u.user_id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 font-medium truncate">{u.user_email}</span>
                        <span className="font-bold text-slate-800 tabular-nums">{u.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(u.count / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
                {stats.top_users.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sin datos</p>
                )}
              </div>
            </Card>
            <Card padding={false}>
              <div className="p-4 border-b border-slate-50">
                <SectionHeader title="Top recursos" icon={<ClipboardList size={15} />} />
              </div>
              <div className="p-4 space-y-2.5">
                {stats.top_resources.slice(0, 5).map((r) => {
                  const max = stats.top_resources[0]?.count || 1
                  return (
                    <div key={r.resource}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-700 font-mono">{r.resource}</span>
                        <span className="font-bold text-slate-800 tabular-nums">{r.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
                {stats.top_resources.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sin datos</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Filtros + chips activos */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-50 flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Filtros</h3>
          {activeFilters.length > 0 && (
            <span className="ml-auto text-[10px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              {activeFilters.length} {activeFilters.length === 1 ? 'activo' : 'activos'}
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Email, IP o recurso…"
              className="w-full sm:w-64"
            />
            <input
              type="text"
              placeholder="Recurso (ej: productos)"
              value={resource}
              onChange={(e) => { setResource(e.target.value); setPage(1) }}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)] bg-white w-44"
            />
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)]"
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

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.clear}
                  className="group inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors"
                >
                  {f.label}
                  <X size={11} className="opacity-50 group-hover:opacity-100" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSearch(''); setResource(''); setAction(''); setDateFrom(''); setDateTo(''); setPage(1)
                }}
                className="text-[11px] text-slate-500 hover:text-slate-700 font-medium ml-1"
              >
                Limpiar todos
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-50 flex items-center justify-between">
          <SectionHeader title="Eventos" icon={<ClipboardList size={15} />} />
          {total > 0 && (
            <span className="text-[11px] text-slate-500">
              <span className="font-bold tabular-nums text-slate-700">{total.toLocaleString('es-CO')}</span> resultados
            </span>
          )}
        </div>
        {listLoading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ClipboardList size={40} />} title="Sin registros" description="No se encontraron eventos con los filtros actuales." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Usuario</Th>
                  <Th>Acción</Th>
                  <Th>Recurso</Th>
                  <Th className="hidden sm:table-cell">ID</Th>
                  <Th className="hidden md:table-cell">IP</Th>
                  <Th className="hidden sm:table-cell">Fecha</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEvent(e as AuditEvent)}
                  >
                    <Td>
                      <div>
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{e.user_email}</p>
                        <p className="text-[10px] text-slate-400 sm:hidden">{formatDate(e.created_at)}</p>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={ACTION_COLORS[e.action] ?? 'gray'}>{e.action}</Badge>
                    </Td>
                    <Td className="text-xs text-slate-600 font-mono">{e.resource}</Td>
                    <Td className="text-xs text-slate-400 hidden sm:table-cell">{e.resource_id ?? '—'}</Td>
                    <Td className="text-xs font-mono text-slate-400 hidden md:table-cell">{e.ip}</Td>
                    <Td className="text-xs text-slate-400 hidden sm:table-cell">{formatDate(e.created_at)}</Td>
                    <Td>
                      <Eye size={13} className="text-slate-300" />
                    </Td>
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

      {/* ─── Modal de detalle ─── */}
      {selectedEvent && (
        <Modal
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Detalle del evento"
          size="md"
        >
          <div className="space-y-4">
            {/* Header del evento */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Badge variant={ACTION_COLORS[selectedEvent.action] ?? 'gray'}>{selectedEvent.action}</Badge>
                <span className="text-sm font-mono text-slate-600">{selectedEvent.resource}</span>
                {selectedEvent.resource_id && (
                  <span className="text-xs text-slate-400">#{selectedEvent.resource_id}</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">{formatDateTime(selectedEvent.created_at)}</span>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                <Users size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Usuario</p>
                  <p className="font-medium text-slate-700 truncate">{selectedEvent.user_email}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                <Globe size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">IP origen</p>
                  <p className="font-mono text-slate-700 text-xs truncate">{selectedEvent.ip}</p>
                </div>
              </div>
              {selectedEvent.hash && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 sm:col-span-2">
                  <Hash size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Hash (cadena tamper-evident)</p>
                    <p className="font-mono text-[10px] text-slate-600 break-all">{selectedEvent.hash}</p>
                    {selectedEvent.prev_hash && (
                      <p className="font-mono text-[10px] text-slate-400 break-all mt-1">prev: {selectedEvent.prev_hash}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Extra data */}
            {(() => {
              const extra = parseExtra(selectedEvent.extra)
              if (!extra) return null
              return (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Información adicional</p>
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-slate-700 bg-white overflow-x-auto whitespace-pre-wrap max-h-64">
                    {JSON.stringify(extra, null, 2)}
                  </pre>
                </div>
              )
            })()}
          </div>
        </Modal>
      )}
    </div>
  )
}
