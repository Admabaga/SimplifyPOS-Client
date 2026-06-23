import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Shield, CheckCircle2, Eye, EyeOff, IdCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth'
import { authApi } from './api'
import { apiError } from '@/shared/lib/apiError'
import { PageHeader, Card, Button, Badge } from '@/shared/components/ui'
import TwoFactorCard from './TwoFactorCard'
import PasskeysCard from './PasskeysCard'

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

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; variant: 'green' | 'blue' | 'purple' | 'yellow' }> = {
  master:     { label: 'Master',     variant: 'purple' },
  admin:      { label: 'Admin',      variant: 'blue'   },
  supervisor: { label: 'Supervisor', variant: 'green'  },
}

// ── Password input ────────────────────────────────────────────────────────────

function PasswordInput({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={`w-full px-3 pr-10 py-2.5 text-sm border rounded-xl focus:outline-none transition-colors ${
            error ? 'border-red-400 bg-red-50' : 'border-slate-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [pwdOk, setPwdOk] = useState(false)

  // Profile form
  const {
    register: regP,
    handleSubmit: hsP,
    formState: { errors: eP, isDirty: pDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { nombre: user?.nombre ?? '', nit: (user as any)?.nit ?? '' },
  })

  // Password form
  const {
    register: regPw,
    handleSubmit: hsPw,
    reset: resetPw,
    formState: { errors: ePw, isSubmitting: isPwSub },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const [profileLoading, setProfileLoading] = useState(false)

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
      await authApi.changePassword({ current_password: data.current_password, new_password: data.new_password })
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

  return (
    <div className="max-w-2xl">
      <PageHeader title="Mi perfil" subtitle="Información personal y configuración de acceso" />

      {/* ── Avatar + info básica ─────────────────────────────────────────── */}
      <Card className="mb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl t-gradient flex items-center justify-center text-white text-xl font-bold shadow-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 truncate">{user.nombre}</h2>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge variant={roleConf.variant}>
                <Shield size={10} className="mr-1" />
                {roleConf.label}
              </Badge>
              {user.must_change_password && (
                <Badge variant="yellow">Debe cambiar contraseña</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Datos personales ─────────────────────────────────────────────── */}
      <Card className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <User size={15} className="text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Datos personales</h3>
        </div>

        <form onSubmit={hsP(onSaveProfile)} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nombre completo</label>
            <input
              {...regP('nombre')}
              className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none transition-colors ${
                eP.nombre ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            {eP.nombre && <p className="text-xs text-red-600">{eP.nombre.message}</p>}
          </div>

          {/* Email — solo lectura */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
            <div className="px-3 py-2.5 text-sm border border-slate-100 rounded-xl bg-slate-50 text-slate-500 select-all">
              {user.email}
            </div>
            <p className="text-[11px] text-slate-400">El correo no se puede cambiar desde aquí. Contacta al administrador.</p>
          </div>

          {/* NIT / Identificación */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <IdCard size={13} className="text-slate-400" />
              NIT / Número de identificación
            </label>
            <input
              {...regP('nit')}
              placeholder="Ej: 900.123.456-7"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-400">Cédula, NIT o número de identificación personal.</p>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={profileLoading} disabled={!pDirty}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Cambiar contraseña ───────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 t-bg-xlt rounded-lg">
            <Lock size={15} className="t-text" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Cambiar contraseña</h3>
        </div>

        {pwdOk ? (
          <div className="flex items-center gap-3 p-4 t-bg-xlt border t-border-lt rounded-xl">
            <CheckCircle2 size={18} className="t-text shrink-0" />
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
            <PasswordInput
              label="Nueva contraseña"
              {...regPw('new_password')}
              error={ePw.new_password?.message}
              autoComplete="new-password"
              placeholder="Mínimo 12 caracteres"
            />
            <PasswordInput
              label="Confirmar nueva contraseña"
              {...regPw('confirm')}
              error={ePw.confirm?.message}
              autoComplete="new-password"
            />

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={isPwSub} variant="secondary">
                Actualizar contraseña
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* ── Verificación en dos pasos ────────────────────────────────────── */}
      <TwoFactorCard />

      {/* ── Passkeys (login sin contraseña) ──────────────────────────────── */}
      <PasskeysCard />
    </div>
  )
}
