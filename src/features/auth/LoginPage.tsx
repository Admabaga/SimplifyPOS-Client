import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, LogIn, Eye, EyeOff,
  Package, Zap, BarChart3, Shield, Receipt, Users, Wallet,
  TrendingUp, Sparkles, ShieldCheck, ArrowLeft, KeyRound, Fingerprint,
} from 'lucide-react'
import {
  startAuthentication,
  startRegistration,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser'
import { authApi } from './api'
import { useAuthStore } from '@/stores/auth'
import { apiError } from '@/shared/lib/apiError'
import Logo from '@/assets/logo-mark.svg'

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
  // 2FA: el backend responde 428 → mostramos pantalla dedicada
  const [totpRequired, setTotpRequired] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [enrollPrompt, setEnrollPrompt] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollNombre, setEnrollNombre] = useState('')
  const totpRef = useRef<HTMLInputElement>(null)

  const aplicarSesion = (result: import('@/shared/types').TokenResponse) => {
    setUser(
      {
        id: result.user_id,
        email: result.email,
        nombre: result.nombre,
        role: result.role.toLowerCase(),
        permissions: result.permissions,
        must_change_password: result.must_change_password,
      },
      result.access_token,
      rememberMe
    )
  }

  const irAlDashboard = (nombre: string) => {
    toast.success(`¡Bienvenido, ${nombre}!`)
    navigate('/dashboard', { replace: true })
  }

  // Login con passkey: el usuario ya tiene una → entra directo
  const finalizarSesion = (result: import('@/shared/types').TokenResponse) => {
    aplicarSesion(result)
    irAlDashboard(result.nombre)
  }

  // Login con contraseña: si no hay passkey y el equipo soporta Touch ID/Face ID,
  // ofrecemos crearla en el momento (como Google/GitHub). Si no, al dashboard.
  const finalizarLoginPassword = async (result: import('@/shared/types').TokenResponse) => {
    aplicarSesion(result)
    try {
      const [lista, soporta] = await Promise.all([
        authApi.passkeyList().catch(() => []),
        platformAuthenticatorIsAvailable().catch(() => false),
      ])
      if (lista.length === 0 && soporta) {
        setEnrollNombre(result.nombre)
        setEnrollPrompt(true)
        return
      }
    } catch {
      /* si la verificación falla, no bloqueamos el login */
    }
    irAlDashboard(result.nombre)
  }

  const onEnroll = async () => {
    setEnrolling(true)
    try {
      const { options, ticket } = await authApi.passkeyRegisterBegin()
      const credential = await startRegistration({ optionsJSON: options })
      await authApi.passkeyRegisterFinish({ ticket, nombre: 'Mi dispositivo', credential })
      toast.success('¡Passkey creada! La próxima vez entra con tu huella o Face ID.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'AbortError') {
        // canceló el diálogo: lo dejamos entrar igual
        irAlDashboard(enrollNombre)
        return
      }
      toast.error(apiError(err, 'No se pudo crear la passkey'))
    } finally {
      setEnrolling(false)
    }
  }

  const omitirEnroll = () => {
    setEnrollPrompt(false)
    irAlDashboard(enrollNombre)
  }

  const onPasskeyLogin = async () => {
    setPasskeyLoading(true)
    try {
      const emailVal = (document.querySelector<HTMLInputElement>('input[type=email]')?.value || '').trim()
      const { options, ticket } = await authApi.passkeyLoginBegin(emailVal || undefined)
      const credential = await startAuthentication({ optionsJSON: options })
      const result = await authApi.passkeyLoginFinish({ ticket, credential })
      finalizarSesion(result)
    } catch (err) {
      const name = (err as { name?: string })?.name
      if (name === 'NotAllowedError' || name === 'AbortError') {
        // Canceló el diálogo, o no hay ninguna passkey en este equipo.
        // Lo guiamos: la passkey se crea entrando con contraseña.
        toast(
          'Aún no tienes una passkey aquí. Inicia sesión con tu contraseña y créala en un toque.',
          { icon: '🔑', duration: 5000 }
        )
        return
      }
      toast.error(apiError(err, 'No se pudo iniciar con passkey. Usa tu contraseña.'))
    } finally {
      setPasskeyLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    try {
      const result = await authApi.login(data)
      await finalizarLoginPassword(result)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 428) {
        setCredentials(data)
        setTotpRequired(true)
        setTimeout(() => totpRef.current?.focus(), 100)
      } else {
        toast.error(apiError(err, 'Credenciales incorrectas'))
      }
    } finally {
      setLoading(false)
    }
  }

  const onSubmitTotp = async () => {
    if (!credentials || totpCode.trim().length < 6) return
    setLoading(true)
    try {
      const result = await authApi.login({ ...credentials, totp_code: totpCode.trim() })
      await finalizarLoginPassword(result)
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast.error('Código inválido. Verifica tu app o usa un código de recuperación.')
        setTotpCode('')
        setTimeout(() => totpRef.current?.focus(), 50)
      } else {
        toast.error(apiError(err, 'Error al verificar. Intenta de nuevo.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const scrollToLogin = () => {
    const el = document.getElementById('login-form')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ── Banner: hero editorial + dashboard mock flotante (mobile + desktop) ── */}
      <div
        className="w-full lg:w-1/2 flex flex-col justify-between relative overflow-hidden px-5 sm:px-8 xl:px-10 py-6 xl:py-8 min-h-[520px] lg:h-screen lg:sticky lg:top-0"
        style={{ background: 'var(--t-sidebar-bg)' }}
      >
        {/* Keyframes */}
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(0.5deg); }
          }
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.45; transform: scale(1); }
            50% { opacity: 0.85; transform: scale(1.06); }
          }
          @keyframes aurora-1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(40px, -30px) scale(1.1); }
            66% { transform: translate(-30px, 40px) scale(0.95); }
          }
          @keyframes aurora-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-50px, -40px) scale(1.15); }
          }
          @keyframes aurora-3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            40% { transform: translate(30px, 50px) scale(1.05); }
            80% { transform: translate(-40px, -20px) scale(0.9); }
          }
          @keyframes fade-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes bar-grow {
            0% { transform: scaleY(0.3); }
            100% { transform: scaleY(1); }
          }
          @keyframes slide-in {
            0% { opacity: 0; transform: translateX(-12px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          @keyframes tilt-3d {
            0%, 100% { transform: perspective(1400px) rotateY(-8deg) rotateX(4deg) translateY(0); }
            50%      { transform: perspective(1400px) rotateY(-8deg) rotateX(4deg) translateY(-8px); }
          }
          .anim-float    { animation: float-slow 7s ease-in-out infinite; }
          .anim-glow     { animation: pulse-glow 3.5s ease-in-out infinite; }
          .anim-aurora-1 { animation: aurora-1 22s ease-in-out infinite; }
          .anim-aurora-2 { animation: aurora-2 26s ease-in-out infinite; }
          .anim-aurora-3 { animation: aurora-3 28s ease-in-out infinite; }
          .anim-fade-up  { animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
          @media (min-width: 1024px) {
            .anim-tilt-3d  { animation: tilt-3d 6s ease-in-out infinite; transform-style: preserve-3d; }
          }
          .text-shimmer {
            background: linear-gradient(110deg, #ffffff 0%, #ffffff 35%, var(--t-accent) 50%, #ffffff 65%, #ffffff 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 4.5s linear infinite;
          }
          .mock-bar { transform-origin: bottom; animation: bar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
          .mock-row { animation: slide-in 0.5s ease-out both; }

          /* ── Lenguaje "tiquete" ───────────────────────────────────────────
             El alma de un POS es el recibo impreso. En vez del degradado y las
             tarjetas de vidrio que usa cualquier SaaS, el pie del hero toma
             prestada la gramática del tiquete: línea perforada, guía de puntos
             y cifras tabulares. Es el objeto que el tendero ya conoce. */
          .perf-rule {
            height: 1px;
            background-image: radial-gradient(circle, rgba(255,255,255,0.34) 1px, transparent 1px);
            background-size: 7px 1px;
            background-repeat: repeat-x;
          }
          .perf-rule::before, .perf-rule::after {
            content: '';
            position: absolute;
            width: 10px; height: 10px;
            border-radius: 50%;
            background: var(--t-sidebar-bg);
            top: -5px;
          }
          .perf-rule::before { left: -13px; }
          .perf-rule::after  { right: -13px; }

          /* Guía de puntos entre etiqueta y valor, como en una factura */
          .leader {
            flex: 1;
            margin: 0 8px;
            border-bottom: 1px dotted rgba(255,255,255,0.22);
            transform: translateY(-3px);
          }
        `}</style>

        {/* Aurora mesh background */}
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl anim-aurora-1 pointer-events-none"
             style={{ background: 'radial-gradient(circle, var(--t-accent) 0%, transparent 65%)', opacity: 0.22 }} />
        <div className="absolute -bottom-40 -right-32 w-[460px] h-[460px] rounded-full blur-3xl anim-aurora-2 pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, transparent 70%)', opacity: 0.25 }} />
        <div className="absolute top-1/3 -right-20 w-[380px] h-[380px] rounded-full blur-3xl anim-aurora-3 pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)', opacity: 0.15 }} />

        {/* Grid pattern radial mask */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 80%)',
          }}
        />

        {/* Noise overlay para textura */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27200%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence baseFrequency=%270.9%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")' }} />

        {/* ─── Top: brand mark ─── */}
        <div className="relative z-10 anim-fade-up shrink-0" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-xl scale-150 anim-glow"
                   style={{ background: 'var(--t-accent)' }} />
              <img src={Logo} alt="" className="relative h-9 w-9 drop-shadow-xl" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-none tracking-tight">SimplifyPOS</p>
              <p className="text-[10px] mt-1 font-semibold leading-none" style={{ color: 'var(--t-accent)' }}>
                Point of Sale · Colombia
              </p>
            </div>
          </div>
        </div>

        {/* ─── Centro: hero claim + dashboard mock ─── */}
        <div className="relative z-10 flex w-full max-w-2xl flex-1 flex-col items-start justify-start py-4 lg:py-6">
          {/* Hero claim grande */}
          <h1 className="font-display text-[34px] sm:text-[44px] xl:text-[52px] font-bold leading-[0.98] text-white mb-3 anim-fade-up"
              style={{ animationDelay: '0.15s' }}>
            Tu negocio,<br />
            <span className="text-shimmer">siempre al día.</span>
          </h1>

          <p className="text-sm xl:text-base text-white/65 mb-6 max-w-sm leading-relaxed anim-fade-up"
             style={{ animationDelay: '0.25s' }}>
            El POS diseñado para comerciantes colombianos. Inventario, ventas, caja y DIAN en una sola app.
          </p>

          {/* Propuestas de valor. Con iconos de la librería y no emojis: los
              emojis cambian de forma según el sistema operativo y restan
              seriedad a una pantalla que es la primera impresión del producto. */}
          <div
            className="mb-6 grid w-full max-w-sm gap-2.5 anim-fade-up sm:max-w-xl sm:grid-cols-3 xl:hidden"
            style={{ animationDelay: '0.32s' }}
          >
            {[
              { Icon: Zap,      title: 'Venta en segundos',  desc: 'Busca, agrega y cobra sin fricciones' },
              { Icon: BarChart3, title: 'Reportes en vivo',   desc: 'Caja, stock y ganancia al día' },
              { Icon: Receipt,  title: 'Facturación DIAN',   desc: 'Factura electrónica con un clic' },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl border border-white/10 px-3.5 py-3 sm:flex-col sm:gap-2"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <Icon size={15} style={{ color: 'var(--t-accent)' }} strokeWidth={2.3} />
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight text-white">{title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/55">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA mobile — scroll al login (oculto en desktop) */}
          <button
            type="button"
            onClick={scrollToLogin}
            className="lg:hidden anim-fade-up w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-sm px-6 py-3.5 rounded-xl mb-6 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, var(--t-accent), var(--t-primary))',
              color: 'var(--t-sidebar-bg)',
              animationDelay: '0.4s',
            }}
          >
            <LogIn size={16} />
            Iniciar sesión
            <span className="ml-1 opacity-70">↓</span>
          </button>

          {/* Dashboard mock flotante 3D — solo xl+ para no saturar */}
          {/* El mockup es más alto que el espacio libre del panel, así que se
              reduce en bloque en vez de recortarlo: así entran completos tanto
              la tarjeta superior como la inferior. El origen arriba-izquierda
              evita que quede flotando centrado al escalar. */}
          <div
            className="relative mt-3 w-full origin-top-left anim-fade-up hidden xl:block xl:scale-[0.86]"
            style={{ animationDelay: '0.45s' }}
          >
            {/* Glow detrás del mock */}
            <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-50"
                 style={{ background: 'radial-gradient(circle at 50% 0%, var(--t-accent) 0%, transparent 60%)' }} />

            <div className="relative anim-tilt-3d">
              <div
                className="rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/10"
                     style={{ background: 'rgba(0,0,0,0.25)' }}>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <p className="text-[10px] text-white/40 ml-2 font-mono">simplifypos.app/dashboard</p>
                </div>

                {/* Mock body */}
                <div className="p-3 space-y-2.5">
                  {/* Greeting row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/40 leading-none">Hola,</p>
                      <p className="text-sm font-bold text-white mt-1 leading-none">Galaxy Bar 👋</p>
                    </div>
                    <span className="text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(110,231,183,0.15)', color: 'rgb(110,231,183)' }}>
                      Caja abierta
                    </span>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Ventas hoy',  value: '$1.4M',  delta: '+18%', positive: true,  color: 'rgb(110,231,183)' },
                      { label: 'Ticket prom.', value: '$48k', delta: '+4%',  positive: true,  color: 'rgb(147,197,253)' },
                      { label: 'Stock bajo',   value: '3',    delta: 'alerta', positive: false, color: 'rgb(252,165,165)' },
                    ].map((k, i) => (
                      <div key={i} className="rounded-lg p-2.5 border border-white/10"
                           style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-[9px] text-white/45 leading-none">{k.label}</p>
                        <p className="text-base font-extrabold text-white mt-1.5 tabular-nums leading-none">{k.value}</p>
                        <p className="text-[9px] font-bold mt-1.5 leading-none" style={{ color: k.color }}>
                          {k.positive ? '↑' : '⚠'} {k.delta}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Mini bar chart */}
                  <div className="rounded-lg p-2.5 border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-white/55 font-semibold">Ventas por día — esta semana</p>
                      <p className="text-[9px] text-white/30 font-mono">7d</p>
                    </div>
                    <div className="flex items-end gap-1 h-10">
                      {[0.5, 0.7, 0.45, 0.85, 0.6, 0.95, 0.75].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm mock-bar"
                          style={{
                            height: `${h * 100}%`,
                            background: i === 5
                              ? 'linear-gradient(180deg, var(--t-accent), rgba(16,185,129,0.4))'
                              : 'linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.15))',
                            animationDelay: `${0.5 + i * 0.06}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                        <span key={i} className={`text-[9px] ${i === 5 ? 'font-bold' : ''} text-white/40`}>{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* Activity rows — solo 2 para mantener compacto */}
                  <div className="space-y-1.5">
                    {[
                      { icon: '🍺', text: 'Cerveza Águila × 6', time: 'hace 2m', amount: '$18.000', color: 'rgb(110,231,183)' },
                      { icon: '🥤', text: 'Coca-Cola 1.5L',     time: 'hace 5m', amount: '$8.500',  color: 'rgb(147,197,253)' },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="mock-row flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-white/5"
                        style={{ background: 'rgba(255,255,255,0.03)', animationDelay: `${0.9 + i * 0.12}s` }}
                      >
                        <span className="text-sm leading-none">{row.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/85 font-semibold truncate leading-tight">{row.text}</p>
                          <p className="text-[9px] text-white/35 leading-tight">{row.time}</p>
                        </div>
                        <p className="text-[11px] font-bold tabular-nums" style={{ color: row.color }}>{row.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating accent card top-right */}
              <div
                className="hidden xl:flex absolute -top-5 right-1 anim-float items-center gap-2 px-3 py-2 rounded-xl border border-white/15 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.92))',
                  backdropFilter: 'blur(8px)',
                  animationDelay: '0.6s',
                }}
              >
                <TrendingUp size={14} className="text-white" />
                <div className="leading-tight">
                  <p className="text-[9px] text-white/85 font-semibold">Meta del día</p>
                  <p className="text-xs font-extrabold text-white tabular-nums">87% alcanzada</p>
                </div>
              </div>

              {/* Floating accent card bottom-left */}
              <div
                className="hidden xl:flex absolute -bottom-4 left-1 anim-float items-center gap-2 px-3 py-2 rounded-xl border border-white/15 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(241,245,249,0.95))',
                  animationDelay: '1.2s',
                }}
              >
                <Sparkles size={14} className="text-amber-500" />
                <p className="text-xs font-bold text-slate-800">+12 nuevas ventas</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom: stats + colombian pride ─── */}
        <div className="relative z-10 anim-fade-up shrink-0" style={{ animationDelay: '0.7s' }}>
          {/* Encabezado del tiquete */}
          <div className="mb-2.5 flex items-center gap-2.5">
            <Receipt size={12} style={{ color: 'var(--t-accent)' }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">
              SimplifyPOS · Colombia
            </span>
          </div>

          <div className="relative perf-rule" />

          {/* Renglones: etiqueta — guía de puntos — valor, como en una factura */}
          <div className="space-y-1.5 py-3">
            {[
              { l: 'Una venta toma',      v: <AnimatedCounter target={8} suffix=" s" /> },
              { l: 'Factura electrónica', v: 'DIAN' },
              { l: 'Disponible',          v: <AnimatedCounter target={24} suffix="/7" /> },
            ].map((r) => (
              <div key={r.l} className="flex items-baseline">
                <span className="shrink-0 text-[11px] text-white/55">{r.l}</span>
                <span className="leader" />
                <span className="num shrink-0 text-sm font-bold text-white">{r.v}</span>
              </div>
            ))}
          </div>

          <div className="relative perf-rule" />

          {/* Pie del tiquete */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/50">
              <Sparkles size={11} style={{ color: 'var(--t-accent)' }} />
              <span className="text-[10px] font-medium">
                Hecho con <span className="text-red-400">♥</span> en Colombia 🇨🇴
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Servicio activo
            </span>
          </div>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div
        id="login-form"
        className="flex-1 flex items-center justify-center px-5 sm:px-6 py-10 sm:py-12 lg:min-h-screen scroll-mt-4"
        style={{ background: 'var(--t-primary-xlight)' }}
      >
        <div className="w-full max-w-md">

          {/* ── Pantalla: ofrecer crear passkey tras login con contraseña ── */}
          {enrollPrompt ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner"
                  style={{ background: 'var(--t-primary-xlight)' }}
                >
                  <Fingerprint size={32} style={{ color: 'var(--t-primary)' }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Entra más rápido la próxima vez</h2>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs leading-relaxed">
                  Crea una passkey en este dispositivo y entra con tu huella o Face ID,
                  sin escribir contraseña.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 mb-5 space-y-2">
                {[
                  'Más seguro que una contraseña',
                  'No hay nada que recordar',
                  'Se queda solo en este equipo',
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-gray-600">
                    <ShieldCheck size={15} style={{ color: 'var(--t-primary)' }} />
                    {t}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onEnroll}
                disabled={enrolling}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl transition-all mb-3"
                style={{
                  background: enrolling ? 'var(--t-primary-dark)' : 'var(--t-primary)',
                  opacity: enrolling ? 0.7 : 1,
                }}
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint size={16} />}
                {enrolling ? 'Creando…' : 'Crear passkey'}
              </button>
              <button
                type="button"
                onClick={omitirEnroll}
                disabled={enrolling}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
              >
                Ahora no, gracias
              </button>
            </div>
          ) : /* ── Pantalla 2FA dedicada ── */
          totpRequired ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              {/* Icono + encabezado */}
              <div className="flex flex-col items-center text-center mb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner"
                  style={{ background: 'var(--t-primary-xlight)' }}
                >
                  <ShieldCheck size={32} style={{ color: 'var(--t-primary)' }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Verificación en dos pasos</h2>
                <p className="text-sm text-gray-500 mt-1.5 max-w-xs leading-relaxed">
                  Ingresa el código de 6 dígitos de tu app de autenticación
                  <br />(Google Authenticator, Authy, 1Password…)
                </p>
              </div>

              {/* Input grande OTP */}
              <div className="mb-4">
                <input
                  ref={totpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={totpCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\s/g, '')
                    setTotpCode(v)
                    if (v.length === 6 && /^\d{6}$/.test(v)) setTimeout(() => onSubmitTotp(), 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onSubmitTotp()
                    }
                  }}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-bold tracking-[0.4em] px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[var(--t-primary)] focus:outline-none transition"
                />
                <p className="mt-2 text-xs text-gray-400 text-center">
                  El código cambia cada 30 segundos
                </p>
              </div>

              {/* Botón verificar */}
              <button
                type="button"
                onClick={onSubmitTotp}
                disabled={loading || totpCode.trim().length < 6}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl transition-all mb-3"
                style={{
                  background: (loading || totpCode.trim().length < 6) ? 'var(--t-primary-dark)' : 'var(--t-primary)',
                  opacity: (loading || totpCode.trim().length < 6) ? 0.6 : 1,
                }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck size={16} />}
                {loading ? 'Verificando...' : 'Verificar'}
              </button>

              {/* Código de recuperación */}
              <details className="mb-4 group">
                <summary className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none list-none justify-center hover:text-gray-700">
                  <KeyRound size={13} />
                  ¿No tienes acceso a tu app? Usa un código de recuperación
                </summary>
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
                  Ingresa uno de los <strong>códigos de recuperación</strong> que recibiste al activar 2FA.
                  Cada código es de un solo uso. Si los perdiste, contacta al administrador.
                </div>
              </details>

              {/* Volver */}
              <button
                type="button"
                onClick={() => { setTotpRequired(false); setTotpCode(''); setCredentials(null) }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
              >
                <ArrowLeft size={14} />
                Volver al inicio de sesión
              </button>
            </div>
          ) : (

          /* ── Formulario de login normal ── */
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_20px_40px_-16px_rgba(15,23,42,0.18)] sm:p-8">
            {/* Filete del tema: ancla la tarjeta a la marca sin recargarla */}
            <span aria-hidden="true" className="mb-6 block h-1 w-10 rounded-full t-gradient" />

            <h2 className="font-display text-[30px] font-bold leading-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="mt-1 mb-6 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  aria-invalid={!!errors.email}
                  {...register('email')}
                  placeholder="usuario@empresa.com"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)] ${
                    errors.email
                      ? 'border-red-400 bg-red-50/60 text-red-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                {errors.email && (
                  <p role="alert" className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)] ${
                      errors.password
                        ? 'border-red-400 bg-red-50/60 text-red-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p role="alert" className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Recordarme */}
              <label className="flex w-fit cursor-pointer select-none items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm text-slate-600">Recordarme en este dispositivo</span>
              </label>

              {/* Acción principal: la única con peso completo */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--t-primary)]"
                style={{ background: 'var(--t-primary)' }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            {/* Divisor + login con passkey (alternativa, no competidora) */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium text-slate-400">o</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={onPasskeyLogin}
              disabled={passkeyLoading}
              aria-busy={passkeyLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {passkeyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Fingerprint className="h-4 w-4 t-text" />
              )}
              {passkeyLoading ? 'Verificando…' : 'Entrar con passkey'}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Usa tu huella, Face ID o llave de seguridad
            </p>

            {/* Registro: tercer nivel de jerarquía — es para quien AÚN no es
                cliente, así que no debe competir con el botón de entrar. */}
            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-500">
                ¿No tienes cuenta?{' '}
                <Link
                  to="/planes"
                  className="font-semibold t-text-dk underline decoration-2 underline-offset-2 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-primary)] rounded"
                >
                  Mira nuestros planes
                </Link>
              </p>
              <p className="mt-1.5 text-xs text-slate-400">1 mes gratis · sin permanencia</p>
            </div>
          </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            SimplifyPOS v1.0 · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
