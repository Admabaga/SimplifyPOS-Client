/**
 * Master — Negocios
 *
 * Es el padrón de la plataforma. Antes eran tarjetas gordas de tres columnas:
 * bonitas con seis negocios, imposibles de barrer con cincuenta. Un operador
 * que busca un negocio concreto necesita una lista densa que pueda recorrer
 * con la vista, y comparar cifras alineadas en columna — no repartidas dentro
 * de cajas.
 *
 * Se conserva lo único que las tarjetas hacían bien: distinguir de un golpe
 * quién está inactivo, y en qué negocio estás actuando ahora mismo.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, Building2, LogOut, Power, RefreshCw, Search, X,
} from 'lucide-react'
import { Button, EmptyState, PageHeader, Skeleton, Spinner } from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import apiClient from '@/shared/api/client'
import { useMasterStore } from '@/stores/master'
import toast from 'react-hot-toast'
import { Cifra, Cifras, Papel, Rotulo } from './components/consola'

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

// ─── Celdas ───────────────────────────────────────────────────────────────────

const nombreDe = (t: Tenant) => t.empresa.razon_social?.trim() || t.nombre

/** Cifra de una columna numérica. Cero se apaga: sólo estorba al comparar. */
function Num({ valor, moneda, alerta }: { valor: number; moneda?: boolean; alerta?: boolean }) {
  if (valor === 0) return <span className="num text-slate-300">—</span>
  return (
    <span className={`num ${alerta ? 'font-semibold text-rose-600' : 'text-slate-700'}`}>
      {moneda ? formatCOP(valor) : valor.toLocaleString('es-CO')}
    </span>
  )
}

function Fila({
  t,
  gestionando,
  onGestionar,
  onToggle,
  alternando,
}: {
  t: Tenant
  gestionando: boolean
  onGestionar: () => void
  onToggle: () => void
  alternando: boolean
}) {
  return (
    <tr
      className={`group transition-colors ${
        gestionando ? 'bg-[var(--t-primary-xlight)]' : 'hover:bg-slate-50/80'
      } ${t.activo ? '' : 'opacity-55'}`}
    >
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-center gap-2.5">
          {/* El filete sólo tiene color cuando dice algo. Pintar de verde a los
              activos sería gastar tinta en el estado normal: el ojo aprende a
              ignorarlo y deja de servir para detectar la excepción. */}
          <span
            className={`h-7 w-[3px] shrink-0 rounded-full ${
              gestionando ? 'bg-[var(--t-primary)]' : t.activo ? 'bg-slate-200' : 'bg-amber-400'
            }`}
            title={t.activo ? 'Activo' : 'Sin acceso'}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-slate-900">{nombreDe(t)}</p>
              {gestionando && (
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] t-bg-lt t-text-dk">
                  Actuando
                </span>
              )}
              {!t.activo && (
                <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Inactivo
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-slate-400">
              {t.email}
              {t.empresa.nit && <span className="num"> · NIT {t.empresa.nit}</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 text-[11.5px] text-slate-500">{t.empresa.ciudad || '—'}</td>
      <td className="px-3 text-right text-[12px]"><Num valor={t.stats.productos} /></td>
      <td className="px-3 text-right text-[12px]">
        <Num valor={t.stats.cuentas_abiertas} alerta={t.stats.cuentas_abiertas > 0} />
      </td>
      <td className="px-3 text-right text-[12px]">
        <Num valor={t.stats.valor_pendiente} moneda alerta={t.stats.valor_pendiente > 0} />
      </td>
      <td className="px-3 text-right text-[12px]"><Num valor={t.stats.total_ventas} /></td>
      <td className="py-2.5 pl-3 pr-4">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onGestionar}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              gestionando
                ? 'border-[var(--t-primary)] t-text-dk hover:bg-white'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900'
            }`}
          >
            {gestionando ? <><LogOut size={11} /> Salir</> : <>Entrar <ArrowRight size={11} /></>}
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={alternando}
            title={t.activo ? 'Desactivar acceso' : 'Activar acceso'}
            className={`rounded-lg p-1.5 transition-colors ${
              t.activo
                ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {alternando ? <Spinner size={12} /> : <Power size={12} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MasterPage() {
  const [busqueda, setBusqueda] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { setActiveTenant, clearActiveTenant, activeTenantId } = useMasterStore()

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

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (tenants ?? [])
      .filter((t) => {
        const coincide =
          !q ||
          t.nombre.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.empresa.razon_social ?? '').toLowerCase().includes(q) ||
          (t.empresa.ciudad ?? '').toLowerCase().includes(q) ||
          (t.empresa.nit ?? '').includes(q)
        return coincide && (verInactivos || t.activo)
      })
      .sort((a, b) => b.stats.valor_pendiente - a.stats.valor_pendiente)
  }, [tenants, busqueda, verInactivos])

  const totales = useMemo(() => {
    const lista = tenants ?? []
    return {
      activos: lista.filter((t) => t.activo).length,
      total: lista.length,
      productos: lista.reduce((s, t) => s + t.stats.productos, 0),
      cuentas: lista.reduce((s, t) => s + t.stats.cuentas_abiertas, 0),
      pendiente: lista.reduce((s, t) => s + t.stats.valor_pendiente, 0),
    }
  }, [tenants])

  function gestionar(t: Tenant) {
    if (activeTenantId === t.id) {
      clearActiveTenant()
      return
    }
    setActiveTenant(t.id, nombreDe(t))
    navigate('/dashboard')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Todos los negocios registrados en la plataforma"
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
        }
      />

      {isLoading && (
        <>
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-96 rounded-xl" />
        </>
      )}

      {error && (
        <EmptyState
          icon={<AlertCircle size={30} className="text-rose-400" />}
          title="Error al cargar negocios"
          description={apiError(error)}
        />
      )}

      {tenants && (
        <>
          <Papel className="p-5">
            <Cifras>
              <Cifra
                valor={`${totales.activos}/${totales.total}`}
                etiqueta="Negocios activos"
                nota={
                  totales.total - totales.activos > 0
                    ? `${totales.total - totales.activos} con acceso cortado`
                    : 'todos con acceso'
                }
              />
              <Cifra valor={totales.productos.toLocaleString('es-CO')} etiqueta="Productos" />
              <Cifra
                valor={totales.cuentas.toLocaleString('es-CO')}
                etiqueta="Fiados abiertos"
                tono={totales.cuentas > 0 ? 'yellow' : 'neutro'}
              />
              <Cifra
                valor={formatCOP(totales.pendiente)}
                etiqueta="Por cobrar en la red"
                nota="suma de todos los negocios"
                tono={totales.pendiente > 0 ? 'red' : 'neutro'}
              />
            </Cifras>
          </Papel>

          <div>
            <Rotulo
              contador={filtrados.length === totales.total ? undefined : `${filtrados.length} de ${totales.total}`}
              accion={
                <label className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[11px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={verInactivos}
                    onChange={(e) => setVerInactivos(e.target.checked)}
                    className="h-3 w-3 rounded border-slate-300"
                  />
                  Ver inactivos
                </label>
              }
            >
              Padrón
            </Rotulo>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, NIT, ciudad o correo…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm focus:outline-none"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {filtrados.length === 0 ? (
              <EmptyState
                icon={<Building2 size={30} className="text-slate-300" />}
                title="Sin resultados"
                description={
                  busqueda
                    ? 'Ningún negocio coincide con la búsqueda.'
                    : 'Aún no hay negocios registrados.'
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
                        <th className="py-2 pl-4 pr-3 text-left font-semibold">Negocio</th>
                        <th className="px-3 text-left font-semibold">Ciudad</th>
                        <th className="px-3 text-right font-semibold">Productos</th>
                        <th className="px-3 text-right font-semibold">Fiados</th>
                        <th className="px-3 text-right font-semibold">Por cobrar</th>
                        <th className="px-3 text-right font-semibold">Ventas</th>
                        <th className="py-2 pl-3 pr-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtrados.map((t) => (
                        <Fila
                          key={t.id}
                          t={t}
                          gestionando={activeTenantId === t.id}
                          onGestionar={() => gestionar(t)}
                          onToggle={() => toggleMutation.mutate(t.id)}
                          alternando={
                            toggleMutation.isPending && toggleMutation.variables === t.id
                          }
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="mt-3 text-[10.5px] text-slate-400">
              Ordenado por saldo por cobrar: arriba queda el negocio con más plata en la calle.
              Apagar el acceso no borra nada — el negocio deja de poder entrar hasta que lo
              reactives.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
