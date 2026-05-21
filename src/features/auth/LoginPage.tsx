import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react'
import { authApi } from './api'
import { useAuthStore } from '@/stores/auth'
import { apiError } from '@/shared/lib/apiError'
import Logo from '@/assets/Icon.png'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('simplifypos_remember') === '1')
  const [showPwd, setShowPwd] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    try {
      const result = await authApi.login(data)
      setUser(
        {
          id: result.user_id,
          email: result.email,
          nombre: result.nombre,
          role: result.role.toLowerCase(),   // normalizar: DB devuelve uppercase
          permissions: result.permissions,
          must_change_password: result.must_change_password,
        },
        result.access_token,
        rememberMe
      )
      toast.success(`¡Bienvenido, ${result.nombre}!`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'Credenciales incorrectas'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Banner izquierdo premium ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--t-sidebar-bg)' }}
      >
        {/* Orbs de iluminación ambiental */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-white/3 blur-2xl" />

        {/* Grid pattern sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 text-center px-12 max-w-lg">
          {/* Logo con glow */}
          <div className="relative inline-flex mb-8">
            <div className="absolute inset-0 rounded-3xl bg-white/20 blur-xl scale-110" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <img src={Logo} alt="SimplifyPOS" className="w-12 h-12 drop-shadow-xl" />
            </div>
          </div>

          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">
            SimplifyPOS
          </h1>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--t-accent)' }}>
            Gestión fácil, rápida y eficiente para tu negocio
          </p>
          <p className="text-sm opacity-50 text-white mb-10">
            El sistema POS que colombianos eligen para vender más
          </p>

          {/* Métricas visuales glassmorphism */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Inventario', icon: '📦', sub: 'Control total' },
              { label: 'Ventas', icon: '⚡', sub: 'En segundos' },
              { label: 'Reportes', icon: '📊', sub: 'Tiempo real' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-4 text-center border border-white/10"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
              >
                <span className="text-2xl block mb-1">{item.icon}</span>
                <p className="text-xs font-bold text-white">{item.label}</p>
                <p className="text-[10px] mt-0.5 opacity-60 text-white">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['Facturación DIAN', 'Multi-cajero', 'RBAC', 'Audit log', 'Caja inteligente'].map((f) => (
              <span
                key={f}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/15 text-white/70"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Subtle bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* ── Formulario derecho ── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ background: 'var(--t-primary-xlight)' }}
      >
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={Logo} alt="SimplifyPOS" className="w-16 h-16" />
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            {/* Header del form */}
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">Bienvenido de nuevo</h2>
              <p className="text-slate-500 text-sm">Ingresa tus credenciales para acceder al sistema</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  placeholder="usuario@empresa.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    placeholder="••••••••"
                    className="w-full px-4 pr-11 py-3 rounded-xl border border-slate-200 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Recordarme */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <span className="text-sm text-slate-600">Recordarme en este dispositivo</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
                style={{
                  background: loading
                    ? 'var(--t-primary-dark)'
                    : 'linear-gradient(135deg, var(--t-primary), var(--t-primary-dark))',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? 'Verificando...' : 'Acceder al sistema'}
              </button>
            </form>

            {/* Security badge */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span className="text-[11px]">Conexión cifrada · JWT RS256 · 2FA disponible</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            SimplifyPOS v1.0 · {new Date().getFullYear()} · Colombia 🇨🇴
          </p>
        </div>
      </div>
    </div>
  )
}
