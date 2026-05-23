import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import ThemePanel from './ThemePanel'
import {
  LayoutDashboard, Package, Tags, Truck, FileText, Users,
  Receipt, CreditCard, TrendingUp, LogOut, ChevronLeft, ChevronRight,
  Shield, ClipboardList, ActivitySquare, Menu, X, Wallet, UserCog, Landmark, Bell,
  ScrollText, Building2, XCircle, BarChart3, Server, Brain, Palette,
} from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useMasterStore } from '@/stores/master'
import { authApi } from '@/features/auth/api'
import Logo from '@/assets/IconChart.png'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/features/notifications/api'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  permission?: string
}
interface NavGroup {
  label: string
  items: NavItem[]
  permission?: string
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operaciones',
    items: [
      { label: 'Dashboard',     to: '/dashboard',      icon: <LayoutDashboard size={17} /> },
      { label: 'Cuentas',       to: '/accounts',       icon: <Users size={17} />,         permission: 'cuentas:read' },
      { label: 'Clientes',      to: '/clients',        icon: <UserCog size={17} />,        permission: 'cuentas:read' },
      { label: 'Caja',          to: '/caja',           icon: <Landmark size={17} />,      permission: 'cuentas:read' },
      { label: 'Facturas',      to: '/invoices',       icon: <FileText size={17} />,      permission: 'facturas:read' },
      { label: 'Ventas',        to: '/sales',          icon: <Receipt size={17} />,       permission: 'ventas:read' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos',       to: '/products',       icon: <Package size={17} />,       permission: 'productos:read' },
      { label: 'Notificaciones',  to: '/notifications',  icon: <Bell size={17} />,          permission: 'productos:read' },
      { label: 'Categorías',      to: '/categories',     icon: <Tags size={17} />,          permission: 'categorias:read' },
      { label: 'Proveedores',     to: '/suppliers',      icon: <Truck size={17} />,         permission: 'proveedores:read' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { label: 'Gastos',        to: '/expenses',       icon: <Wallet size={17} />,        permission: 'gastos:read' },
      { label: 'Medios de pago',to: '/payment-methods',icon: <CreditCard size={17} />,   permission: 'medios_pago:read' },
      { label: 'Reportes',      to: '/reports',        icon: <TrendingUp size={17} />,    permission: 'reportes:read' },
      { label: 'Facturación',   to: '/admin/billing',  icon: <ScrollText size={17} />,    permission: 'facturacion:read' },
    ],
  },
  {
    label: 'Administración',
    permission: 'users:manage',
    items: [
      { label: 'Usuarios',      to: '/admin/users',    icon: <Shield size={17} />,        permission: 'users:manage' },
      { label: 'Roles',         to: '/admin/roles',    icon: <ClipboardList size={17} />, permission: 'roles:manage' },
      { label: 'Audit Log',     to: '/admin/audit',    icon: <ActivitySquare size={17} />,permission: 'audit:read' },
    ],
  },
]

function NavContent({ collapsed, onNavigate, can, role }: {
  collapsed: boolean
  onNavigate?: () => void
  can: (p: string) => boolean
  role?: string
}) {
  const { activeTenantId, activeTenantName, clearActiveTenant } = useMasterStore()
  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'stock'],
    queryFn: () => notificationsApi.getStockAlerts(),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: can('productos:read'),
  })
  const notifCount = notifData?.count ?? 0
  const notifCritical = (notifData?.critical ?? 0) > 0
  return (
    <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto py-2 px-2">

      {/* Tenant activo banner — solo visible para master cuando gestionando un negocio */}
      {role === 'master' && activeTenantId && (
        <div className={clsx(
          'mb-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30',
          collapsed ? 'p-2' : 'px-3 py-2'
        )}>
          {collapsed ? (
            <button onClick={() => clearActiveTenant()} title="Salir del negocio" className="w-full flex justify-center text-indigo-300 hover:text-white transition-colors">
              <XCircle size={16} />
            </button>
          ) : (
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wide text-indigo-300 font-semibold">Gestionando</p>
                <p className="text-xs text-white font-medium truncate leading-tight mt-0.5">{activeTenantName}</p>
              </div>
              <button
                onClick={() => clearActiveTenant()}
                title="Salir del negocio"
                className="shrink-0 text-indigo-300 hover:text-white transition-colors mt-0.5"
              >
                <XCircle size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Panel Master — solo master */}
      {role === 'master' && (
        <div className="mb-1">
          {!collapsed && (
            <p style={{ color: 'var(--t-accent-muted)' }} className="px-2 pt-3 pb-1 text-[9px] uppercase tracking-[0.14em] font-semibold select-none">
              Master
            </p>
          )}
          {collapsed && <div className="h-px bg-white/10 my-2 mx-1" />}
          {[
            { to: '/master/analytics', label: 'Analytics', icon: <BarChart3 size={17} />, title: 'Métricas cross-tenant del ecosistema' },
            { to: '/master',           label: 'Negocios',  icon: <Building2 size={17} />, title: 'Gestión de tenants' },
            { to: '/master/infra',     label: 'Infra',     icon: <Server size={17} />,    title: 'Salud técnica e infraestructura' },
            { to: '/master/ai',        label: 'IA Center', icon: <Brain size={17} />,     title: 'Centro de Inteligencia IA' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              title={item.title}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'relative flex items-center gap-3 py-2 rounded-lg transition-all duration-100 text-sm select-none',
                  collapsed ? 'justify-center px-2' : 'px-3',
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span style={{ background: 'var(--t-accent)' }} className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" />
                  )}
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}

      {/* Gestión de usuarios — visible para admin y master */}
      {(role === 'admin' || role === 'master') && (
        <div className="mb-1">
          {!collapsed ? (
            <p style={{ color: 'var(--t-accent-muted)' }} className="px-2 pt-3 pb-1 text-[9px] uppercase tracking-[0.14em] font-semibold select-none">
              Equipo
            </p>
          ) : (
            <div className="h-px bg-white/10 my-2 mx-1" />
          )}
          <NavLink
            to="/admin/users"
            title="Usuarios"
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 py-2 rounded-lg transition-all duration-100 text-sm select-none',
                collapsed ? 'justify-center px-2' : 'px-3',
                isActive
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span style={{ background: 'var(--t-accent)' }} className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" />
                )}
                <span className="shrink-0"><UserCog size={17} /></span>
                {!collapsed && <span className="truncate">Usuarios</span>}
              </>
            )}
          </NavLink>
        </div>
      )}

      {NAV_GROUPS.map((group) => {
        if (group.permission && !can(group.permission)) return null
        const items = group.items.filter((i) => !i.permission || can(i.permission))
        if (items.length === 0) return null
        return (
          <div key={group.label} className="mb-1">
            {!collapsed ? (
              <p style={{ color: 'var(--t-accent-muted)' }} className="px-2 pt-3 pb-1 text-[9px] uppercase tracking-[0.14em] font-semibold select-none">
                {group.label}
              </p>
            ) : (
              <div className="h-px bg-white/10 my-2 mx-1" />
            )}
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    'relative flex items-center gap-3 py-2 rounded-lg transition-all duration-100 text-sm select-none',
                    collapsed ? 'justify-center px-2' : 'px-3',
                    isActive
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && !collapsed && (
                      <span style={{ background: 'var(--t-accent)' }} className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" />
                    )}
                    <span className="shrink-0 relative">
                      {item.icon}
                      {/* Badge notificaciones */}
                      {item.to === '/notifications' && notifCount > 0 && (
                        <span
                          className={`absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center leading-none ${
                            notifCritical ? 'bg-red-500' : 'bg-yellow-400'
                          }`}
                        >
                          {notifCount > 9 ? '9+' : notifCount}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {/* Badge texto cuando no colapsado */}
                    {!collapsed && item.to === '/notifications' && notifCount > 0 && (
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-full text-white leading-none ${
                          notifCritical ? 'bg-red-500' : 'bg-yellow-400'
                        }`}
                      >
                        {notifCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  const { user, clearAuth, can } = useAuthStore()
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore()
  const { clearActiveTenant } = useMasterStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [themeOpen, setThemeOpen]   = useState(false)

  const handleLogout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    clearActiveTenant()  // limpiar tenant activo al salir
    clearAuth()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  const BottomBar = ({ collapsed: c }: { collapsed: boolean }) => (
    <div className={clsx('shrink-0 border-t border-white/10 px-2 py-2 space-y-1')}>
      {/* Toggle collapse — siempre visible */}
      <button
        onClick={toggleSidebar}
        aria-label={c ? 'Expandir menú' : 'Colapsar menú'}
        className={clsx(
          'flex items-center gap-2 w-full rounded-lg px-3 py-2 transition-colors text-xs',
          'text-white/50 hover:text-white hover:bg-white/10',
          c && 'justify-center'
        )}
      >
        {c ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Colapsar</span></>}
      </button>

      {/* User info — clickeable → /profile */}
      {!c && user && (
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-2 py-1.5 w-full rounded-lg hover:bg-white/10 transition-colors text-left group"
          title="Ver mi perfil"
        >
          <div style={{ background: 'var(--t-primary)' }} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate leading-tight">{user.nombre}</p>
            <p style={{ color: 'var(--t-accent)' }} className="text-[10px] truncate leading-tight opacity-80">{user.email}</p>
          </div>
          <UserCog size={12} style={{ color: 'var(--t-accent)' }} className="opacity-50 group-hover:opacity-100 shrink-0 transition-opacity" />
        </button>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Cerrar sesión"
        className={clsx(
          'flex items-center gap-2 text-white/50 hover:text-white hover:bg-white/10',
          'rounded-lg px-3 py-2 transition-colors text-xs w-full',
          c && 'justify-center'
        )}
      >
        <LogOut size={14} />
        {!c && 'Cerrar sesión'}
      </button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        style={{ background: 'var(--t-sidebar-bg)' }}
        className={clsx(
          'hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30',
          'transition-[width] duration-200 ease-in-out overflow-hidden',
          collapsed ? 'w-[64px]' : 'w-60'
        )}
        aria-label="Sidebar"
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center shrink-0 border-b border-white/10',
          collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4'
        )}>
          <img
            src={Logo}
            alt="SimplifyPOS"
            className="h-10 w-auto max-w-[3rem] object-contain shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight">SimplifyPOS</p>
              <p style={{ color: 'var(--t-accent)' }} className="text-[11px] leading-tight mt-0.5 opacity-80">Point of Sale</p>
            </div>
          )}
        </div>

        <NavContent collapsed={collapsed} can={can} role={user?.role} />
        <BottomBar collapsed={collapsed} />
      </aside>

      {/* ── Mobile topbar ─────────────────────────────────── */}
      <div style={{ background: 'var(--t-sidebar-bg)' }} className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 shadow-lg">
        <div className="flex items-center gap-2.5">
          <img src={Logo} alt="SimplifyPOS" className="h-8 w-auto max-w-[2.5rem] object-contain" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">SimplifyPOS</p>
            <p style={{ color: 'var(--t-accent)' }} className="text-[10px] leading-tight opacity-80">Point of Sale</p>
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          {/* Tema — visible en mobile */}
          <button
            onClick={() => setThemeOpen((v) => !v)}
            aria-label="Personalizar tema"
            title="Personalizar interfaz"
            className={`p-1.5 rounded-lg transition-colors ${
              themeOpen ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Palette size={17} />
          </button>
          <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{ background: 'var(--t-sidebar-bg)' }} className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 shadow-2xl flex flex-col">
            {/* Logo mobile */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 shrink-0">
              <img src={Logo} alt="SimplifyPOS" className="h-9 w-auto max-w-[3rem] object-contain" />
              <div>
                <p className="text-white font-bold text-sm leading-tight">SimplifyPOS</p>
                <p style={{ color: 'var(--t-accent)' }} className="text-[11px] leading-tight mt-0.5 opacity-80">Point of Sale</p>
              </div>
            </div>
            <NavContent collapsed={false} can={can} role={user?.role} onNavigate={() => setMobileOpen(false)} />
            <BottomBar collapsed={false} />
          </aside>
        </>
      )}
    </>
  )
}
