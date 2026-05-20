import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Users,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Power,
  RefreshCw,
  Search,
  AlertCircle,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  Spinner,
} from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import apiClient from '@/shared/api/client'
import { useMasterStore } from '@/stores/master'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantEmpresa {
  razon_social: string | null
  nit: string | null
  ciudad: string | null
  departamento: string | null
  telefono: string | null
  email: string | null
}

interface TenantStats {
  productos: number
  cuentas_abiertas: number
  valor_pendiente: number
  total_ventas: number
}

interface Tenant {
  id: number
  nombre: string
  email: string
  activo: boolean
  empresa: TenantEmpresa
  stats: TenantStats
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<Tenant[]>('/master/tenants')
  return data
}

async function toggleTenantActivo(adminId: number): Promise<{ id: number; activo: boolean }> {
  const { data } = await apiClient.patch(`/master/tenants/${adminId}/toggle-activo`)
  return data
}

// ─── Tenant Card ──────────────────────────────────────────────────────────────

function TenantCard({ tenant, onToggle, isToggling }: {
  tenant: Tenant
  onToggle: () => void
  isToggling: boolean
}) {
  const { setActiveTenant, clearActiveTenant, activeTenantId } = useMasterStore()
  const navigate = useNavigate()
  const isActive = activeTenantId === tenant.id

  const handleManage = () => {
    if (isActive) {
      clearActiveTenant()
    } else {
      setActiveTenant(tenant.id, tenant.empresa.razon_social ?? tenant.nombre)
      navigate('/')
    }
  }

  return (
    <div className={`
      relative rounded-xl border transition-all duration-200
      ${tenant.activo
        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
      }
      ${isActive ? 'ring-2 ring-indigo-500' : ''}
    `}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {tenant.empresa.razon_social ?? '— Sin configurar —'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tenant.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isActive && (
              <Badge variant="purple" className="text-xs">Gestionando</Badge>
            )}
            <Badge variant={tenant.activo ? 'green' : 'gray'}>
              {tenant.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>

        {tenant.empresa.nit && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            NIT: <span className="font-mono">{tenant.empresa.nit}</span>
            {tenant.empresa.ciudad && ` · ${tenant.empresa.ciudad}`}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="p-5 grid grid-cols-2 gap-3">
        <StatItem
          icon={<ShoppingCart size={14} className="text-blue-500" />}
          label="Productos"
          value={tenant.stats.productos.toLocaleString('es-CO')}
        />
        <StatItem
          icon={<CreditCard size={14} className="text-orange-500" />}
          label="Cuentas abiertas"
          value={tenant.stats.cuentas_abiertas.toLocaleString('es-CO')}
          highlight={tenant.stats.cuentas_abiertas > 0}
        />
        <StatItem
          icon={<TrendingUp size={14} className="text-green-500" />}
          label="Total ventas"
          value={tenant.stats.total_ventas.toLocaleString('es-CO')}
        />
        <StatItem
          icon={<AlertCircle size={14} className="text-red-500" />}
          label="Valor pendiente"
          value={formatCOP(tenant.stats.valor_pendiente)}
          highlight={tenant.stats.valor_pendiente > 0}
          small
        />
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <Button
          size="sm"
          variant={isActive ? 'primary' : 'outline'}
          className="flex-1"
          onClick={handleManage}
        >
          {isActive ? 'Salir del negocio' : 'Gestionar negocio'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggle}
          disabled={isToggling}
          title={tenant.activo ? 'Desactivar acceso' : 'Activar acceso'}
          className={tenant.activo ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600'}
        >
          {isToggling ? <Spinner size={14} /> : <Power size={14} />}
        </Button>
      </div>
    </div>
  )
}

function StatItem({ icon, label, value, highlight = false, small = false }: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  small?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`font-semibold ${small ? 'text-xs' : 'text-sm'} ${highlight ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ tenants }: { tenants: Tenant[] }) {
  const activos = tenants.filter((t) => t.activo).length
  const totalProductos = tenants.reduce((s, t) => s + t.stats.productos, 0)
  const totalCuentas = tenants.reduce((s, t) => s + t.stats.cuentas_abiertas, 0)
  const totalPendiente = tenants.reduce((s, t) => s + t.stats.valor_pendiente, 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Negocios activos', value: `${activos} / ${tenants.length}`, color: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'Total productos', value: totalProductos.toLocaleString('es-CO'), color: 'text-blue-600' },
        { label: 'Cuentas abiertas', value: totalCuentas.toLocaleString('es-CO'), color: 'text-orange-600' },
        { label: 'Valor pendiente total', value: formatCOP(totalPendiente), color: 'text-red-600' },
      ].map((s) => (
        <Card key={s.label} padding>
          <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
        </Card>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MasterPage() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const qc = useQueryClient()

  const { data: tenants, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['master', 'tenants'],
    queryFn: fetchTenants,
    staleTime: 30_000,
  })

  const toggleMutation = useMutation({
    mutationFn: toggleTenantActivo,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['master', 'tenants'] })
      toast.success(result.activo ? 'Negocio activado' : 'Negocio desactivado')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const filtered = (tenants ?? []).filter((t) => {
    const matchSearch =
      !search ||
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      (t.empresa.razon_social ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (t.empresa.nit ?? '').includes(search)
    const matchActive = showInactive || t.activo
    return matchSearch && matchActive
  })

  return (
    <div>
      <PageHeader
        title="Panel Master"
        subtitle="Gestiona todos los negocios registrados en la plataforma"
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
        }
      />

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      )}

      {error && (
        <EmptyState
          icon={<AlertCircle size={32} className="text-red-400" />}
          title="Error al cargar negocios"
          description={apiError(error)}
        />
      )}

      {tenants && (
        <>
          <SummaryBar tenants={tenants} />

          {/* Filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar negocio, NIT, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Mostrar inactivos
            </label>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Building2 size={32} className="text-gray-300" />}
              title="No hay negocios"
              description={search ? 'Ningún negocio coincide con la búsqueda.' : 'Aún no hay negocios registrados.'}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  onToggle={() => toggleMutation.mutate(tenant.id)}
                  isToggling={toggleMutation.isPending && toggleMutation.variables === tenant.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
