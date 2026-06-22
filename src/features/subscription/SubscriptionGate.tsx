import { useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Lock, Loader2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptionApi } from './api'
import { formatCOP } from './types'
import WompiCheckout from './WompiCheckout'
import { useAuthStore } from '@/stores/auth'
import { apiError } from '@/shared/lib/apiError'

/**
 * Envuelve el área autenticada. Si la suscripción del tenant está SUSPENDED,
 * muestra un overlay bloqueante con opción de pago (reactivación inmediata).
 * Para TRIALING / PAST_DUE muestra un banner no intrusivo.
 * Master y tenants sin suscripción (404) pasan sin bloqueo.
 */
export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const isMaster = useAuthStore((s) => s.user?.role === 'master')

  const { data: sub } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getMe,
    enabled: !isMaster,
    retry: false,
    staleTime: 60_000,
  })
  const { data: config } = useQuery({
    queryKey: ['subscription-config'],
    queryFn: subscriptionApi.getConfig,
    enabled: !isMaster,
    retry: false,
  })

  // Cuando una petición de negocio devuelve 402, refrescamos el estado.
  useEffect(() => {
    const handler = () => qc.invalidateQueries({ queryKey: ['subscription'] })
    window.addEventListener('simplifypos:subscription-required', handler)
    return () => window.removeEventListener('simplifypos:subscription-required', handler)
  }, [qc])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['subscription'] })

  const payMut = useMutation({
    mutationFn: subscriptionApi.pay,
    onMutate: () => toast.loading('Procesando pago…'),
    onSuccess: (r, _, toastId) => {
      toast.dismiss(toastId)
      invalidate()
      if (r.estado_transaccion === 'APPROVED') toast.success('¡Pago aprobado! Cuenta reactivada.')
      else toast.error(`Pago ${r.estado_transaccion.toLowerCase()}: ${r.mensaje}`)
    },
    onError: (err, _, toastId) => {
      toast.dismiss(toastId)
      toast.error(apiError(err, 'No se pudo procesar el pago'))
    },
  })

  const saveCardAndPay = async (token: string, meta: { brand: string; last4: string; holder: string; exp: string }) => {
    await subscriptionApi.savePaymentMethod(token, meta)
    await payMut.mutateAsync()
  }

  const bloqueada = sub && !sub.acceso_permitido

  return (
    <>
      {/* Banner trial / pago pendiente (no bloqueante) */}
      {sub && sub.acceso_permitido && sub.estado === 'PAST_DUE' && (
        <Banner tone="warn" icon={<AlertTriangle size={15} />}>
          Tu pago no se procesó. Regulariza antes del corte para no perder el acceso.{' '}
          <Link to="/cuenta/suscripcion" className="font-bold underline">Pagar ahora</Link>
        </Banner>
      )}
      {sub && sub.estado === 'TRIALING' && (
        <Banner tone="info" icon={<Clock size={15} />}>
          Estás en tu mes de prueba gratis.{' '}
          {!sub.tiene_metodo_pago && (
            <Link to="/cuenta/suscripcion" className="font-bold underline">Agrega un método de pago</Link>
          )}
        </Banner>
      )}

      {children}

      {/* Overlay bloqueante */}
      {bloqueada && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <Lock className="text-red-600" size={22} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Tu suscripción está suspendida</h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              Realiza el pago de <b>{sub && formatCOP(sub.monto_proximo_cobro)}</b> para reactivar tu cuenta
              de inmediato y seguir operando.
            </p>

            <div className="mt-5">
              {sub?.tiene_metodo_pago ? (
                <button
                  onClick={() => payMut.mutate()}
                  disabled={payMut.isPending}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {payMut.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  Pagar {sub && formatCOP(sub.monto_proximo_cobro)} con {sub.metodo_brand} •••• {sub.metodo_last4}
                </button>
              ) : config ? (
                <WompiCheckout config={config} onToken={saveCardAndPay} submitting={payMut.isPending} cta="Pagar y reactivar" />
              ) : (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
              )}
            </div>

            <button
              onClick={() => useAuthStore.getState().clearAuth()}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Banner({ tone, icon, children }: { tone: 'warn' | 'info'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'warn'
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-sm border-b ${cls}`}>
      {icon}
      <span>{children}</span>
    </div>
  )
}
