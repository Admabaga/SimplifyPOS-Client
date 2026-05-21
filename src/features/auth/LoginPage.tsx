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
      {/* ── Banner izquierdo ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--t-sidebar-bg)' }}
      >
        {/* Círculos decorativos — neutros sobre cualquier color de sidebar */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] right-[-60px] w-60 h-60 rounded-full bg-white/8" />
        <div className="absolute top-1/2 right-20 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10 text-center px-10">
          <img src={Logo} alt="SimplifyPOS" className="w-24 h-24 mx-auto mb-6 drop-shadow-xl" />
          <h1 className="text-4xl font-bold text-white mb-3">SimplifyPOS</h1>
          <p className="text-lg leading-relaxed max-w-sm" style={{ color: 'var(--t-accent)' }}>
            Gestión fácil, rápida y eficiente para tu negocio
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {['Inventario', 'Ventas', 'Reportes'].map((item) => (
              <div key={item} className="rounded-xl p-4 bg-white/10">
                <p className="text-sm font-medium" style={{ color: 'var(--t-accent)' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
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
