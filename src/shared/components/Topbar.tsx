import { useRef, useEffect, useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { Bell, AlertTriangle, PackageX, ArrowRight, CheckCircle2, Palette } from 'lucide-react'
import { notificationsApi, type StockNotification } from '@/features/notifications/api'
import ThemePanel from './ThemePanel'

const ROUTE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Productos',
  categories: 'Categorías',
  suppliers: 'Proveedores',
  invoices: 'Facturas',
  accounts: 'Cuentas',
  caja: 'Caja',
  expenses: 'Gastos',
  reports: 'Reportes',
  notifications: 'Notificaciones',
  admin: 'Admin',
  users: 'Usuarios',
  roles: 'Roles',
  audit: 'Audit Log',
  sales: 'Ventas',
  profile: 'Perfil',
}

// ─── Breadcrumbs ───────────────────────────────────────────────────────────────

function Breadcrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        {parts.map((part, i) => {
          const isLast = i === parts.length - 1
          const to = '/' + parts.slice(0, i + 1).join('/')
          const label = ROUTE_NAMES[part] ?? part

          return (
            <li key={to} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 select-none">/</span>}
              {isLast ? (
                <span className="font-medium text-slate-700">{label}</span>
              ) : (
                <Link to={to} className="text-slate-400 hover:text-slate-600 transition-colors">
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Ítem del dropdown ─────────────────────────────────────────────────────────

function NotifDropdownItem({
  n,
  onClose,
}: {
  n: StockNotification
  onClose: () => void
}) {
  const navigate = useNavigate()
  const isCritical = n.severity === 'critical'

  return (
    <button
      onClick={() => {
        onClose()
        navigate(`/products?highlight=${n.product_id}`)
      }}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group`}
    >
      {/* Icono */}
      <div
        className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${
          isCritical ? 'bg-red-100' : 'bg-yellow-100'
        }`}
      >
        {isCritical ? (
          <PackageX size={14} className="text-red-500" />
        ) : (
          <AlertTriangle size={14} className="text-yellow-500" />
        )}
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isCritical ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
            }`}
          >
            {isCritical ? 'Agotado' : 'Poco stock'}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-700 truncate leading-snug">
          {n.product_nombre}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
          {n.stock_actual === 0
            ? `Sin unidades — vendes ~${n.avg_semanal}/semana`
            : `${n.stock_actual} uds • ~${n.dias_restantes} días de stock`}
        </p>
      </div>

      {/* Flecha */}
      <ArrowRight
        size={13}
        className="shrink-0 mt-1 text-slate-300 group-hover:text-slate-500 transition-colors"
      />
    </button>
  )
}

// ─── Bell con dropdown ─────────────────────────────────────────────────────────

function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'stock'],
    queryFn: () => notificationsApi.getStockAlerts(),
    // Caché del backend se invalida en cada venta/reposición.
    // refetchOnWindowFocus: true → al volver a la app tras registrar una venta,
    // la campana se actualiza automáticamente si el caché cambió.
    refetchInterval: 60 * 60 * 1000,
    staleTime: 0,               // siempre refetch desde server al montar/volver
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const count = data?.count ?? 0
  const hasCritical = (data?.critical ?? 0) > 0
  const preview = (data?.notifications ?? []).slice(0, 5)

  // Cerrar con click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Botón bell */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-1.5 rounded-lg transition-colors relative ${
          open
            ? 'bg-slate-100 text-slate-700'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
        aria-label="Notificaciones"
      >
        <Bell size={17} />
        {/* Badge */}
        {count > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-black text-white flex items-center justify-center leading-none ${
              hasCritical ? 'bg-red-500' : 'bg-yellow-400'
            }`}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-700">Notificaciones</span>
              {count > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full text-white ${
                    hasCritical ? 'bg-red-500' : 'bg-yellow-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </div>
            {count > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                {data?.critical ? (
                  <span className="font-semibold text-red-500">{data.critical} agotados</span>
                ) : null}
                {data?.critical && data?.warning ? (
                  <span>·</span>
                ) : null}
                {data?.warning ? (
                  <span className="font-semibold text-yellow-500">{data.warning} bajos</span>
                ) : null}
              </div>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 t-border border-t-transparent rounded-full animate-spin" />
              </div>
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center py-8 px-4 text-center">
                <div className="w-12 h-12 rounded-full t-bg-lt flex items-center justify-center mb-2">
                  <CheckCircle2 size={22} className="t-text" />
                </div>
                <p className="text-sm font-semibold text-slate-600">¡Todo al día!</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Todos los productos tienen stock suficiente
                </p>
              </div>
            ) : (
              preview.map((n) => (
                <NotifDropdownItem key={n.product_id} n={n} onClose={() => setOpen(false)} />
              ))
            )}
          </div>

          {/* Footer */}
          {count > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/notifications')
                }}
                className="w-full text-xs font-semibold t-text hover:t-text-dk flex items-center justify-center gap-1.5 py-1"
              >
                Ver todas las notificaciones ({count})
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export default function Topbar() {
  const { user } = useAuthStore()
  const [themeOpen, setThemeOpen] = useState(false)

  return (
    <header className="hidden lg:flex h-14 bg-white border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-20">
      <Breadcrumbs />
      <div className="flex items-center gap-1.5">
        {/* Personalizar tema */}
        <button
          onClick={() => setThemeOpen((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${
            themeOpen
              ? 'bg-slate-100 text-slate-700'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          aria-label="Personalizar interfaz"
          title="Personalizar"
        >
          <Palette size={16} />
        </button>
        <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />

        <NotificationBell />
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full t-bg flex items-center justify-center text-white text-xs font-bold select-none">
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-700 leading-tight">{user.nombre}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
