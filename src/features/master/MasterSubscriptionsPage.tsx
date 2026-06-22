import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  BadgeDollarSign,
  CalendarPlus,
  CreditCard,
  Gift,
  History,
  Lock,
  LockOpen,
  Percent,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal,
  PageHeader,
  Skeleton,
} from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import apiClient from '@/shared/api/client'
import type { Plan, Transaccion } from '@/features/subscription/types'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubRow {
  admin_id: number
  admin_email: string
  admin_nombre: string
  razon_social: string | null
  plan_codigo: string | null
  plan_nombre: string | null
  estado: string
  ciclo: string
  trial_fin: string | null
  periodo_fin: string | null
  proximo_cobro: string | null
  documentos_usados: number
  documentos_limite: number | null
  excedente_acumulado: number
  descuento_proximo_cobro: number
  monto_proximo_cobro: number | null
  tiene_metodo_pago: boolean
  metodo_brand: string | null
  metodo_last4: string | null
  cancel_at_period_end: boolean
  created_at: string
}

interface SaasMetrics {
  mrr: number
  ingresos_mes: number
  total_tenants: number
  por_estado: Record<string, number>
  trials_por_vencer: number
  cobros_aprobados_mes: number
  cobros_rechazados_mes: number
  total_rechazado_mes: number
  cuentas_bloqueadas: number
  cuentas_en_mora: number
}

interface MovimientoMaster {
  id: number
  admin_id: number
  admin_email: string
  admin_nombre: string
  monto: number
  moneda: string
  concepto: string
  ciclo: string
  estado: string
  metodo: string | null
  mensaje: string
  referencia: string | null
  created_at: string
  finalized_at: string | null
}

interface PlanAdmin {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  precio_mensual: number
  precio_anual: number
  limite_documentos_mes: number | null
  precio_excedente: number
  max_usuarios: number | null
  features: string[]
  activo: boolean
  orden: number
}

interface PlanUpdate {
  nombre?: string
  descripcion?: string
  precio_mensual?: number
  precio_anual?: number
  limite_documentos_mes?: number
  limite_ilimitado?: boolean
  precio_excedente?: number
  max_usuarios?: number
  usuarios_ilimitados?: boolean
  features?: string[]
  activo?: boolean
}

// ─── API ──────────────────────────────────────────────────────────────────────

const subsApi = {
  list: () => apiClient.get<SubRow[]>('/master/subscriptions').then((r) => r.data),
  metrics: () => apiClient.get<SaasMetrics>('/master/subscriptions/metrics').then((r) => r.data),
  transactions: (adminId: number) =>
    apiClient
      .get<Transaccion[]>(`/master/subscriptions/${adminId}/transactions`)
      .then((r) => r.data),
  grantDays: (adminId: number, dias: number, motivo: string) =>
    apiClient
      .post<SubRow>(`/master/subscriptions/${adminId}/grant-days`, { dias, motivo })
      .then((r) => r.data),
  discount: (adminId: number, monto: number, motivo: string) =>
    apiClient
      .post<SubRow>(`/master/subscriptions/${adminId}/discount`, { monto, motivo })
      .then((r) => r.data),
  changePlan: (adminId: number, plan_codigo: string, motivo: string) =>
    apiClient
      .post<SubRow>(`/master/subscriptions/${adminId}/change-plan`, { plan_codigo, motivo })
      .then((r) => r.data),
  suspend: (adminId: number, motivo: string) =>
    apiClient
      .post<SubRow>(`/master/subscriptions/${adminId}/suspend`, { motivo })
      .then((r) => r.data),
  reactivate: (adminId: number, motivo: string) =>
    apiClient
      .post<SubRow>(`/master/subscriptions/${adminId}/reactivate`, { motivo })
      .then((r) => r.data),
  plans: () => apiClient.get<Plan[]>('/plans').then((r) => r.data),
  movimientos: () =>
    apiClient
      .get<MovimientoMaster[]>('/master/subscriptions/transactions', { params: { limit: 150 } })
      .then((r) => r.data),
  plansAdmin: () =>
    apiClient.get<PlanAdmin[]>('/master/subscriptions/plans').then((r) => r.data),
  updatePlan: (planId: number, body: PlanUpdate) =>
    apiClient.put<PlanAdmin>(`/master/subscriptions/plans/${planId}`, body).then((r) => r.data),
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

const ESTADO_UI: Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'gray' | 'blue'; hint: string }> = {
  ACTIVE:    { label: 'Al día',      variant: 'green',  hint: 'Pagó y puede usar todo.' },
  TRIALING:  { label: 'En prueba',   variant: 'blue',   hint: 'Mes de prueba gratis activo.' },
  PAST_DUE:  { label: 'En mora',     variant: 'yellow', hint: 'El cobro falló; sigue operando unos días con aviso.' },
  SUSPENDED: { label: 'Bloqueada',   variant: 'red',    hint: 'Sin acceso hasta que pague (o la reactives tú).' },
  CANCELED:  { label: 'Cancelada',   variant: 'gray',   hint: 'El cliente canceló su suscripción.' },
}

function fecha(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Métricas (tarjetas de arriba) ────────────────────────────────────────────

function MetricsBar({ m }: { m: SaasMetrics }) {
  const cards = [
    {
      icon: <TrendingUp size={16} className="text-emerald-600" />,
      label: 'Ingreso mensual (MRR)',
      value: formatCOP(m.mrr),
      hint: 'Lo que facturas cada mes con las suscripciones al día',
    },
    {
      icon: <BadgeDollarSign size={16} className="text-blue-600" />,
      label: 'Cobrado este mes',
      value: formatCOP(m.ingresos_mes),
      hint: 'Pagos aprobados en el mes calendario',
    },
    {
      icon: <Users size={16} className="text-indigo-600" />,
      label: 'Clientes',
      value: String(m.total_tenants),
      hint: `${m.por_estado['ACTIVE'] ?? 0} al día · ${m.por_estado['PAST_DUE'] ?? 0} en mora · ${m.por_estado['SUSPENDED'] ?? 0} bloqueados`,
    },
    {
      icon: <AlertCircle size={16} className="text-red-600" />,
      label: 'Rechazado este mes',
      value: formatCOP(m.total_rechazado_mes),
      hint: `${m.cobros_rechazados_mes} cobro(s) fallido(s) · ${m.cuentas_bloqueadas} cuenta(s) bloqueada(s)`,
    },
    {
      icon: <AlertCircle size={16} className="text-amber-600" />,
      label: 'Pruebas por vencer',
      value: String(m.trials_por_vencer),
      hint: 'Trials que terminan en los próximos 7 días',
    },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((c) => (
        <Card key={c.label} padding>
          <div className="flex items-center gap-2">
            {c.icon}
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{c.hint}</p>
        </Card>
      ))}
    </div>
  )
}

// ─── Modal de promo (días gratis / descuento) ─────────────────────────────────

function PromoModal({ row, onClose }: { row: SubRow; onClose: () => void }) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<'dias' | 'descuento'>('dias')
  const [dias, setDias] = useState(30)
  const [monto, setMonto] = useState(10000)
  const [motivo, setMotivo] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      tipo === 'dias'
        ? subsApi.grantDays(row.admin_id, dias, motivo)
        : subsApi.discount(row.admin_id, monto, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', 'subscriptions'] })
      toast.success(
        tipo === 'dias'
          ? `Regalaste ${dias} días a ${row.razon_social ?? row.admin_nombre}`
          : `Descuento de ${formatCOP(monto)} aplicado al próximo cobro`
      )
      onClose()
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const presetsDias = [
    { d: 7, label: '1 semana' },
    { d: 15, label: '15 días' },
    { d: 30, label: '1 mes' },
    { d: 60, label: '2 meses' },
  ]

  return (
    <Modal open onClose={onClose} title={`Dar promoción · ${row.razon_social ?? row.admin_nombre}`}>
      <div className="space-y-4">
        {/* Selector de tipo */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('dias')}
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition
              ${tipo === 'dias'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 font-semibold'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
          >
            <CalendarPlus size={16} className="text-emerald-600" />
            Días gratis
          </button>
          <button
            type="button"
            onClick={() => setTipo('descuento')}
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition
              ${tipo === 'descuento'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 font-semibold'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
          >
            <Percent size={16} className="text-emerald-600" />
            Descuento
          </button>
        </div>

        {tipo === 'dias' ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Extiende el servicio sin cobro. Si la cuenta está bloqueada o en mora,
              <strong> se reactiva al instante</strong>.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {presetsDias.map((p) => (
                <button
                  key={p.d}
                  type="button"
                  onClick={() => setDias(p.d)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition
                    ${dias === p.d
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="block text-xs text-gray-500 mb-1">Días (personalizado)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="w-32 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Resta este valor del <strong>siguiente cobro</strong> del cliente
              {row.monto_proximo_cobro != null && (
                <> (hoy sería {formatCOP(row.monto_proximo_cobro)})</>
              )}.
            </p>
            <label className="block text-xs text-gray-500 mb-1">Valor del descuento (COP)</label>
            <input
              type="number"
              min={1}
              step={1000}
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-44 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo (queda en la auditoría)</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: promo de lanzamiento, compensación…"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            icon={<Gift size={14} />}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (tipo === 'dias' ? dias < 1 : monto < 1)}
          >
            {mutation.isPending ? 'Aplicando…' : 'Aplicar promoción'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal de historial de pagos ──────────────────────────────────────────────

function HistorialModal({ row, onClose }: { row: SubRow; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['master', 'subscriptions', row.admin_id, 'txs'],
    queryFn: () => subsApi.transactions(row.admin_id),
  })
  const txVariant = (estado: string) =>
    estado === 'APPROVED' ? 'green' : estado === 'DECLINED' ? 'red' : 'gray'

  return (
    <Modal open onClose={onClose} title={`Pagos · ${row.razon_social ?? row.admin_nombre}`}>
      {isLoading && <Skeleton className="h-24 rounded-lg" />}
      {data && data.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">Aún no hay cobros registrados.</p>
      )}
      {data && data.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
          {data.map((tx) => (
            <li key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCOP(tx.monto)}{' '}
                  <span className="text-xs font-normal text-gray-400">
                    · {tx.concepto.toLowerCase()} {tx.ciclo.toLowerCase()}
                  </span>
                </p>
                <p className="text-xs text-gray-500">{fecha(tx.created_at)} {tx.mensaje && `· ${tx.mensaje}`}</p>
              </div>
              <Badge variant={txVariant(tx.estado)}>{tx.estado}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

// ─── Modal cambiar plan ───────────────────────────────────────────────────────

function CambiarPlanModal({ row, onClose }: { row: SubRow; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: subsApi.plans })
  const [codigo, setCodigo] = useState(row.plan_codigo ?? '')
  const [motivo, setMotivo] = useState('')

  const mutation = useMutation({
    mutationFn: () => subsApi.changePlan(row.admin_id, codigo, motivo),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['master', 'subscriptions'] })
      toast.success(`Plan cambiado a ${updated.plan_nombre}`)
      onClose()
    },
    onError: (err) => toast.error(apiError(err)),
  })

  return (
    <Modal open onClose={onClose} title={`Cambiar plan · ${row.razon_social ?? row.admin_nombre}`}>
      <div className="space-y-3">
        {(plans ?? []).map((p) => (
          <button
            key={p.codigo}
            type="button"
            onClick={() => setCodigo(p.codigo)}
            className={`w-full text-left rounded-lg border p-3 transition
              ${codigo === p.codigo
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{p.nombre}</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{formatCOP(p.precio_mensual)}/mes</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {p.limite_documentos_mes == null
                ? 'Facturas electrónicas ilimitadas'
                : `${p.limite_documentos_mes} facturas electrónicas/mes`}
            </p>
          </button>
        ))}
        <input
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (queda en la auditoría)"
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !codigo || codigo === row.plan_codigo}
          >
            {mutation.isPending ? 'Cambiando…' : 'Cambiar plan'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Fila / tarjeta de suscripción ────────────────────────────────────────────

function SubCard({ row, onPromo, onHistorial, onPlan }: {
  row: SubRow
  onPromo: () => void
  onHistorial: () => void
  onPlan: () => void
}) {
  const qc = useQueryClient()
  const ui = ESTADO_UI[row.estado] ?? { label: row.estado, variant: 'gray' as const, hint: '' }
  const bloqueada = row.estado === 'SUSPENDED' || row.estado === 'PAST_DUE'
  const [confirmToggle, setConfirmToggle] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: () =>
      bloqueada
        ? subsApi.reactivate(row.admin_id, 'desbloqueo manual desde panel master')
        : subsApi.suspend(row.admin_id, 'bloqueo manual desde panel master'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', 'subscriptions'] })
      toast.success(bloqueada ? 'Cuenta desbloqueada' : 'Cuenta bloqueada')
      setConfirmToggle(false)
    },
    onError: (err) => { toast.error(apiError(err)); setConfirmToggle(false) },
  })

  const uso =
    row.documentos_limite == null
      ? `${row.documentos_usados} FE este periodo (ilimitado)`
      : `${row.documentos_usados} / ${row.documentos_limite} FE este periodo`

  return (
    <Card padding className={bloqueada ? 'border-red-200 dark:border-red-900' : ''}>
      {/* Identidad + estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {row.razon_social ?? row.admin_nombre}
          </p>
          <p className="text-xs text-gray-500 truncate">{row.admin_email}</p>
        </div>
        <Badge variant={ui.variant} dot>{ui.label}</Badge>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{ui.hint}</p>

      {/* Datos clave */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Plan</dt>
          <dd className="font-medium text-gray-900 dark:text-white">
            {row.plan_nombre ?? '—'} <span className="text-xs text-gray-400">({row.ciclo.toLowerCase()})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Próximo cobro</dt>
          <dd className="font-medium text-gray-900 dark:text-white">
            {row.monto_proximo_cobro != null ? formatCOP(row.monto_proximo_cobro) : '—'}
            <span className="text-xs text-gray-400"> · {fecha(row.proximo_cobro)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Facturación electrónica</dt>
          <dd className="text-gray-700 dark:text-gray-300 text-xs">{uso}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Método de pago</dt>
          <dd className="text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1">
            <CreditCard size={12} />
            {row.tiene_metodo_pago ? `${row.metodo_brand ?? 'Tarjeta'} •••• ${row.metodo_last4 ?? ''}` : 'Sin tarjeta'}
          </dd>
        </div>
      </dl>

      {(row.descuento_proximo_cobro > 0 || row.excedente_acumulado > 0) && (
        <p className="mt-2 text-[11px] text-gray-500">
          {row.descuento_proximo_cobro > 0 && (
            <span className="text-emerald-600">Promo: −{formatCOP(row.descuento_proximo_cobro)} próximo cobro. </span>
          )}
          {row.excedente_acumulado > 0 && (
            <span className="text-amber-600">Excedente acumulado: {formatCOP(row.excedente_acumulado)}.</span>
          )}
        </p>
      )}

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" icon={<Gift size={13} />} onClick={onPromo}>
          Dar promo
        </Button>
        <Button size="sm" variant="ghost" icon={<History size={13} />} onClick={onHistorial}>
          Pagos
        </Button>
        <Button size="sm" variant="ghost" onClick={onPlan}>
          Cambiar plan
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={bloqueada ? <LockOpen size={13} /> : <Lock size={13} />}
          onClick={() => setConfirmToggle(true)}
          disabled={toggleMutation.isPending}
          className={bloqueada ? 'text-green-600' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}
        >
          {bloqueada ? 'Desbloquear' : 'Bloquear'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmToggle}
        onCancel={() => setConfirmToggle(false)}
        onConfirm={() => toggleMutation.mutate()}
        title={bloqueada ? 'Desbloquear cuenta' : 'Bloquear cuenta'}
        message={bloqueada
          ? `¿Reactivar la suscripción de ${row.razon_social ?? row.admin_nombre}? Recuperarán acceso inmediato.`
          : `¿Suspender la cuenta de ${row.razon_social ?? row.admin_nombre}? Perderán acceso hasta que paguen o los reactives.`}
        confirmLabel={bloqueada ? 'Desbloquear' : 'Bloquear'}
        danger={!bloqueada}
        loading={toggleMutation.isPending}
      />
    </Card>
  )
}

// ─── Movimientos globales (historial de pagos de todos los tenants) ───────────

const TX_UI: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Aprobado', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300' },
  DECLINED: { label: 'Rechazado', cls: 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300' },
  ERROR:    { label: 'Error', cls: 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300' },
  PENDING:  { label: 'Pendiente', cls: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300' },
  VOIDED:   { label: 'Anulado', cls: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300' },
}

function fechaHora(d: string): string {
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function MovimientosPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['master', 'subscriptions', 'movimientos'],
    queryFn: subsApi.movimientos,
    staleTime: 20_000,
  })

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />
  if (error != null)
    return <EmptyState icon={<AlertCircle size={32} className="text-red-400" />} title="Error" description={apiError(error)} />
  if (!data || data.length === 0)
    return <EmptyState icon={<History size={32} className="text-gray-300" />} title="Aún no hay pagos" description="Cuando tus clientes paguen, verás aquí cada cobro." />

  return (
    <Card padding={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Método</th>
            </tr>
          </thead>
          <tbody>
            {data.map((mv) => {
              const ui = TX_UI[mv.estado] ?? { label: mv.estado, cls: 'text-gray-600 bg-gray-100' }
              return (
                <tr key={mv.id} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fechaHora(mv.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white leading-tight">{mv.admin_nombre}</p>
                    <p className="text-[11px] text-gray-400">{mv.admin_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 capitalize">{mv.concepto.toLowerCase()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{formatCOP(mv.monto)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${ui.cls}`}>{ui.label}</span>
                    {mv.mensaje && mv.estado !== 'APPROVED' && (
                      <p className="text-[11px] text-gray-400 mt-0.5 max-w-44 truncate" title={mv.mensaje}>{mv.mensaje}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{mv.metodo ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Editor de planes (precios y beneficios desde la interfaz) ────────────────

const FEATURE_CATALOGO: { key: string; label: string }[] = [
  { key: 'pos', label: 'Punto de venta' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'caja', label: 'Caja' },
  { key: 'cuentas', label: 'Cuentas por cobrar' },
  { key: 'reportes_basicos', label: 'Reportes básicos' },
  { key: 'comprobante_pos', label: 'Comprobante POS' },
  { key: 'dian_electronica', label: 'Factura electrónica DIAN' },
  { key: 'crm_clientes', label: 'Clientes / CRM' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'reportes_avanzados', label: 'Reportes avanzados' },
  { key: 'ai_advisor', label: 'Asesor IA' },
  { key: 'multi_sucursal', label: 'Multi-sucursal' },
  { key: 'soporte_prioritario', label: 'Soporte prioritario' },
]

function PlanEditorCard({ plan }: { plan: PlanAdmin }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    nombre: plan.nombre,
    descripcion: plan.descripcion,
    precio_mensual: plan.precio_mensual,
    precio_anual: plan.precio_anual,
    precio_excedente: plan.precio_excedente,
    limite_documentos_mes: plan.limite_documentos_mes ?? 0,
    limite_ilimitado: plan.limite_documentos_mes === null,
    max_usuarios: plan.max_usuarios ?? 1,
    usuarios_ilimitados: plan.max_usuarios === null,
    features: new Set(plan.features),
    activo: plan.activo,
  })

  const toggleFeature = (key: string) =>
    setForm((f) => {
      const next = new Set(f.features)
      next.has(key) ? next.delete(key) : next.add(key)
      return { ...f, features: next }
    })

  const save = useMutation({
    mutationFn: () =>
      subsApi.updatePlan(plan.id, {
        nombre: form.nombre,
        descripcion: form.descripcion,
        precio_mensual: form.precio_mensual,
        precio_anual: form.precio_anual,
        precio_excedente: form.precio_excedente,
        limite_ilimitado: form.limite_ilimitado,
        limite_documentos_mes: form.limite_ilimitado ? undefined : form.limite_documentos_mes,
        usuarios_ilimitados: form.usuarios_ilimitados,
        max_usuarios: form.usuarios_ilimitados ? undefined : form.max_usuarios,
        features: Array.from(form.features),
        activo: form.activo,
      }),
    onSuccess: () => {
      toast.success(`Plan ${form.nombre} actualizado`)
      qc.invalidateQueries({ queryKey: ['master', 'subscriptions'] })
      qc.invalidateQueries({ queryKey: ['plans'] })
      qc.invalidateQueries({ queryKey: ['master', 'plans-admin'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const numInput = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  return (
    <Card padding>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BadgeDollarSign size={16} className="text-emerald-600" />
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-emerald-400 focus:outline-none"
          />
          <Badge variant="gray">{plan.codigo}</Badge>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="rounded" />
          Activo
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Precio mensual (COP)
          <input type="number" value={form.precio_mensual} onChange={(e) => setForm({ ...form, precio_mensual: Number(e.target.value) })} className={numInput} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Precio anual (COP)
          <input type="number" value={form.precio_anual} onChange={(e) => setForm({ ...form, precio_anual: Number(e.target.value) })} className={numInput} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Cupo facturas DIAN / mes
          <input type="number" disabled={form.limite_ilimitado} value={form.limite_documentos_mes} onChange={(e) => setForm({ ...form, limite_documentos_mes: Number(e.target.value) })} className={`${numInput} disabled:opacity-40`} />
          <label className="flex items-center gap-1 mt-1 cursor-pointer">
            <input type="checkbox" checked={form.limite_ilimitado} onChange={(e) => setForm({ ...form, limite_ilimitado: e.target.checked })} className="rounded" /> Ilimitado
          </label>
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Precio excedente (COP c/u)
          <input type="number" value={form.precio_excedente} onChange={(e) => setForm({ ...form, precio_excedente: Number(e.target.value) })} className={numInput} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Máx. usuarios
          <input type="number" disabled={form.usuarios_ilimitados} value={form.max_usuarios} onChange={(e) => setForm({ ...form, max_usuarios: Number(e.target.value) })} className={`${numInput} disabled:opacity-40`} />
          <label className="flex items-center gap-1 mt-1 cursor-pointer">
            <input type="checkbox" checked={form.usuarios_ilimitados} onChange={(e) => setForm({ ...form, usuarios_ilimitados: e.target.checked })} className="rounded" /> Ilimitado
          </label>
        </label>
      </div>

      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Beneficios incluidos</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FEATURE_CATALOGO.map((f) => {
          const on = form.features.has(f.key)
          return (
            <button
              key={f.key}
              onClick={() => toggleFeature(f.key)}
              className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                on
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700'
              }`}
            >
              {on ? '✓ ' : '+ '}{f.label}
            </button>
          )
        })}
      </div>

      <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} icon={<BadgeDollarSign size={14} />}>
        Guardar cambios
      </Button>
    </Card>
  )
}

function PlanesEditor() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['master', 'plans-admin'],
    queryFn: subsApi.plansAdmin,
    staleTime: 30_000,
  })
  if (isLoading) return <div className="grid sm:grid-cols-2 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
  if (error != null) return <EmptyState icon={<AlertCircle size={32} className="text-red-400" />} title="Error" description={apiError(error)} />
  return (
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Cambia precios y beneficios cuando quieras. Los cambios aplican de inmediato a tu página pública de planes y al próximo cobro de cada cliente.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(data ?? []).map((p) => <PlanEditorCard key={p.id} plan={p} />)}
      </div>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = 'cuentas' | 'movimientos' | 'planes'

export default function MasterSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('cuentas')
  const [search, setSearch] = useState('')
  const [soloProblemas, setSoloProblemas] = useState(false)
  const [promoRow, setPromoRow] = useState<SubRow | null>(null)
  const [historialRow, setHistorialRow] = useState<SubRow | null>(null)
  const [planRow, setPlanRow] = useState<SubRow | null>(null)

  const { data: rows, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['master', 'subscriptions'],
    queryFn: subsApi.list,
    staleTime: 30_000,
  })
  const { data: metrics } = useQuery({
    queryKey: ['master', 'subscriptions', 'metrics'],
    queryFn: subsApi.metrics,
    staleTime: 30_000,
  })

  const filtered = (rows ?? []).filter((r) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.admin_email.toLowerCase().includes(q) ||
      r.admin_nombre.toLowerCase().includes(q) ||
      (r.razon_social ?? '').toLowerCase().includes(q)
    const matchProblema = !soloProblemas || ['PAST_DUE', 'SUSPENDED'].includes(r.estado)
    return matchSearch && matchProblema
  })

  return (
    <div>
      <PageHeader
        title="Suscripciones y pagos"
        subtitle="Tu negocio SaaS de un vistazo: quién paga, quién está en mora y promos"
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
        }
      />

      {metrics && <MetricsBar m={metrics} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 dark:border-gray-700">
        {([
          { id: 'cuentas', label: 'Cuentas', icon: <Users size={15} /> },
          { id: 'movimientos', label: 'Movimientos (pagos)', icon: <History size={15} /> },
          { id: 'planes', label: 'Planes y precios', icon: <BadgeDollarSign size={15} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'movimientos' && <MovimientosPanel />}
      {tab === 'planes' && <PlanesEditor />}

      {tab === 'cuentas' && isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}

      {tab === 'cuentas' && error != null && (
        <EmptyState
          icon={<AlertCircle size={32} className="text-red-400" />}
          title="Error al cargar suscripciones"
          description={apiError(error)}
        />
      )}

      {tab === 'cuentas' && rows && (
        <>
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar negocio o email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soloProblemas}
                onChange={(e) => setSoloProblemas(e.target.checked)}
                className="rounded"
              />
              Solo en mora o bloqueadas
            </label>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={32} className="text-gray-300" />}
              title="Sin resultados"
              description={
                soloProblemas
                  ? '¡Buenas noticias! Nadie está en mora ni bloqueado.'
                  : 'Ningún cliente coincide con la búsqueda.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((row) => (
                <SubCard
                  key={row.admin_id}
                  row={row}
                  onPromo={() => setPromoRow(row)}
                  onHistorial={() => setHistorialRow(row)}
                  onPlan={() => setPlanRow(row)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {promoRow && <PromoModal row={promoRow} onClose={() => setPromoRow(null)} />}
      {historialRow && <HistorialModal row={historialRow} onClose={() => setHistorialRow(null)} />}
      {planRow && <CambiarPlanModal row={planRow} onClose={() => setPlanRow(null)} />}
    </div>
  )
}
