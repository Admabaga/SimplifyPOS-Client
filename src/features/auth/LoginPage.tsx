import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, LogIn, Eye, EyeOff,
  Package, Zap, BarChart3, Shield, Receipt, Users, Wallet,
  TrendingUp, Sparkles,
} from 'lucide-react'
import { authApi } from './api'
import { useAuthStore } from '@/stores/auth'
import { apiError } from '@/shared/lib/apiError'
import IconChart from '@/assets/IconChart.png'

// ─── Live activity panel — feed dinámico estilo dashboard ────────────────────
const TICKER_ITEMS = [
  { icon: Receipt,   text: 'Venta registrada',  value: '$48.500',   color: 'text-emerald-300', barPct: 72 },
  { icon: Package,   text: 'Stock actualizado', value: '+15 unid.', color: 'text-blue-300',    barPct: 45 },
  { icon: Wallet,    text: 'Caja abierta',      value: 'Sucursal 1',color: 'text-purple-300',  barPct: 60 },
  { icon: Users,     text: 'Nueva cuenta',      value: 'Mesa 4',    color: 'text-amber-300',   barPct: 30 },
  { icon: TrendingUp,text: 'Meta diaria',       value: '87%',       color: 'text-emerald-300', barPct: 87 },
  { icon: Shield,    text: 'Sesión segura',     value: 'JWT RS256', color: 'text-cyan-300',    barPct: 95 },
]

// Mini sparkline animado — datos generados al vuelo
function MiniSpark({ color = 'rgba(110,231,183,0.9)' }: { color?: string }) {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: 12 }, () => Math.random() * 0.6 + 0.2)
  )
  useEffect(() => {
    const t = setInterval(() => {
      setData((d) => [...d.slice(1), Math.random() * 0.7 + 0.2])
    }, 900)
    return () => clearInterval(t)
  }, [])

  const w = 64
  const h = 22
  const points = data
    .map((v, i) => `${(i * w) / (data.length - 1)},${h - v * h}`)
    .join(' ')
  const area = `0,${h} ${points} ${w},${h}`

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'all 600ms ease' }}
      />
    </svg>
  )
}

function LiveTicker() {
  const [idx, setIdx] = useState(0)
  const [counter, setCounter] = useState(2847)
  const [isAnimating, setIsAnimating] = useState(false)

  // Rotación de items
  useEffect(() => {
    const t = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setIdx((i) => (i + 1) % TICKER_ITEMS.length)
        setIsAnimating(false)
      }, 280)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Contador de ventas que sube
  useEffect(() => {
    const t = setInterval(() => {
      setCounter((c) => c + Math.floor(Math.random() * 3) + 1)
    }, 1400)
    return () => clearInterval(t)
  }, [])

  const item = TICKER_ITEMS[idx]!
  const Icon = item.icon

  return (
    <div
      className="relative w-[300px] rounded-2xl border border-white/10 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header: live indicator + total operaciones */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-white/70">En vivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/50">Operaciones hoy</span>
          <span className="text-[11px] font-bold tabular-nums text-emerald-300 transition-all">
            {counter.toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Cuerpo: item rotativo + sparkline */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-300 ${
            isAnimating ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
          }`}
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <Icon size={15} className={item.color} />
        </div>
        <div
          className={`flex-1 min-w-0 transition-all duration-300 ${
            isAnimating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <p className="text-[11px] text-white/55 leading-tight">{item.text}</p>
          <p className={`text-sm font-bold tabular-nums truncate ${item.color}`}>{item.value}</p>
          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${item.barPct}%`, background: 'currentColor', color: 'var(--t-accent)' }}
            />
          </div>
        </div>
        <div className="shrink-0 -mr-1">
          <MiniSpark color="var(--t-accent)" />
        </div>
      </div>

      {/* Dots indicador de posición */}
      <div className="flex items-center justify-center gap-1 pb-2">
        {TICKER_ITEMS.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === idx ? 'w-4 bg-white/70' : 'w-1 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Contador animado ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const duration = 1400
    const steps = 40
    const stepValue = target / steps
    let current = 0
    const t = setInterval(() => {
      current += 1
      if (current >= steps) {
        setValue(target)
        clearInterval(t)
      } else {
        setValue(Math.floor(stepValue * current))
      }
    }, duration / steps)
    return () => clearInterval(t)
  }, [target])
  return <>{value.toLocaleString('es-CO')}{suffix}</>
}

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
      {/* ── Banner izquierdo premium con animaciones ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--t-sidebar-bg)' }}
      >
        {/* Keyframes inline */}
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50% { transform: translateY(-14px) rotate(2deg); }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.08); }
          }
          @keyframes drift-1 {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(30px, -20px); }
            66% { transform: translate(-20px, 25px); }
          }
          @keyframes drift-2 {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(-35px, -25px); }
          }
          @keyframes fade-up {
            0% { opacity: 0; transform: translateY(16px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .anim-float    { animation: float-slow 6s ease-in-out infinite; }
          .anim-glow     { animation: pulse-glow 4s ease-in-out infinite; }
          .anim-drift-1  { animation: drift-1 18s ease-in-out infinite; }
          .anim-drift-2  { animation: drift-2 22s ease-in-out infinite; }
          .anim-fade-up  { animation: fade-up 0.7s ease-out both; }
          .text-shimmer {
            background: linear-gradient(110deg, #ffffff 0%, #ffffff 35%, var(--t-accent) 50%, #ffffff 65%, #ffffff 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 4.5s linear infinite;
          }
        `}</style>

        {/* Orbs animados de iluminación ambiental */}
        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full blur-3xl anim-drift-1"
             style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-32 w-[380px] h-[380px] rounded-full blur-3xl anim-drift-2"
             style={{ background: 'radial-gradient(circle, var(--t-accent) 0%, transparent 70%)', opacity: 0.18 }} />
        <div className="absolute top-1/3 right-0 w-72 h-72 rounded-full bg-white/[0.04] blur-2xl anim-drift-1" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />

        {/* Partículas flotantes decorativas */}
        {[
          { top: '15%', left: '12%', size: 6, delay: '0s' },
          { top: '22%', right: '18%', size: 4, delay: '1.2s' },
          { top: '68%', left: '8%', size: 5, delay: '2.4s' },
          { top: '78%', right: '14%', size: 3, delay: '0.6s' },
          { top: '40%', left: '6%', size: 4, delay: '1.8s' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/30 anim-glow"
            style={{
              top: p.top,
              left: p.left,
              right: p.right,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 text-center px-10 max-w-xl">
          {/* Live ticker en la parte superior */}
          <div className="flex justify-center mb-7 anim-fade-up" style={{ animationDelay: '0.1s' }}>
            <LiveTicker />
          </div>

          {/* Icono con float + glow */}
          <div className="relative inline-flex mb-6 anim-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 rounded-3xl blur-2xl scale-150 anim-glow"
                 style={{ background: 'radial-gradient(circle, var(--t-accent) 0%, transparent 70%)' }} />
            <img
              src={IconChart}
              alt="SimplifyPOS"
              className="relative h-28 w-auto max-w-[9rem] object-contain drop-shadow-2xl anim-float"
            />
          </div>

          {/* Título con shimmer */}
          <h1 className="text-5xl font-extrabold mb-2 tracking-tight text-shimmer anim-fade-up"
              style={{ animationDelay: '0.3s' }}>
            SimplifyPOS
          </h1>

          <p className="text-base font-semibold mb-1 anim-fade-up"
             style={{ color: 'var(--t-accent)', animationDelay: '0.4s' }}>
            Gestión fácil, rápida y eficiente para tu negocio
          </p>
          <p className="text-sm text-white/55 mb-8 anim-fade-up" style={{ animationDelay: '0.5s' }}>
            El sistema POS que colombianos eligen para vender más
          </p>

          {/* KPIs animados con SVG icons */}
          <div className="grid grid-cols-3 gap-3 mb-7 anim-fade-up" style={{ animationDelay: '0.6s' }}>
            {[
              { label: 'Inventario', icon: Package,   value: 100, suffix: '%', sub: 'Control total',  ring: 'ring-blue-400/30',    iconBg: 'bg-blue-500/15',    iconColor: 'text-blue-300'   },
              { label: 'Ventas',     icon: Zap,       value: 8,   suffix: 's', sub: 'Por venta',      ring: 'ring-amber-400/30',   iconBg: 'bg-amber-500/15',   iconColor: 'text-amber-300'  },
              { label: 'Reportes',   icon: BarChart3, value: 24,  suffix: '/7', sub: 'Tiempo real',   ring: 'ring-emerald-400/30', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-300'},
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className={`group rounded-2xl p-4 text-center border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.12] hover:ring-2 ${item.ring}`}
                  style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
                >
                  <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon size={17} strokeWidth={2.4} />
                  </div>
                  <p className="text-lg font-extrabold text-white tabular-nums leading-none">
                    <AnimatedCounter target={item.value} suffix={item.suffix} />
                  </p>
                  <p className="text-[11px] font-semibold text-white/85 mt-1">{item.label}</p>
                  <p className="text-[10px] text-white/45 mt-0.5">{item.sub}</p>
                </div>
              )
            })}
          </div>

          {/* Feature badges con micro hover */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-6 anim-fade-up" style={{ animationDelay: '0.7s' }}>
            {[
              { label: 'Facturación DIAN', icon: Receipt },
              { label: 'Multi-cajero',     icon: Users },
              { label: 'RBAC',             icon: Shield },
              { label: 'Audit log',        icon: BarChart3 },
              { label: 'Caja inteligente', icon: Wallet },
            ].map((f) => {
              const Icon = f.icon
              return (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/10 text-white/75 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all cursor-default"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <Icon size={10} strokeWidth={2.4} />
                  {f.label}
                </span>
              )
            })}
          </div>

          {/* Social proof footer */}
          <div className="flex items-center justify-center gap-2 text-white/40 anim-fade-up" style={{ animationDelay: '0.8s' }}>
            <Sparkles size={11} />
            <span className="text-[11px]">
              Hecho con <span className="text-red-400">♥</span> en Colombia 🇨🇴
            </span>
          </div>
        </div>

        {/* Gradient bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)' }} />
      </div>

      {/* ── Formulario derecho ── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ background: 'var(--t-primary-xlight)' }}
      >
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={IconChart} alt="SimplifyPOS" className="h-20 w-auto max-w-[6rem] object-contain" />
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
