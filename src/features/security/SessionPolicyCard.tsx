import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'
import { Card, Button, Badge } from '@/shared/components/ui'
import { apiError } from '@/shared/lib/apiError'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'
import { sessionPolicyApi, useSessionPolicy } from './sessionPolicyApi'

/**
 * Ajuste de los tiempos de sesión de UN negocio.
 *
 * Solo la ve y la usa el master: si el propio comerciante pudiera desactivar el
 * bloqueo por inactividad, la protección dejaría de existir en cuanto le
 * estorbara. El servidor lo exige igual (403 para cualquier otro rol); esconder
 * la tarjeta es solo para no ofrecer algo que va a fallar.
 */
export default function SessionPolicyCard() {
  const esMaster = useAuthStore((s) => s.can('users:manage'))
  const tenantId = useMasterStore((s) => s.activeTenantId)
  const tenantNombre = useMasterStore((s) => s.activeTenantName)
  const { data: policy, isLoading } = useSessionPolicy()
  const qc = useQueryClient()

  const [idle, setIdle] = useState<string>('')
  const [sesion, setSesion] = useState<string>('')

  useEffect(() => {
    if (!policy) return
    setIdle(String(policy.idle_timeout_min))
    setSesion(String(policy.session_timeout_min))
  }, [policy])

  const guardar = useMutation({
    mutationFn: () =>
      sessionPolicyApi.update({
        idle_timeout_min: idle === '' ? null : Number(idle),
        session_timeout_min: sesion === '' ? null : Number(sesion),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-policy'] })
      toast.success('Tiempos de sesión actualizados')
    },
    onError: (e) => toast.error(apiError(e, 'No se pudo guardar')),
  })

  const restaurar = useMutation({
    mutationFn: () =>
      sessionPolicyApi.update({ idle_timeout_min: null, session_timeout_min: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-policy'] })
      toast.success('Restaurado a los valores por defecto')
    },
    onError: (e) => toast.error(apiError(e, 'No se pudo restaurar')),
  })

  if (!esMaster) return null

  if (!tenantId) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-[var(--t-primary)]" />
          <h3 className="font-semibold">Seguridad de la sesión</h3>
        </div>
        <p className="text-sm text-slate-500">
          Entra a un negocio desde el panel master para ajustar sus tiempos de sesión.
        </p>
      </Card>
    )
  }

  const sinBloqueo = idle === '0'

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--t-primary)]" />
          <h3 className="font-semibold">Seguridad de la sesión</h3>
        </div>
        {policy?.personalizada ? (
          <Badge variant="green">Personalizada</Badge>
        ) : (
          <Badge variant="gray">Por defecto</Badge>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Ajustes de <strong>{tenantNombre ?? 'este negocio'}</strong>. Solo tú, como master, puedes
        cambiarlos.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="idle-min">
              Cerrar sesión tras inactividad
            </label>
            <div className="flex items-center gap-2">
              <input
                id="idle-min"
                type="number"
                min={0}
                max={480}
                value={idle}
                onChange={(e) => setIdle(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-slate-500">minutos</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              El contador se reinicia con cualquier clic o tecla, así que a un cajero trabajando no
              le salta. Entre 5 y 480 minutos, o <strong>0 para no bloquear nunca</strong> (útil en
              cajas que operan desatendidas).
            </p>
            {sinBloqueo && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                Sin bloqueo por inactividad: si alguien deja la caja abierta, queda accesible a
                quien pase por ahí. Actívalo solo si el negocio lo pide.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="sesion-min">
              Duración de la sesión
            </label>
            <div className="flex items-center gap-2">
              <input
                id="sesion-min"
                type="number"
                min={30}
                max={1440}
                value={sesion}
                onChange={(e) => setSesion(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="text-sm text-slate-500">minutos</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cada cuánto se renueva la sesión por detrás. El usuario no lo nota: solo aparece la
              pantalla de reingreso si esa renovación falla. Entre 30 y 1440 minutos.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {policy?.personalizada && (
              <Button
                variant="secondary"
                onClick={() => restaurar.mutate()}
                disabled={restaurar.isPending}
              >
                Usar valores por defecto
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Por defecto del sistema: {policy?.idle_por_defecto} min de inactividad ·{' '}
            {policy?.sesion_por_defecto} min de sesión.
          </p>
        </div>
      )}
    </Card>
  )
}
