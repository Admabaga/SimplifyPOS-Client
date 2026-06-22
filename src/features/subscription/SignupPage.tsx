import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2, Eye, EyeOff, ArrowLeft, Check, CreditCard } from 'lucide-react'
import { subscriptionApi } from './api'
import { formatCOP } from './types'
import { CardFields, cardLista } from './CardFields'
import { tokenizeCard, cardMeta, type CardInput } from './tokenize'
import { useAuthStore } from '@/stores/auth'
import { apiError } from '@/shared/lib/apiError'
import IconChart from '@/assets/IconChart.png'

const schema = z.object({
  empresa_nombre: z.string().min(2, 'Nombre de la empresa requerido'),
  nit: z.string().min(3, 'NIT requerido'),
  nombre: z.string().min(2, 'Tu nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(12, 'Mínimo 12 caracteres'),
})

type FormValues = z.infer<typeof schema>

export default function SignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [card, setCard] = useState<CardInput>({ number: '', holder: '', exp: '', cvc: '' })

  const planCodigo = (params.get('plan') ?? 'PRO').toUpperCase()
  const ciclo = (params.get('ciclo') ?? 'MENSUAL').toUpperCase() === 'ANUAL' ? 'ANUAL' : 'MENSUAL'

  const { data: planes } = useQuery({ queryKey: ['plans'], queryFn: subscriptionApi.getPlans })
  const { data: config } = useQuery({ queryKey: ['sub-config'], queryFn: subscriptionApi.getConfig })
  const plan = planes?.find((p) => p.codigo === planCodigo)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    if (!cardLista(card, config?.provider === 'wompi')) {
      toast.error('Completa los datos de tu tarjeta para crear la cuenta')
      return
    }
    setLoading(true)
    try {
      const card_token = config ? await tokenizeCard(config, card) : undefined
      const meta = cardMeta(card)
      const result = await subscriptionApi.signup({
        ...data,
        plan_codigo: planCodigo,
        ciclo,
        card_token,
        card_brand: meta.brand,
        card_last4: meta.last4,
        card_holder: meta.holder,
        card_exp: meta.exp,
      })
      setUser(
        {
          id: result.user_id,
          email: result.email,
          nombre: result.nombre,
          role: result.role.toLowerCase(),
          permissions: result.permissions,
          must_change_password: false,
        },
        result.access_token,
        true
      )
      toast.success(`¡Bienvenido, ${result.nombre}! Tu mes de prueba ya comenzó.`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(apiError(err, 'No se pudo crear la cuenta'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--color-bg, #f8fafc)' }}>
      <div className="w-full max-w-md">
        <Link to="/planes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={15} /> Ver planes
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-5">
            <img src={IconChart} alt="" className="h-8 w-auto max-w-[2.5rem] object-contain" />
            <div className="leading-none">
              <p className="font-extrabold text-gray-900">Crea tu cuenta</p>
              <p className="text-[11px] text-gray-400 mt-1">Empieza tu mes gratis</p>
            </div>
          </div>

          {plan && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-800">Plan {plan.nombre}</span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatCOP(ciclo === 'ANUAL' ? plan.precio_anual : plan.precio_mensual)}
                  <span className="text-xs font-normal">/{ciclo === 'ANUAL' ? 'año' : 'mes'}</span>
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 mt-1">
                <Check size={13} /> Primer mes gratis · luego se cobra automáticamente
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Nombre de tu negocio" error={errors.empresa_nombre?.message}>
              <input {...register('empresa_nombre')} placeholder="Mi Tienda SAS" className={inputCls} />
            </Field>
            <Field label="NIT" error={errors.nit?.message}>
              <input {...register('nit')} placeholder="900123456" className={inputCls} />
            </Field>
            <Field label="Tu nombre" error={errors.nombre?.message}>
              <input {...register('nombre')} placeholder="Nombre y apellido" className={inputCls} />
            </Field>
            <Field label="Correo electrónico" error={errors.email?.message}>
              <input type="email" autoComplete="email" {...register('email')} placeholder="tu@negocio.com" className={inputCls} />
            </Field>
            <Field label="Contraseña" error={errors.password?.message}>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('password')}
                  placeholder="Mínimo 12 caracteres"
                  className={`${inputCls} pr-11`}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {/* Tarjeta para la suscripción — se guarda para no re-ingresarla luego */}
            <div className="pt-2 border-t border-gray-100">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1">
                <CreditCard size={15} /> Método de pago
              </p>
              <p className="text-xs text-gray-400 mb-3">
                No se te cobra durante el mes gratis. Guardamos tu tarjeta para la renovación
                automática; puedes cancelar cuando quieras.
              </p>
              <CardFields card={card} setCard={setCard} showTestHint={config?.provider === 'mock'} requireLuhn={config?.provider === 'wompi'} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-70"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creando cuenta…' : 'Crear cuenta y empezar gratis'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm transition'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
