import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/features/auth/api'
import { useAuthStore } from '@/stores/auth'
import Logo from '@/assets/IconChart.png'

export default function SessionExpiredModal() {
  const [visible, setVisible] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const { user, setUser, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setVisible(true)
    window.addEventListener('simplifypos:session-expired', handler)
    return () => window.removeEventListener('simplifypos:session-expired', handler)
  }, [])

  // Bloquear navegación back/forward y atajos mientras está visible
  useEffect(() => {
    if (!visible) return

    // Insertar un estado fantasma para atrapar el botón "atrás"
    const trapState = { __sessionExpired: true }
    window.history.pushState(trapState, '')

    const onPopState = () => {
      // Cada vez que intenten ir atrás, volvemos a empujar el estado
      window.history.pushState(trapState, '')
    }
    const onKeyDown = (e: KeyboardEvent) => {
      // Bloquear F5, Cmd/Ctrl+R, Cmd/Ctrl+W, atajos de back
      if (e.key === 'F5') e.preventDefault()
      if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R' || e.key === 'w' || e.key === 'W')) {
        e.preventDefault()
      }
      if ((e.metaKey || e.altKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
      }
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('beforeunload', onBeforeUnload)

    // Bloquear scroll del body para que se sienta como un modal "duro"
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.body.style.overflow = prevOverflow
    }
  }, [visible])

  // Al montar el Layout, si hay usuario guardado pero sin token → refrescar silencioso
  // También escucha cambios en localStorage para sincronizar token entre pestañas
  useEffect(() => {
    let cancelled = false

    const tryAutoRefresh = async () => {
      const { getStoredToken } = await import('@/stores/auth')
      if (cancelled || getStoredToken() || !user) return
      try {
        const ax = await import('axios')
        const { data } = await ax.default.post<{ access_token: string }>(
          `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        if (!cancelled) setUser(user, data.access_token)
      } catch {
        // Solo mostrar el modal si realmente no podemos recuperar la sesión
        if (!cancelled) setVisible(true)
      }
    }

    // Pequeño delay para evitar flash del modal cuando otra pestaña ya está
    // refrescando o cuando localStorage acaba de sincronizar el token.
    const t = setTimeout(tryAutoRefresh, 400)

    // Sincronizar entre pestañas: si otra tab guarda un token, no expirar aquí.
    const onStorage = (e: StorageEvent) => {
      if (e.key && (e.key.includes('access_token') || e.key.includes('auth'))) {
        if (e.newValue) setVisible(false)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      clearTimeout(t)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const handleRelogin = async () => {
    if (!user || !password) return
    setLoading(true)
    try {
      const result = await authApi.login({ email: user.email, password })
      setUser(
        {
          id: result.user_id,
          email: result.email,
          nombre: result.nombre,
          role: result.role,
          permissions: result.permissions,
          must_change_password: result.must_change_password,
        },
        result.access_token
      )
      setVisible(false)
      setPassword('')
      toast.success('Sesión restaurada')
    } catch {
      toast.error('Contraseña incorrecta')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    setVisible(false)
    navigate('/login', { replace: true })
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 animate-fade-in"
      style={{ backdropFilter: 'blur(10px) saturate(120%)', WebkitBackdropFilter: 'blur(10px) saturate(120%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-8 text-center" style={{ background: 'var(--t-sidebar-bg)' }}>
          <img src={Logo} alt="SimplifyPOS" className="h-14 w-auto max-w-[4.5rem] mx-auto mb-3 opacity-90 object-contain" />
          <h2 className="text-white font-bold text-lg">Sesión expirada</h2>
          <p className="text-white/70 text-sm mt-1">
            Tu sesión venció. Ingresa tu contraseña para continuar.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Email — solo lectura */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--t-primary)' }}>
              {user?.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Continuando como</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRelogin()}
              placeholder="Contraseña"
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-[--t-primary]"
              style={{ '--t-primary': 'var(--t-primary)' } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handleRelogin}
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50"
            style={{ background: 'var(--t-primary)' }}
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Ingresando...</>
              : <><LogIn size={15} /> Continuar</>
            }
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
          >
            Cerrar sesión y salir
          </button>
        </div>
      </div>
    </div>
  )
}
