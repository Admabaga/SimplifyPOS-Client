import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, CalendarClock, Gauge, AlertTriangle, Loader2, Zap, Users2, Gem,
  Check, Star, Crown, Rocket, ArrowRight, Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/auth'
import { useMasterStore } from '@/stores/master'
import { subscriptionApi } from './api'
import { formatCOP, type EstadoSuscripcion, type SubscriptionMe, type Plan } from './types'
import WompiCheckout from './WompiCheckout'
import { SavedCard } from './CardPreview'
import {
  PageHeader, Card, Button, Badge, Modal, ProgressBar, Spinner, Table, Th, Td, ConfirmDialog,
} from '@/shared/components/ui'
import { apiError } from '@/shared/lib/apiError'

// ─── Plan selector ────────────────────────────────────────────────────────────

// Cada plan mantiene su identidad de marca (color del icono, check y acento)
// en lugar de teñir todo de verde. Las clases son literales para que Tailwind
// no las purgue.
const PLAN_META: Record<string, {
  icon: React.ReactNode
  iconChip: string      // chip del icono (siempre visible)
  accent: string        // barra de acento superior (card activa)
  activeBorder: string
  activeRing: string
  activeBg: string
  check: string         // color del check cuando está activa
  pill: string          // pill "Actual"
  badge?: string
  highlights: string[]
}> = {
  EMPRENDE: {
    icon: <Rocket size={17} />,
    iconChip: 'bg-violet-100 text-violet-600',
    accent: 'bg-violet-500',
    activeBorder: 'border-violet-400',
    activeRing: 'ring-violet-100',
    activeBg: 'bg-violet-50/50',
    check: 'text-violet-500',
    pill: 'text-violet-700 bg-violet-100',
    highlights: ['POS completo', 'Ventas ilimitadas', 'E-factura DIAN incluida', 'Caja e inventario'],
  },
  PRO: {
    icon: <Star size={17} />,
    iconChip: 'bg-emerald-100 text-emerald-600',
    accent: 'bg-emerald-500',
    activeBorder: 'border-emerald-500',
    activeRing: 'ring-emerald-100',
    activeBg: 'bg-emerald-50/50',
    check: 'text-emerald-500',
    pill: 'text-emerald-700 bg-emerald-100',
    badge: 'Más popular',
    highlights: ['Todo Emprende', 'E-factura DIAN ampliada', 'Clientes / CRM', 'Asesor IA'],
  },
  PREMIUM: {
    icon: <Crown size={17} />,
    iconChip: 'bg-amber-100 text-amber-600',
    accent: 'bg-amber-500',
    activeBorder: 'border-amber-500',
    activeRing: 'ring-amber-100',
    activeBg: 'bg-amber-50/50',
    check: 'text-amber-500',
    pill: 'text-amber-700 bg-amber-100',
    highlights: ['Todo Pro', 'Multi-sucursal', 'Docs ilimitados', 'Soporte prioritario'],
  },
}

function PlanCards({
  planes,
  currentPlanId,
  ciclo,
  onSelect,
  loading,
}: {
  planes: Plan[]
  currentPlanId: number
  ciclo: 'MENSUAL' | 'ANUAL'
  onSelect: (id: number) => void
  loading: boolean
}) {
  const [confirm, setConfirm] = useState<Plan | null>(null)

  const handleClick = (p: Plan) => {
    if (p.id === currentPlanId || loading) return
    setConfirm(p)
  }

  const handleConfirm = () => {
    if (!confirm) return
    onSelect(confirm.id)
    setConfirm(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        {planes.map((p) => {
          const meta = PLAN_META[p.codigo] ?? PLAN_META.PRO!
          const isActive = p.id === currentPlanId
          const price = ciclo === 'ANUAL' ? Math.round(p.precio_anual / 12) : p.precio_mensual
          const ahorroAnual = p.precio_mensual * 12 - p.precio_anual

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleClick(p)}
              disabled={loading}
              className={[
                'group relative text-left rounded-2xl border-2 p-4 pt-5 overflow-hidden',
                'transition-all duration-200 ease-out focus:outline-none',
                isActive
                  ? `${meta.activeBorder} ring-4 ${meta.activeRing} ${meta.activeBg} shadow-md`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5',
                loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {/* Barra de acento superior (solo card activa) */}
              {isActive && <span className={`absolute inset-x-0 top-0 h-1 ${meta.accent}`} />}

              {/* Badge "Más popular" */}
              {meta.badge && (
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm whitespace-nowrap">
                  {meta.badge}
                </span>
              )}

              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`p-1.5 rounded-lg ${meta.iconChip} transition-transform duration-200 group-hover:scale-110`}>
                  {meta.icon}
                </span>
                <span className="font-bold text-gray-900 text-sm">{p.nombre}</span>
                {isActive && (
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-auto ${meta.pill}`}>
                    <Check size={10} /> Actual
                  </span>
                )}
              </div>

              {/* Precio */}
              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight">
                    {formatCOP(price)}
                  </span>
                  <span className="text-xs text-gray-400">/mes</span>
                </div>
                {ciclo === 'ANUAL' && ahorroAnual > 0 && (
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-1">
                    <Sparkles size={10} /> Ahorras {formatCOP(ahorroAnual)} al año
                  </p>
                )}
              </div>

              {/* Highlights */}
              <ul className="space-y-1.5">
                {meta.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Check size={11} className={isActive ? meta.check : 'text-gray-400'} />
                    {h}
                  </li>
                ))}
              </ul>

              {/* CTA si no es el activo */}
              {!isActive && (
                <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-gray-400 transition-colors group-hover:text-gray-700">
                  Cambiar a este plan
                  <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">¿Cambiar a {confirm.nombre}?</h3>
            <p className="text-sm text-gray-500 mb-4">
              El cambio aplica de inmediato. Tu próximo cobro será{' '}
              <b>{formatCOP(ciclo === 'ANUAL' ? confirm.precio_anual : confirm.precio_mensual)}</b>
              /{ciclo === 'ANUAL' ? 'año' : 'mes'}.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleConfirm} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar cambio'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const ESTADO_META: Record<EstadoSuscripcion, { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' }> = {
  ACTIVE: { label: 'Activa', variant: 'green' },
  TRIALING: { label: 'Periodo de prueba', variant: 'yellow' },
  PAST_DUE: { label: 'Pago pendiente', variant: 'yellow' },
  SUSPENDED: { label: 'Suspendida', variant: 'red' },
  CANCELED: { label: 'Cancelada', variant: 'gray' },
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function SubscriptionPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showCard, setShowCard] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false)
  const role = useAuthStore((s) => s.user?.role)
  const activeTenantId = useMasterStore((s) => s.activeTenantId)
  const activeTenantName = useMasterStore((s) => s.activeTenantName)
  const esMasterSinNegocio = role === 'master' && !activeTenantId

  const { data: sub, isLoading, isError } = useQuery({
    queryKey: ['subscription', activeTenantId],
    queryFn: subscriptionApi.getMe,
    retry: false,
    enabled: !esMasterSinNegocio,
  })
  const { data: config } = useQuery({ queryKey: ['subscription-config'], queryFn: subscriptionApi.getConfig })
  const { data: planes } = useQuery({ queryKey: ['plans'], queryFn: subscriptionApi.getPlans })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['subscription'] })
  }

  const payMut = useMutation({
    mutationFn: subscriptionApi.pay,
    onMutate: () => toast.loading('Procesando pago…'),
    onSuccess: (r, _, toastId) => {
      toast.dismiss(toastId)
      invalidate()
      if (r.estado_transaccion === 'APPROVED') toast.success('¡Pago aprobado! Tu cuenta está activa.')
      else toast.error(`Pago ${r.estado_transaccion.toLowerCase()}: ${r.mensaje}`)
    },
    onError: (err, _, toastId) => {
      toast.dismiss(toastId)
      toast.error(apiError(err, 'No se pudo procesar el pago'))
    },
  })

  const changePlanMut = useMutation({
    mutationFn: subscriptionApi.changePlan,
    onSuccess: () => { invalidate(); toast.success('Plan actualizado') },
    onError: (err) => toast.error(apiError(err, 'No se pudo cambiar el plan')),
  })
  const changeCicloMut = useMutation({
    mutationFn: subscriptionApi.changeCiclo,
    onSuccess: () => { invalidate(); toast.success('Ciclo actualizado') },
    onError: (err) => toast.error(apiError(err, 'No se pudo cambiar el ciclo')),
  })
  const cancelMut = useMutation({
    mutationFn: () => subscriptionApi.cancel(true),
    onSuccess: () => { invalidate(); toast.success('Suscripción cancelada al final del periodo') },
    onError: (err) => toast.error(apiError(err, 'No se pudo cancelar la suscripción')),
  })
  const reactivateMut = useMutation({
    mutationFn: subscriptionApi.reactivate,
    onSuccess: () => { invalidate(); toast.success('Cancelación revertida') },
    onError: (err) => toast.error(apiError(err, 'No se pudo reanudar la suscripción')),
  })

  const saveCard = async (token: string, meta: { brand: string; last4: string; holder: string; exp: string }) => {
    await subscriptionApi.savePaymentMethod(token, meta)
    setShowCard(false)
    invalidate()
    toast.success('Método de pago guardado')
  }

  // Master sin un negocio seleccionado: invitar a elegir uno (su propia cuenta no
  // tiene suscripción). Con un negocio activo, ve la suscripción de ese tenant.
  if (esMasterSinNegocio) {
    return (
      <div className="space-y-5">
        <PageHeader title="Suscripción" subtitle="Selecciona un negocio para ver y gestionar su suscripción" />
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <Gem size={32} className="text-emerald-500" />
            <p className="text-sm font-medium text-gray-700">Estás en modo master.</p>
            <p className="text-sm text-gray-500 max-w-sm">
              Entra a un negocio desde el panel de suscripciones para ver su plan, pagos y método de pago.
            </p>
            <Button size="sm" onClick={() => navigate('/master/suscripciones')}>
              Ir al panel de suscripciones
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20"><Spinner size={28} /></div>
    )
  }

  if (isError || !sub) {
    return (
      <div className="space-y-5">
        <PageHeader title="Mi suscripción" />
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-10">
            <AlertTriangle size={28} className="text-amber-500" />
            <p className="text-sm font-medium text-gray-700">No se encontró una suscripción activa.</p>
            <p className="text-sm text-gray-400">Contacta a soporte si crees que esto es un error.</p>
          </div>
        </Card>
      </div>
    )
  }

  const meta = ESTADO_META[sub.estado]
  const usoPct = sub.documentos_limite
    ? Math.min(100, Math.round((sub.documentos_usados / sub.documentos_limite) * 100))
    : 0

  return (
    <div className="space-y-5">
      <PageHeader title="Mi suscripción" subtitle="Gestiona tu plan, pagos y facturación" />

      {/* Master viendo un negocio */}
      {activeTenantId && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          <Gem size={15} className="shrink-0" />
          Viendo la suscripción de <b>{activeTenantName ?? 'este negocio'}</b> (modo master).
        </div>
      )}

      {/* Aviso de estado */}
      {(sub.estado === 'SUSPENDED' || sub.estado === 'PAST_DUE') && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={18} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {sub.estado === 'SUSPENDED'
                ? 'Tu cuenta está suspendida por falta de pago.'
                : 'Tu último pago no se pudo procesar.'}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Realiza el pago para {sub.estado === 'SUSPENDED' ? 'reactivar tu cuenta de inmediato' : 'evitar la suspensión'}.
            </p>
          </div>
          <Button size="sm" variant="danger" onClick={() => (sub.tiene_metodo_pago ? payMut.mutate() : setShowCard(true))} disabled={payMut.isPending}>
            {payMut.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : sub.tiene_metodo_pago ? 'Reintentar pago' : 'Agregar tarjeta y pagar'}
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Plan actual */}
        <Card className="lg:col-span-2">
          {/* Header con gradiente */}
          <div
            className="-mx-5 -mt-5 mb-5 px-5 py-5 rounded-t-xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--t-primary, #059669) 0%, #0f766e 100%)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Gem size={18} className="shrink-0" />
                  <h3 className="text-lg font-bold leading-none">Plan {sub.plan.nombre}</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm text-white/80 mt-1.5">{sub.plan.descripcion}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-extrabold leading-none tracking-tight">{formatCOP(sub.monto_proximo_cobro)}</p>
                <p className="text-xs text-white/70 mt-1">/{sub.ciclo === 'ANUAL' ? 'año' : 'mes'}</p>
              </div>
            </div>
          </div>

          {/* Uso de documentos */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-1.5 text-gray-600"><Gauge size={15} /> Facturas electrónicas este periodo</span>
              <span className="font-semibold text-gray-800">
                {sub.documentos_usados}{sub.documentos_limite !== null ? ` / ${sub.documentos_limite}` : ' (ilimitado)'}
              </span>
            </div>
            {sub.documentos_limite !== null && (
              <ProgressBar value={usoPct} color={usoPct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'} />
            )}
            {sub.excedente_acumulado > 0 && (
              <p className="text-xs text-amber-600 mt-1.5">
                Excedente acumulado: {formatCOP(sub.excedente_acumulado)} (se suma al próximo cobro)
              </p>
            )}
            {sub.descuento_proximo_cobro > 0 && (
              <p className="text-xs text-emerald-600 mt-1.5">
                🎁 Tienes una promoción: −{formatCOP(sub.descuento_proximo_cobro)} en tu próximo cobro
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">
              Solo cuentan las facturas electrónicas enviadas a la DIAN; los comprobantes POS internos no consumen tu cupo.
            </p>
          </div>

          {/* Uso de usuarios */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="flex items-center gap-1.5 text-gray-600"><Users2 size={15} /> Usuarios del equipo</span>
              <span className="font-semibold text-gray-800">
                {sub.usuarios_actuales}{sub.plan.max_usuarios !== null ? ` / ${sub.plan.max_usuarios}` : ' (ilimitado)'}
              </span>
            </div>
            {sub.plan.max_usuarios !== null && (
              <ProgressBar
                value={Math.min(100, Math.round((sub.usuarios_actuales / sub.plan.max_usuarios) * 100))}
                color={sub.usuarios_actuales >= sub.plan.max_usuarios ? 'bg-amber-500' : 'bg-emerald-500'}
              />
            )}
            {sub.plan.max_usuarios !== null && sub.usuarios_actuales >= sub.plan.max_usuarios && (
              <p className="text-xs text-amber-600 mt-1.5">
                Alcanzaste el máximo de usuarios de tu plan. Sube de plan para agregar más.
              </p>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-gray-100">
            <Info icon={<CalendarClock size={15} />} label={sub.en_trial ? 'Fin de la prueba' : 'Renovación'} value={fmtDate(sub.proximo_cobro)} />
            <Info icon={<Zap size={15} />} label="Ciclo" value={sub.ciclo === 'ANUAL' ? 'Anual' : 'Mensual'} />
          </div>

          {/* Selector de plan */}
          {planes && planes.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Tu plan</p>
                {/* Toggle ciclo */}
                <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-semibold">
                  {(['MENSUAL', 'ANUAL'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => changeCicloMut.mutate(c)}
                      disabled={changeCicloMut.isPending || sub.ciclo === c}
                      className={[
                        'px-3 py-1 rounded-full transition-all',
                        sub.ciclo === c
                          ? 'bg-white shadow text-gray-900'
                          : 'text-gray-500 hover:text-gray-700',
                      ].join(' ')}
                    >
                      {c === 'MENSUAL' ? 'Mensual' : 'Anual'}
                    </button>
                  ))}
                </div>
              </div>

              <PlanCards
                planes={planes}
                currentPlanId={sub.plan.id}
                ciclo={sub.ciclo}
                onSelect={(id) => changePlanMut.mutate(id)}
                loading={changePlanMut.isPending}
              />

              {/* Cancelar / reanudar */}
              <div className="flex items-center justify-end mt-3">
                {sub.cancel_at_period_end ? (
                  <>
                    <p className="text-xs text-amber-600 mr-3">
                      Se cancela el {fmtDate(sub.periodo_fin)}
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => setShowReactivateConfirm(true)} disabled={reactivateMut.isPending}>
                      Reanudar suscripción
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(true)} disabled={cancelMut.isPending}>
                    Cancelar suscripción
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Método de pago */}
        <Card>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><CreditCard size={16} /> Método de pago</h3>
          {sub.tiene_metodo_pago ? (
            <div className="mt-3 flex justify-center">
              <SavedCard brandName={sub.metodo_brand} last4={sub.metodo_last4} holder={sub.metodo_holder} exp={sub.metodo_exp} />
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-center text-center gap-2 rounded-xl border border-dashed border-gray-200 py-6 px-3">
              <CreditCard size={28} className="text-gray-300" />
              <p className="text-sm text-gray-500">Aún no has registrado una tarjeta.</p>
              <p className="text-xs text-gray-400">Agrégala para activar el cobro automático.</p>
            </div>
          )}
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setShowCard(true)}>
            {sub.tiene_metodo_pago ? 'Actualizar tarjeta' : 'Agregar tarjeta'}
          </Button>
          {(sub.estado === 'PAST_DUE' || sub.estado === 'SUSPENDED') && (
            <Button size="sm" className="mt-2 w-full" onClick={() => (sub.tiene_metodo_pago ? payMut.mutate() : setShowCard(true))} disabled={payMut.isPending}>
              {payMut.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Pagar ahora'}
            </Button>
          )}
        </Card>
      </div>

      {/* Historial */}
      <Card>
        <h3 className="text-sm font-bold text-gray-900 mb-3">Historial de pagos</h3>
        {sub.historial.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay transacciones.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th><Th>Concepto</Th><Th>Monto</Th><Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {sub.historial.map((t) => (
                <tr key={t.id}>
                  <Td>{fmtDate(t.created_at)}</Td>
                  <Td className="capitalize">{t.concepto.toLowerCase()}</Td>
                  <Td>{formatCOP(t.monto)}</Td>
                  <Td>
                    <Badge variant={t.estado === 'APPROVED' ? 'green' : t.estado === 'DECLINED' ? 'red' : 'gray'}>
                      {t.estado}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={showCancelConfirm}
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={() => { cancelMut.mutate(); setShowCancelConfirm(false) }}
        title="¿Cancelar tu suscripción?"
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Al cancelar, tu plan <strong>{sub?.plan.nombre}</strong> seguirá activo hasta el final del periodo actual.
              Después de esa fecha perderás acceso a todas las funciones.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan actual</span>
                <span className="font-medium">{sub?.plan.nombre} ({sub?.ciclo === 'ANUAL' ? 'anual' : 'mensual'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Acceso hasta</span>
                <span className="font-semibold text-amber-700">{fmtDate(sub?.periodo_fin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Después de esa fecha</span>
                <span className="font-medium text-red-600">Sin acceso al sistema</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">Puedes reactivar antes de la fecha límite sin perder datos.</p>
          </div>
        }
        confirmLabel="Sí, cancelar suscripción"
        danger
        loading={cancelMut.isPending}
      />

      <ConfirmDialog
        open={showReactivateConfirm}
        onCancel={() => setShowReactivateConfirm(false)}
        onConfirm={() => { reactivateMut.mutate(); setShowReactivateConfirm(false) }}
        title="Reanudar suscripción"
        message="¿Confirmas que deseas reanudar tu suscripción? Se seguirá cobrando normalmente al final del periodo."
        confirmLabel="Reanudar"
        loading={reactivateMut.isPending}
      />

      {/* Modal de tarjeta */}
      <Modal open={showCard} onClose={() => setShowCard(false)} title="Método de pago">
        {config ? (
          <WompiCheckout config={config} onToken={saveCard} />
        ) : (
          <div className="flex justify-center py-6"><Spinner /></div>
        )}
      </Modal>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-gray-400">{icon} {label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
