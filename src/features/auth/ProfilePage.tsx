import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
  User, Lock, Shield, CheckCircle2, Eye, EyeOff, IdCard, Mail,
  Fingerprint, KeyRound, Check, Minus, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth'
import { authApi } from './api'
import { apiError } from '@/shared/lib/apiError'
import { PageHeader, Card, Button, Badge } from '@/shared/components/ui'
import TwoFactorCard from './TwoFactorCard'
import PasskeysCard from './PasskeysCard'
import SessionPolicyCard from '@/features/security/SessionPolicyCard'

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Requerida'),
  new_password:     z.string().min(12, 'Mínimo 12 caracteres'),
  confirm:          z.string(),
}).refine((d) => d.new_password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})
type PasswordForm = z.infer<typeof passwordSchema>

const ROLE_CONFIG: Record<string, { label: string; variant: 'green' | 'blue' | 'purple' | 'yellow' }> = {
  master:     { label: 'Master',     variant: 'purple' },
  admin:      { label: 'Admin',      variant: 'blue'   },
  supervisor: { label: 'Supervisor', variant: 'green'  },
}

// ── Fuerza de contraseña ──────────────────────────────────────────────────────
// Una barra de exigencia mínima (largo + variedad). No pretende medir entropía
// real: sirve para que el usuario vea que "12 caracteres" no es lo mismo que
// "12 caracteres con números y símbolos" mientras escribe.

function fuerzaPassword(pwd: string) {
  if (!pwd) return { pct: 0, label: '', bar: 'bg-slate-200', text: 'text-slate-400' }
  let score = 0
  if (pwd.length >= 12) score++
  if (pwd.length >= 16) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 2) return { pct: 33,  label: 'Débil',    bar: 'bg-red-500',   text: 'text-red-600' }
  if (score <= 3) return { pct: 66,  label: 'Aceptable', bar: 'bg-amber-500', text: 'text-amber-700' }
  return              { pct: 100, label: 'Fuerte',    bar: 't-bg',         text: 't-text-dk' }
}

// ── Password input ────────────────────────────────────────────────────────────

function PasswordInput({
  label, error, hint, ...props
}: { label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)] ${
            error ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

// ── Encabezado de sección ─────────────────────────────────────────────────────
// Micro-mayúsculas + hairline: mismo lenguaje que el resto de la app, así las
// secciones se distinguen sin recargar la pantalla de iconos y colores.

function SectionHead({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="mb-4 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg t-bg-xlt t-text-dk ring-1 ring-[var(--t-primary-light)]">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-tight tracking-[-0.01em] text-slate-900">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
      </div>
    </div>
  )
}

// ── Medidor de seguridad ──────────────────────────────────────────────────────
// Convierte tres ajustes dispersos (contraseña, 2FA, passkey) en una sola
// lectura. Antes el usuario no tenía forma de saber si su cuenta estaba bien
// protegida: tenía que ir tarjeta por tarjeta.

function SecurityMeter({ dosFactores, passkeys }: { dosFactores: boolean; passkeys: number }) {
  const checks = [
    { ok: true,             label: 'Contraseña',              icon: <Lock size={13} /> },
    { ok: dosFactores,      label: 'Verificación en 2 pasos', icon: <Shield size={13} /> },
    { ok: passkeys > 0,     label: 'Passkey registrada',      icon: <Fingerprint size={13} /> },
  ]
  const puntos = checks.filter((c) => c.ok).length
  const nivel =
    puntos >= 3 ? { label: 'Excelente', bar: 't-bg',        text: 't-text-dk',      dot: 't-bg' }
    : puntos === 2 ? { label: 'Buena',   bar: 'bg-amber-500', text: 'text-amber-700', dot: 'bg-amber-500' }
    : { label: 'Básica', bar: 'bg-red-500', text: 'text-red-600', dot: 'bg-red-500' }

  return (
    <Card>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${nivel.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Seguridad de la cuenta
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-[22px] font-bold leading-none tracking-[-0.01em] ${nivel.text}`}>
          {nivel.label}
        </span>
        <span className="num text-xs text-slate-400">{puntos} de 3</span>
      </div>

      <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${nivel.bar} transition-[width] duration-500 ease-out`}
          style={{ width: `${(puntos / 3) * 100}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-xs">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                c.ok ? 't-bg text-white' : 'bg-slate-200 text-slate-400'
              }`}
            >
              {c.ok ? <Check size={10} strokeWidth={3} /> : <Minus size={10} strokeWidth={3} />}
            </span>
            <span className={c.ok ? 'text-slate-700' : 'text-slate-400'}>{c.label}</span>
          </li>
        ))}
      </ul>

      {puntos < 3 && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
          {!dosFactores
            ? 'Activa la verificación en dos pasos para proteger tu cuenta aunque alguien conozca tu contraseña.'
            : 'Registra una passkey para entrar con huella o Face ID, sin escribir contraseña.'}
        </p>
      )}
    </Card>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [pwdOk, setPwdOk] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  // Comparte caché con TwoFactorCard: al activar/desactivar 2FA allí, el
  // medidor de seguridad se actualiza solo.
  const { data: me } = useQuery({ queryKey: ['auth', 'me'], queryFn: authApi.me })
  const { data: passkeys = [] } = useQuery({
    queryKey: ['auth', 'passkeys'],
    queryFn: authApi.passkeyList,
  })

  const {
    register: regP,
    handleSubmit: hsP,
    formState: { errors: eP, isDirty: pDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nombre: user?.nombre ?? '', nit: user?.nit ?? '' },
  })

  const {
    register: regPw,
    handleSubmit: hsPw,
    reset: resetPw,
    watch: watchPw,
    formState: { errors: ePw, isSubmitting: isPwSub },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const nuevaPwd = watchPw('new_password') ?? ''
  const fuerza = useMemo(() => fuerzaPassword(nuevaPwd), [nuevaPwd])

  const onSaveProfile = async (data: ProfileForm) => {
    setProfileLoading(true)
    try {
      const updated = await authApi.updateProfile(data)
      updateUser({ nombre: updated.nombre, nit: updated.nit ?? undefined })
      toast.success('Perfil actualizado')
    } catch (err) {
      toast.error(apiError(err, 'Error al actualizar perfil'))
    } finally {
      setProfileLoading(false)
    }
  }

  const onChangePassword = async (data: PasswordForm) => {
    try {
      await authApi.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      resetPw()
      setPwdOk(true)
      toast.success('Contraseña actualizada')
      setTimeout(() => setPwdOk(false), 4000)
    } catch (err) {
      toast.error(apiError(err, 'Contraseña actual incorrecta'))
    }
  }

  if (!user) return null

  const roleConf = ROLE_CONFIG[user.role] ?? { label: user.role, variant: 'green' as const }
  const initials = user.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const ultimoAcceso = me?.last_login
    ? new Date(me.last_login).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div>
      <PageHeader subtitle="Información personal y configuración de acceso" />

      {/* Dos columnas en escritorio: a la izquierda quién eres y qué tan
          protegida está la cuenta (referencia fija); a la derecha lo que se
          edita. Antes todo era una sola columna angosta y había que bajar
          hasta el final para saber si el 2FA estaba activo. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-start">

        {/* ── Rail: identidad + seguridad ──────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl t-gradient text-xl font-bold text-white shadow-lg">
                {initials}
              </div>
              <h2 className="mt-3 w-full truncate text-[17px] font-bold leading-tight tracking-[-0.01em] text-slate-900">
                {user.nombre}
              </h2>
              <p className="mt-0.5 flex w-full items-center justify-center gap-1.5 text-xs text-slate-500">
                <Mail size={11} className="shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                <Badge variant={roleConf.variant}>
                  <Shield size={10} className="mr-1" />
                  {roleConf.label}
                </Badge>
                {user.must_change_password && (
                  <Badge variant="yellow">Debe cambiar contraseña</Badge>
                )}
              </div>
            </div>

            {ultimoAcceso && (
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <Clock size={11} className="shrink-0" />
                <span>Último acceso: {ultimoAcceso}</span>
              </div>
            )}
          </Card>

          <SecurityMeter dosFactores={me?.totp_enabled ?? false} passkeys={passkeys.length} />
        </div>

        {/* ── Columna principal ────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Datos personales */}
          <Card>
            <SectionHead
              icon={<User size={15} />}
              title="Datos personales"
              desc="Cómo apareces en el sistema y en tus documentos."
            />

            <form onSubmit={hsP(onSaveProfile)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Nombre completo</label>
                  <input
                    {...regP('nombre')}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)] ${
                      eP.nombre ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                  {eP.nombre && <p className="text-xs text-red-600">{eP.nombre.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <IdCard size={13} className="text-slate-400" />
                    NIT / Identificación
                  </label>
                  <input
                    {...regP('nit')}
                    placeholder="Ej: 900.123.456-7"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)]"
                  />
                  <p className="text-[11px] text-slate-400">Cédula, NIT o identificación personal.</p>
                </div>
              </div>

              {/* Correo: se muestra como dato, no como campo — no es editable */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Correo electrónico</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                  <Mail size={13} className="shrink-0 text-slate-400" />
                  <span className="select-all truncate">{user.email}</span>
                  <span className="ml-auto shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200">
                    No editable
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Por seguridad, el correo solo lo puede cambiar un administrador.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] text-slate-400">
                  {pDirty ? 'Tienes cambios sin guardar.' : 'Todo está guardado.'}
                </p>
                <Button type="submit" loading={profileLoading} disabled={!pDirty}>
                  Guardar cambios
                </Button>
              </div>
            </form>
          </Card>

          {/* Cambiar contraseña */}
          <Card>
            <SectionHead
              icon={<Lock size={15} />}
              title="Cambiar contraseña"
              desc="Usa al menos 12 caracteres, con números y símbolos."
            />

            {pwdOk ? (
              <div className="flex items-center gap-3 rounded-xl border t-border-lt t-bg-xlt p-4">
                <CheckCircle2 size={18} className="shrink-0 t-text" />
                <div>
                  <p className="text-sm font-semibold t-text-dk">¡Contraseña actualizada!</p>
                  <p className="text-xs t-text">Tu nueva contraseña ya está activa.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={hsPw(onChangePassword)} className="space-y-4">
                <PasswordInput
                  label="Contraseña actual"
                  {...regPw('current_password')}
                  error={ePw.current_password?.message}
                  autoComplete="current-password"
                />

                <div>
                  <PasswordInput
                    label="Nueva contraseña"
                    {...regPw('new_password')}
                    error={ePw.new_password?.message}
                    autoComplete="new-password"
                    placeholder="Mínimo 12 caracteres"
                  />
                  {/* Medidor en vivo: el usuario ve la exigencia mientras escribe,
                      no después de que el formulario se lo rechace. */}
                  {nuevaPwd.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${fuerza.bar} transition-all duration-300`}
                          style={{ width: `${fuerza.pct}%` }}
                        />
                      </div>
                      <span className={`shrink-0 text-[11px] font-semibold ${fuerza.text}`}>
                        {fuerza.label}
                      </span>
                    </div>
                  )}
                </div>

                <PasswordInput
                  label="Confirmar nueva contraseña"
                  {...regPw('confirm')}
                  error={ePw.confirm?.message}
                  autoComplete="new-password"
                />

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button type="submit" loading={isPwSub} variant="secondary">
                    Actualizar contraseña
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <TwoFactorCard />
          <PasskeysCard />

          {/* Solo master: ajusta los tiempos de sesión del negocio activo. */}
          <SessionPolicyCard />
        </div>
      </div>
    </div>
  )
}
