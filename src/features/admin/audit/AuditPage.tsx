import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { auditApi } from './api'
import { Card, PageHeader, Table, Th, Td, Badge, Spinner, EmptyState } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/formatters'

const LIMIT = 50

const ACTION_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'blue' | 'gray'> = {
  create: 'green',
  delete: 'red',
  update: 'yellow',
  login: 'blue',
  logout: 'gray',
}

export default function AuditPage() {
  const [offset, setOffset] = useState(0)
  const [resource, setResource] = useState('')

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['audit', offset, resource],
    queryFn: () => auditApi.list({ limit: LIMIT, offset, resource: resource || undefined }),
  })

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Registro de acciones del sistema" />

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Filtrar por recurso (ej: productos)"
          value={resource}
          onChange={(e) => { setResource(e.target.value); setOffset(0) }}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none bg-white w-full sm:w-64"
        />
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : entries.length === 0 ? (
          <EmptyState icon={<ClipboardList size={40} />} title="Sin registros" />
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
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
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

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Mostrando {offset + 1}–{offset + entries.length}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setOffset(offset + LIMIT)}
            disabled={entries.length < LIMIT}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
