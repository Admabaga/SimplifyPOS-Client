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

  // Al montar el Layout, si hay usuario guardado pero sin token → refrescar silencioso
  useEffect(() => {
    const tryAutoRefresh = async () => {
      const { getStoredToken } = await import('@/stores/auth')
      if (!getStoredToken() && user) {
        try {
          const { data } = await import('@/shared/api/client').then(m => {
            return import('axios').then(ax =>
              ax.default.post<{ access_token: string }>(
                `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
                {},
                { withCredentials: true }
              )
            )
          })
          setUser(user, data.access_token)
        } catch {
          // Cookie expirada — mostrar modal en lugar de borrar todo
          setVisible(true)
        }
      }
    }
    tryAutoRefresh()
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-8 text-center" style={{ background: 'var(--t-sidebar-bg)' }}>
          <img src={Logo} alt="SimplifyPOS" className="w-12 h-12 mx-auto mb-3 opacity-90" />
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
