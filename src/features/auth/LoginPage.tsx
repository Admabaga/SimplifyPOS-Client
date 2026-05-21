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
import IconChart from '@/assets/IconChart.png'

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
          {/* Icono principal con glow */}
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-3xl bg-white/15 blur-2xl scale-125" />
            <img
              src={IconChart}
              alt="SimplifyPOS"
              className="relative w-28 h-28 drop-shadow-2xl"
            />
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
            <img src={IconChart} alt="SimplifyPOS" className="w-16 h-16" />
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Iniciar sesión</h2>
            <p className="text-gray-500 text-sm mb-6">Ingresa tus credenciales para continuar</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  placeholder="usuario@empresa.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm transition"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    placeholder="••••••••"
                    className="w-full px-4 pr-11 py-2.5 rounded-lg border border-gray-300 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-600">Recordarme en este dispositivo</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-all"
                style={{
                  background: loading ? 'var(--t-primary-dark)' : 'var(--t-primary)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            SimplifyPOS v1.0 · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
