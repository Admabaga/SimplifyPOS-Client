/**
 * Master — Suscripciones
 *
 * Es la contabilidad del SaaS: quién paga, quién dejó de pagar y qué se hace
 * al respecto. Tenía dos problemas de fondo.
 *
 * El primero: clases `dark:` por todos lados, que ninguna otra pantalla de la
 * app usa. Media hoja de código muerto que además dejaba dos verdades sobre
 * cada color.
 *
 * El segundo, el que sí se nota al trabajar: las cuentas eran tarjetas de tres
 * columnas. Con cincuenta clientes, encontrar al que está en mora obliga a
 * leer tarjeta por tarjeta, porque la misma cifra queda en un sitio distinto
 * en cada una. Ahora es padrón —igual que Negocios— ordenado por urgencia: lo
 * bloqueado arriba, lo que está al día abajo, y el filete sólo lleva color
 * cuando hay algo que mirar.
 *
 * Las cinco cifras de la cabecera se leen como el encabezado de un informe, no
 * como cinco tarjetas con su ícono de color: el ícono no aportaba nada que la
 * etiqueta no dijera ya.
 */
import { useMemo, useState } from 'react'
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
  Users,
  X,
} from 'lucide-react'
import {
  Button,
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
import { Cifra, Cifras, Papel, Rotulo } from './components/consola'

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

// ─── Estados ──────────────────────────────────────────────────────────────────

/**
 * `orden` es la urgencia con la que hay que mirar cada estado: manda el orden
 * del padrón. `filete` sólo lleva color cuando dice algo — pintar de verde al
 * que está al día hace que el ojo deje de distinguir la excepción.
 */
const ESTADO_UI: Record<
  string,
  { label: string; hint: string; orden: number; filete: string; texto: string; apagada?: boolean }
> = {
  SUSPENDED: {
    label: 'Bloqueada',
    hint: 'Sin acceso hasta que pague (o la reactives tú).',
    orden: 0,
    filete: 'bg-rose-500',
    texto: 'text-rose-700',
  },
  PAST_DUE: {
    label: 'En mora',
    hint: 'El cobro falló; sigue operando unos días con aviso.',
    orden: 1,
    filete: 'bg-amber-500',
    texto: 'text-amber-700',
  },
  TRIALING: {
    label: 'En prueba',
    hint: 'Mes de prueba gratis activo.',
    orden: 2,
    filete: 'bg-slate-300',
    texto: 'text-slate-500',
  },
  CANCELED: {
    label: 'Cancelada',
    hint: 'El cliente canceló su suscripción.',
    orden: 3,
    filete: 'bg-slate-200',
    texto: 'text-slate-400',
    apagada: true,
  },
  ACTIVE: {
    label: 'Al día',
    hint: 'Pagó y puede usar todo.',
    orden: 4,
    filete: 'bg-slate-200',
    texto: 'text-slate-400',
  },
}

const estadoDe = (estado: string) =>
  ESTADO_UI[estado] ?? {
    label: estado,
    hint: '',
    orden: 5,
    filete: 'bg-slate-200',
    texto: 'text-slate-400',
  }

function fecha(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fechaHora(d: string): string {
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const nombreDe = (r: SubRow) => r.razon_social?.trim() || r.admin_nombre

// ─── Cabecera de cifras ───────────────────────────────────────────────────────

function Cabecera({ m }: { m: SaasMetrics }) {
  const enProblema = (m.por_estado['PAST_DUE'] ?? 0) + (m.por_estado['SUSPENDED'] ?? 0)
  return (
    <Papel className="p-5">
      <Cifras>
        <Cifra
          valor={formatCOP(m.mrr)}
          etiqueta="Ingreso mensual"
          nota="lo que factura la base al día"
        />
        <Cifra
          valor={formatCOP(m.ingresos_mes)}
          etiqueta="Cobrado este mes"
          nota={`${m.cobros_aprobados_mes} cobro(s) aprobado(s)`}
        />
        <Cifra
          valor={String(m.total_tenants)}
          etiqueta="Clientes"
          nota={`${m.por_estado['ACTIVE'] ?? 0} al día · ${enProblema} con problema`}
        />
        <Cifra
          valor={formatCOP(m.total_rechazado_mes)}
          etiqueta="Rechazado este mes"
          tono={m.total_rechazado_mes > 0 ? 'red' : 'neutro'}
          nota={`${m.cobros_rechazados_mes} fallido(s) · ${m.cuentas_bloqueadas} bloqueada(s)`}
        />
        <Cifra
          valor={String(m.trials_por_vencer)}
          etiqueta="Pruebas por vencer"
          tono={m.trials_por_vencer > 0 ? 'yellow' : 'neutro'}
          nota="terminan en los próximos 7 días"
        />
      </Cifras>
    </Papel>
  )
}

// ─── Campos de formulario (mismo trazo en todos los modales) ──────────────────

const campo =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-slate-900/10'

const etiqueta = 'mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500'

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
          ? `Regalaste ${dias} días a ${nombreDe(row)}`
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

  const opcion = (activa: boolean) =>
    `flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
      activa
        ? 'border-[var(--t-primary)] t-bg-lt font-semibold text-slate-900'
        : 'border-slate-200 text-slate-600 hover:border-slate-300'
    }`

  return (
    <Modal open onClose={onClose} title={`Dar promoción · ${nombreDe(row)}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTipo('dias')} className={opcion(tipo === 'dias')}>
            <CalendarPlus size={15} className="text-slate-400" />
            Días gratis
          </button>
          <button
            type="button"
            onClick={() => setTipo('descuento')}
            className={opcion(tipo === 'descuento')}
          >
            <Percent size={15} className="text-slate-400" />
            Descuento
          </button>
        </div>

        {tipo === 'dias' ? (
          <div>
            <p className="mb-2 text-sm text-slate-600">
              Extiende el servicio sin cobro. Si la cuenta está bloqueada o en mora,
              <strong className="font-semibold text-slate-800"> se reactiva al instante</strong>.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {presetsDias.map((p) => (
                <button
                  key={p.d}
                  type="button"
                  onClick={() => setDias(p.d)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    dias === p.d
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className={etiqueta}>Días (personalizado)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className={`${campo} num w-32`}
            />
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-600">
              Resta este valor del{' '}
              <strong className="font-semibold text-slate-800">siguiente cobro</strong> del cliente
              {row.monto_proximo_cobro != null && (
                <> (hoy sería {formatCOP(row.monto_proximo_cobro)})</>
              )}
              .
            </p>
            <label className={etiqueta}>Valor del descuento (COP)</label>
            <input
              type="number"
              min={1}
              step={1000}
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className={`${campo} num w-44`}
            />
          </div>
        )}

        <div>
          <label className={etiqueta}>Motivo (queda en la auditoría)</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: promo de lanzamiento, compensación…"
            className={campo}
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

  return (
    <Modal open onClose={onClose} title={`Pagos · ${nombreDe(row)}`}>
      {isLoading && <Skeleton className="h-24 rounded-lg" />}
      {data && data.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">Aún no hay cobros registrados.</p>
      )}
      {data && data.length > 0 && (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {data.map((tx) => {
            const ui = TX_UI[tx.estado] ?? { label: tx.estado, texto: 'text-slate-500' }
            return (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="num text-sm font-semibold text-slate-900">
                    {formatCOP(tx.monto)}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      · {tx.concepto.toLowerCase()} {tx.ciclo.toLowerCase()}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {fecha(tx.created_at)} {tx.mensaje && `· ${tx.mensaje}`}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] ${ui.texto}`}>
                  {ui.label}
                </span>
              </li>
            )
          })}
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
    <Modal open onClose={onClose} title={`Cambiar plan · ${nombreDe(row)}`}>
      <div className="space-y-3">
        {(plans ?? []).map((p) => (
          <button
            key={p.codigo}
            type="button"
            onClick={() => setCodigo(p.codigo)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              codigo === p.codigo
                ? 'border-[var(--t-primary)] t-bg-lt'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">{p.nombre}</span>
              <span className="num text-sm text-slate-600">{formatCOP(p.precio_mensual)}/mes</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
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
          className={campo}
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

// ─── Fila del padrón de cuentas ───────────────────────────────────────────────

function Fila({ row, onPromo, onHistorial, onPlan }: {
  row: SubRow
  onPromo: () => void
  onHistorial: () => void
  onPlan: () => void
}) {
  const qc = useQueryClient()
  const ui = estadoDe(row.estado)
  const bloqueada = row.estado === 'SUSPENDED' || row.estado === 'PAST_DUE'
  const [confirmar, setConfirmar] = useState(false)

  const toggle = useMutation({
    mutationFn: () =>
      bloqueada
        ? subsApi.reactivate(row.admin_id, 'desbloqueo manual desde panel master')
        : subsApi.suspend(row.admin_id, 'bloqueo manual desde panel master'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', 'subscriptions'] })
      toast.success(bloqueada ? 'Cuenta desbloqueada' : 'Cuenta bloqueada')
      setConfirmar(false)
    },
    onError: (err) => { toast.error(apiError(err)); setConfirmar(false) },
  })

  const accion =
    'rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-600 ' +
    'transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900'

  return (
    <tr className={`group transition-colors hover:bg-slate-50/80 ${ui.apagada ? 'opacity-55' : ''}`}>
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-7 w-[3px] shrink-0 rounded-full ${ui.filete}`} title={ui.hint} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-slate-900">{nombreDe(row)}</p>
              <span
                className={`shrink-0 text-[9.5px] font-bold uppercase tracking-[0.1em] ${ui.texto}`}
                title={ui.hint}
              >
                {ui.label}
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-400">{row.admin_email}</p>
          </div>
        </div>
      </td>

      <td className="px-3 text-[11.5px] text-slate-500">
        {row.plan_nombre ?? '—'}
        <span className="text-slate-400"> · {row.ciclo.toLowerCase()}</span>
      </td>

      <td className="px-3 text-right text-[12px]">
        <span className="num text-slate-700">
          {row.documentos_usados}
          {row.documentos_limite != null && (
            <span className="text-slate-400">/{row.documentos_limite}</span>
          )}
        </span>
        {row.excedente_acumulado > 0 && (
          <p className="num text-[10px] text-amber-700">
            +{formatCOP(row.excedente_acumulado)} exced.
          </p>
        )}
      </td>

      <td className="px-3 text-right text-[12px]">
        <span className="num font-semibold text-slate-700">
          {row.monto_proximo_cobro != null ? formatCOP(row.monto_proximo_cobro) : '—'}
        </span>
        <p className="num text-[10px] text-slate-400">{fecha(row.proximo_cobro)}</p>
        {row.descuento_proximo_cobro > 0 && (
          <p className="num text-[10px] text-emerald-700">
            −{formatCOP(row.descuento_proximo_cobro)} promo
          </p>
        )}
      </td>

      <td className="px-3 text-[11.5px]">
        {row.tiene_metodo_pago ? (
          <span className="flex items-center gap-1 text-slate-500">
            <CreditCard size={11} className="shrink-0 text-slate-400" />
            <span className="num truncate">
              {row.metodo_brand ?? 'Tarjeta'} ••{row.metodo_last4 ?? ''}
            </span>
          </span>
        ) : (
          <span className="text-amber-700">Sin tarjeta</span>
        )}
      </td>

      <td className="py-2.5 pl-3 pr-4">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onPromo} className={accion} title="Dar días o descuento">
            Promo
          </button>
          <button type="button" onClick={onHistorial} className={accion} title="Historial de pagos">
            Pagos
          </button>
          <button type="button" onClick={onPlan} className={accion} title="Cambiar de plan">
            Plan
          </button>
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            disabled={toggle.isPending}
            title={bloqueada ? 'Desbloquear acceso' : 'Bloquear acceso'}
            className={`rounded-lg p-1.5 transition-colors ${
              bloqueada
                ? 'text-emerald-600 hover:bg-emerald-50'
                : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            {bloqueada ? <LockOpen size={12} /> : <Lock size={12} />}
          </button>
        </div>

        <ConfirmDialog
          open={confirmar}
          onCancel={() => setConfirmar(false)}
          onConfirm={() => toggle.mutate()}
          title={bloqueada ? 'Desbloquear cuenta' : 'Bloquear cuenta'}
          message={bloqueada
            ? `¿Reactivar la suscripción de ${nombreDe(row)}? Recuperarán acceso inmediato.`
            : `¿Suspender la cuenta de ${nombreDe(row)}? Perderán acceso hasta que paguen o los reactives.`}
          confirmLabel={bloqueada ? 'Desbloquear' : 'Bloquear'}
          danger={!bloqueada}
          loading={toggle.isPending}
        />
      </td>
    </tr>
  )
}

// ─── Padrón de cuentas ────────────────────────────────────────────────────────

function PanelCuentas({
  onPromo,
  onHistorial,
  onPlan,
}: {
  onPromo: (r: SubRow) => void
  onHistorial: (r: SubRow) => void
  onPlan: (r: SubRow) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [soloProblemas, setSoloProblemas] = useState(false)

  const { data: rows, isLoading, error } = useQuery({
    queryKey: ['master', 'subscriptions'],
    queryFn: subsApi.list,
    staleTime: 30_000,
  })

  /** Urgencia primero; dentro del mismo estado, primero el que más plata mueve. */
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (rows ?? [])
      .filter((r) => {
        const coincide =
          !q ||
          r.admin_email.toLowerCase().includes(q) ||
          r.admin_nombre.toLowerCase().includes(q) ||
          (r.razon_social ?? '').toLowerCase().includes(q)
        return coincide && (!soloProblemas || ['PAST_DUE', 'SUSPENDED'].includes(r.estado))
      })
      .sort((a, b) => {
        const d = estadoDe(a.estado).orden - estadoDe(b.estado).orden
        return d !== 0 ? d : (b.monto_proximo_cobro ?? 0) - (a.monto_proximo_cobro ?? 0)
      })
  }, [rows, busqueda, soloProblemas])

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />
  if (error != null)
    return (
      <EmptyState
        icon={<AlertCircle size={30} className="text-rose-400" />}
        title="Error al cargar suscripciones"
        description={apiError(error)}
      />
    )

  const total = rows?.length ?? 0

  return (
    <div>
      <Rotulo
        contador={filtradas.length === total ? undefined : `${filtradas.length} de ${total}`}
        accion={
          <label className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={soloProblemas}
              onChange={(e) => setSoloProblemas(e.target.checked)}
              className="h-3 w-3 rounded border-slate-300"
            />
            Solo en mora o bloqueadas
          </label>
        }
      >
        Cuentas
      </Rotulo>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar negocio o correo…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm focus:outline-none"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <EmptyState
          icon={<Users size={30} className="text-slate-300" />}
          title="Sin resultados"
          description={
            soloProblemas
              ? 'Nadie está en mora ni bloqueado.'
              : 'Ningún cliente coincide con la búsqueda.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
                  <th className="py-2 pl-4 pr-3 text-left font-semibold">Cliente</th>
                  <th className="px-3 text-left font-semibold">Plan</th>
                  <th className="px-3 text-right font-semibold">FE del periodo</th>
                  <th className="px-3 text-right font-semibold">Próximo cobro</th>
                  <th className="px-3 text-left font-semibold">Método</th>
                  <th className="py-2 pl-3 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtradas.map((row) => (
                  <Fila
                    key={row.admin_id}
                    row={row}
                    onPromo={() => onPromo(row)}
                    onHistorial={() => onHistorial(row)}
                    onPlan={() => onPlan(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-[10.5px] text-slate-400">
        Ordenado por urgencia: primero lo bloqueado, después la mora y al final lo que está al día.
        Bloquear no borra nada — el cliente pierde el acceso hasta que pague o lo reactives.
      </p>
    </div>
  )
}

// ─── Movimientos globales ─────────────────────────────────────────────────────

const TX_UI: Record<string, { label: string; texto: string }> = {
  APPROVED: { label: 'Aprobado', texto: 'text-emerald-700' },
  DECLINED: { label: 'Rechazado', texto: 'text-rose-700' },
  ERROR:    { label: 'Error', texto: 'text-rose-700' },
  PENDING:  { label: 'Pendiente', texto: 'text-amber-700' },
  VOIDED:   { label: 'Anulado', texto: 'text-slate-500' },
}

function MovimientosPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['master', 'subscriptions', 'movimientos'],
    queryFn: subsApi.movimientos,
    staleTime: 20_000,
  })

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />
  if (error != null)
    return (
      <EmptyState
        icon={<AlertCircle size={30} className="text-rose-400" />}
        title="Error"
        description={apiError(error)}
      />
    )
  if (!data || data.length === 0)
    return (
      <EmptyState
        icon={<History size={30} className="text-slate-300" />}
        title="Aún no hay pagos"
        description="Cuando tus clientes paguen, verás aquí cada cobro."
      />
    )

  return (
    <div>
      <Rotulo contador={data.length}>Movimientos</Rotulo>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[9.5px] uppercase tracking-[0.12em] text-slate-400">
                <th className="py-2 pl-4 pr-3 text-left font-semibold">Fecha</th>
                <th className="px-3 text-left font-semibold">Cliente</th>
                <th className="px-3 text-left font-semibold">Concepto</th>
                <th className="px-3 text-right font-semibold">Monto</th>
                <th className="px-3 text-left font-semibold">Estado</th>
                <th className="py-2 pl-3 pr-4 text-left font-semibold">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((mv) => {
                const ui = TX_UI[mv.estado] ?? { label: mv.estado, texto: 'text-slate-500' }
                return (
                  <tr key={mv.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="num whitespace-nowrap py-2.5 pl-4 pr-3 text-[11.5px] text-slate-500">
                      {fechaHora(mv.created_at)}
                    </td>
                    <td className="px-3">
                      <p className="text-[12.5px] font-semibold leading-tight text-slate-900">
                        {mv.admin_nombre}
                      </p>
                      <p className="text-[11px] text-slate-400">{mv.admin_email}</p>
                    </td>
                    <td className="px-3 text-[11.5px] capitalize text-slate-600">
                      {mv.concepto.toLowerCase()}
                    </td>
                    <td className="num whitespace-nowrap px-3 text-right text-[12px] font-semibold text-slate-800">
                      {formatCOP(mv.monto)}
                    </td>
                    <td className="px-3">
                      <span className={`text-[9.5px] font-bold uppercase tracking-[0.1em] ${ui.texto}`}>
                        {ui.label}
                      </span>
                      {mv.mensaje && mv.estado !== 'APPROVED' && (
                        <p className="max-w-44 truncate text-[10.5px] text-slate-400" title={mv.mensaje}>
                          {mv.mensaje}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-[11.5px] text-slate-500">
                      {mv.metodo ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[10.5px] text-slate-400">
        Últimos 150 cobros de toda la plataforma, del más reciente al más antiguo.
      </p>
    </div>
  )
}

// ─── Editor de planes ─────────────────────────────────────────────────────────

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

  const num = `${campo} num px-2.5 py-1.5`

  return (
    <div className={`rounded-xl border bg-white p-5 ${form.activo ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            aria-label="Nombre del plan"
            className="min-w-0 border-b border-transparent bg-transparent font-display text-[17px] font-semibold text-slate-900 focus:border-slate-300 focus:outline-none"
          />
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
            {plan.codigo}
          </span>
        </div>
        <label className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[11px] text-slate-500">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            className="h-3 w-3 rounded border-slate-300"
          />
          Activo
        </label>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <label>
          <span className={etiqueta}>Precio mensual (COP)</span>
          <input
            type="number"
            value={form.precio_mensual}
            onChange={(e) => setForm({ ...form, precio_mensual: Number(e.target.value) })}
            className={num}
          />
        </label>
        <label>
          <span className={etiqueta}>Precio anual (COP)</span>
          <input
            type="number"
            value={form.precio_anual}
            onChange={(e) => setForm({ ...form, precio_anual: Number(e.target.value) })}
            className={num}
          />
        </label>
        <div>
          <span className={etiqueta}>Cupo facturas DIAN / mes</span>
          <input
            type="number"
            disabled={form.limite_ilimitado}
            value={form.limite_documentos_mes}
            aria-label="Cupo de facturas DIAN por mes"
            onChange={(e) => setForm({ ...form, limite_documentos_mes: Number(e.target.value) })}
            className={`${num} disabled:opacity-40`}
          />
          <label className="mt-1 flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={form.limite_ilimitado}
              onChange={(e) => setForm({ ...form, limite_ilimitado: e.target.checked })}
              className="h-3 w-3 rounded border-slate-300"
            />
            Ilimitado
          </label>
        </div>
        <label>
          <span className={etiqueta}>Precio excedente (COP c/u)</span>
          <input
            type="number"
            value={form.precio_excedente}
            onChange={(e) => setForm({ ...form, precio_excedente: Number(e.target.value) })}
            className={num}
          />
        </label>
        <div>
          <span className={etiqueta}>Máx. usuarios</span>
          <input
            type="number"
            disabled={form.usuarios_ilimitados}
            value={form.max_usuarios}
            aria-label="Máximo de usuarios"
            onChange={(e) => setForm({ ...form, max_usuarios: Number(e.target.value) })}
            className={`${num} disabled:opacity-40`}
          />
          <label className="mt-1 flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={form.usuarios_ilimitados}
              onChange={(e) => setForm({ ...form, usuarios_ilimitados: e.target.checked })}
              className="h-3 w-3 rounded border-slate-300"
            />
            Ilimitado
          </label>
        </div>
      </div>

      <p className={etiqueta}>Beneficios incluidos</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FEATURE_CATALOGO.map((f) => {
          const on = form.features.has(f.key)
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleFeature(f.key)}
              aria-pressed={on}
              className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                on
                  ? 'border-[var(--t-primary)] t-bg-lt t-text-dk'
                  : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>
        Guardar cambios
      </Button>
    </div>
  )
}

function PlanesEditor() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['master', 'plans-admin'],
    queryFn: subsApi.plansAdmin,
    staleTime: 30_000,
  })

  if (isLoading)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
      </div>
    )
  if (error != null)
    return (
      <EmptyState
        icon={<AlertCircle size={30} className="text-rose-400" />}
        title="Error"
        description={apiError(error)}
      />
    )

  return (
    <div>
      <Rotulo contador={data?.length}>Planes y precios</Rotulo>
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((p) => <PlanEditorCard key={p.id} plan={p} />)}
      </div>
      <p className="mt-3 text-[10.5px] text-slate-400">
        Los cambios aplican de inmediato a la página pública de planes y al próximo cobro de cada
        cliente. Nadie que ya pagó este periodo se ve afectado hasta su siguiente renovación.
      </p>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

type Tab = 'cuentas' | 'movimientos' | 'planes'

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'cuentas', label: 'Cuentas', icon: Users },
  { id: 'movimientos', label: 'Movimientos', icon: History },
  { id: 'planes', label: 'Planes', icon: BadgeDollarSign },
]

export default function MasterSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('cuentas')
  const [promoRow, setPromoRow] = useState<SubRow | null>(null)
  const [historialRow, setHistorialRow] = useState<SubRow | null>(null)
  const [planRow, setPlanRow] = useState<SubRow | null>(null)

  const qc = useQueryClient()
  const { data: metrics, isFetching } = useQuery({
    queryKey: ['master', 'subscriptions', 'metrics'],
    queryFn: subsApi.metrics,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-7">
      <PageHeader
        subtitle="El negocio SaaS: quién paga, quién está en mora y qué se le da a quién"
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => qc.invalidateQueries({ queryKey: ['master', 'subscriptions'] })}
          >
            Actualizar
          </Button>
        }
      />

      {metrics && <Cabecera m={metrics} />}

      {/* Pestañas en versalitas: el subrayado marca dónde estás sin gastar color. */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const Icono = t.icon
          const activa = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                activa
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icono size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'cuentas' && (
        <PanelCuentas onPromo={setPromoRow} onHistorial={setHistorialRow} onPlan={setPlanRow} />
      )}
      {tab === 'movimientos' && <MovimientosPanel />}
      {tab === 'planes' && <PlanesEditor />}

      {promoRow && <PromoModal row={promoRow} onClose={() => setPromoRow(null)} />}
      {historialRow && <HistorialModal row={historialRow} onClose={() => setHistorialRow(null)} />}
      {planRow && <CambiarPlanModal row={planRow} onClose={() => setPlanRow(null)} />}
    </div>
  )
}
