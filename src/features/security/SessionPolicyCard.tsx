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
            <span className="block text-sm font-medium mb-2">Cerrar sesión tras inactividad</span>

            <label className="flex items-start gap-2 mb-2 cursor-pointer">
              <input
                type="radio"
                name="modo-inactividad"
                className="mt-1"
                checked={!sinBloqueo}
                onChange={() => setIdle(String(policy?.idle_por_defecto ?? 30))}
              />
              <span className="text-sm">
                Bloquear tras
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={sinBloqueo ? '' : idle}
                  disabled={sinBloqueo}
                  onChange={(e) => setIdle(e.target.value)}
                  aria-label="Minutos de inactividad"
                  className="w-20 mx-2 rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                />
                minutos sin actividad
                <span className="block text-xs text-slate-500 mt-0.5">
                  Entre 5 y 480. El contador se reinicia con cualquier clic o tecla, así que a un
                  cajero atendiendo no le salta nunca.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="modo-inactividad"
                className="mt-1"
                checked={sinBloqueo}
                onChange={() => setIdle('0')}
              />
              <span className="text-sm">
                No bloquear nunca
                <span className="block text-xs text-slate-500 mt-0.5">
                  La sesión queda abierta mientras el navegador esté abierto. Para cajas que operan
                  desatendidas o pantallas de consulta.
                </span>
              </span>
            </label>

            {sinBloqueo && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                <strong>Sin bloqueo:</strong> si alguien deja la caja abierta, queda accesible a
                quien pase por ahí, con las ventas y los datos del negocio a la vista. Actívalo solo
                si el cliente lo pide y entiende lo que implica.
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
            Estos valores aplican al negocio, no a tu sesión de master: la tuya se bloquea antes y
            no se configura desde aquí, porque es la única cuenta que ve los datos de todos los
            comercios.
          </p>
        </div>
      )}
    </Card>
  )
}
