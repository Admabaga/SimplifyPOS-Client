/**
 * MovimientosPanel — Sangrías, ingresos extra y devoluciones del turno.
 *
 * UX:
 *  - Botón prominente "+ Nuevo movimiento" abre modal con 3 tipos en chips grandes.
 *  - Cada tipo tiene color e ícono propios para reducir errores.
 *  - Lista con totales por tipo y delta en efectivo (− / +).
 *  - Eliminar permitido sólo mientras la sesión esté abierta.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowDownToLine, ArrowUpFromLine, Undo2, Plus, Trash2, Receipt, Banknote,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Modal, ConfirmDialog, NumberInput } from '@/shared/components/ui'
import { formatCOP, formatDateTime } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { cajaApi, type MovimientoCaja, type TipoMovimientoCaja } from '../api'

const schema = z.object({
  tipo: z.enum(['SANGRIA', 'INGRESO', 'DEVOLUCION']),
  monto: z.number().int().positive('El monto debe ser positivo'),
  motivo: z.string().min(3, 'Mínimo 3 caracteres').max(500),
  referencia: z.string().max(200).optional(),
})
type Form = z.infer<typeof schema>

interface Props {
  sesionId: number
  sesionAbierta: boolean
}

// Metadata visual por tipo
const TIPO_META: Record<TipoMovimientoCaja, {
  label: string
  hint: string
  icon: React.ReactNode
  ringBg: string       // borde + bg del chip seleccionado
  text: string         // color del texto
  badge: string        // badge en la lista
  signo: '+' | '−'
}> = {
  SANGRIA: {
    label: 'Retiro',
    hint: 'Retiro de efectivo de la caja (caja fuerte, depósito al banco)',
    icon: <ArrowUpFromLine size={18} />,
    ringBg: 'border-orange-400 bg-orange-50 ring-2 ring-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    signo: '−',
  },
  INGRESO: {
    label: 'Ingreso',
    hint: 'Entrada extra (préstamo del dueño, cambio, vuelto)',
    icon: <ArrowDownToLine size={18} />,
    ringBg: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    signo: '+',
  },
  DEVOLUCION: {
    label: 'Devolución',
    hint: 'Refund a un cliente que pagó en efectivo',
    icon: <Undo2 size={18} />,
    ringBg: 'border-rose-400 bg-rose-50 ring-2 ring-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    signo: '−',
  },
}

export default function MovimientosPanel({ sesionId, sesionAbierta }: Props) {
  const qc = useQueryClient()
  const [showCrear, setShowCrear] = useState(false)
  const [confirmDel, setConfirmDel] = useState<MovimientoCaja | null>(null)

  const { data: movimientos = [], isLoading } = useQuery({
    queryKey: ['caja', 'movimientos', sesionId],
    queryFn: () => cajaApi.listarMovimientos(sesionId),
    refetchInterval: 60_000,
  })

  const crear = useMutation({
    mutationFn: (dto: Form) => cajaApi.crearMovimiento(sesionId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caja', 'movimientos', sesionId] })
      qc.invalidateQueries({ queryKey: ['caja', 'resumen', sesionId] })
      toast.success('Movimiento registrado')
      setShowCrear(false)
    },
    onError: (e) => toast.error(apiError(e, 'Error al registrar movimiento')),
  })

  const eliminar = useMutation({
    mutationFn: (movId: number) => cajaApi.eliminarMovimiento(sesionId, movId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caja', 'movimientos', sesionId] })
      qc.invalidateQueries({ queryKey: ['caja', 'resumen', sesionId] })
      toast.success('Movimiento eliminado')
      setConfirmDel(null)
    },
    onError: (e) => toast.error(apiError(e, 'No se pudo eliminar')),
  })

  // Totales por tipo
  const totales = movimientos.reduce(
    (acc, m) => {
      acc[m.tipo] = (acc[m.tipo] || 0) + m.monto
      return acc
    },
    {} as Record<TipoMovimientoCaja, number>
  )

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote size={15} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Movimientos de caja</h2>
          {movimientos.length > 0 && (
            <span className="text-[11px] text-slate-400">({movimientos.length})</span>
          )}
        </div>
        {sesionAbierta && (
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowCrear(true)}>
            Nuevo movimiento
          </Button>
        )}
      </div>

      {/* Totales rápidos por tipo */}
      {movimientos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TIPO_META) as TipoMovimientoCaja[]).map((t) => {
            const meta = TIPO_META[t]
            const total = totales[t] || 0
            return (
              <div
                key={t}
                className={`rounded-xl border p-3 ${total > 0 ? meta.badge : 'bg-white border-slate-100 text-slate-400'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={total > 0 ? meta.text : 'text-slate-400'}>{meta.icon}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wide">{meta.label}</span>
                </div>
                <p className="text-sm font-bold tabular-nums">
                  {meta.signo} {formatCOP(total)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
      ) : movimientos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <Receipt size={22} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Sin movimientos en este turno</p>
          {sesionAbierta && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Registra retiros, ingresos extra o devoluciones de efectivo aquí
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {movimientos.map((m) => {
            const meta = TIPO_META[m.tipo]
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className={`p-2 rounded-lg shrink-0 ${meta.badge.replace('text-', 'bg-').replace('-700', '-100')}`}>
                  <span className={meta.text}>{meta.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-700 font-medium truncate">{m.motivo}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateTime(m.created_at)} · {m.nombre_creado_por}
                    {m.referencia && ` · Ref: ${m.referencia}`}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${meta.text} shrink-0`}>
                  {meta.signo} {formatCOP(m.monto)}
                </span>
                {sesionAbierta && (
                  <button
                    type="button"
                    onClick={() => setConfirmDel(m)}
                    className="p-1.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear */}
      <CrearMovimientoModal
        open={showCrear}
        onClose={() => setShowCrear(false)}
        onSubmit={(dto) => crear.mutate(dto)}
        loading={crear.isPending}
      />

      <ConfirmDialog
        open={confirmDel !== null}
        title="Eliminar movimiento"
        message={
          confirmDel
            ? `¿Eliminar el ${TIPO_META[confirmDel.tipo].label.toLowerCase()} de ${formatCOP(confirmDel.monto)}? Esta acción es reversible mientras la caja siga abierta.`
            : ''
        }
        confirmLabel="Eliminar"
        danger
        loading={eliminar.isPending}
        onConfirm={() => confirmDel && eliminar.mutate(confirmDel.id)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}

// ─── Modal: crear movimiento ────────────────────────────────────────────────

function CrearMovimientoModal({
  open, onClose, onSubmit, loading,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dto: Form) => void
  loading: boolean
}) {
  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'SANGRIA', monto: 0, motivo: '', referencia: '' },
  })
  const tipoSel = watch('tipo')

  const reseteo = () => {
    reset({ tipo: 'SANGRIA', monto: 0, motivo: '', referencia: '' })
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reseteo() }}
      title="Nuevo movimiento de caja"
      footer={
        <>
          <Button variant="secondary" onClick={() => { onClose(); reseteo() }}>Cancelar</Button>
          <Button
            loading={loading}
            onClick={handleSubmit((d) => { onSubmit(d); reseteo() })}
          >
            Registrar
          </Button>
        </>
      }
    >
      <form className="space-y-4">
        {/* Selector de tipo — chips grandes con ícono */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
            Tipo de movimiento
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(TIPO_META) as TipoMovimientoCaja[]).map((t) => {
              const meta = TIPO_META[t]
              const active = tipoSel === t
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setValue('tipo', t, { shouldValidate: true })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    active ? meta.ringBg : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={active ? meta.text : 'text-slate-400'}>{meta.icon}</span>
                  <span className={`text-xs font-semibold ${active ? meta.text : 'text-slate-600'}`}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {t === 'INGRESO' ? 'Entra efectivo' : 'Sale efectivo'}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{TIPO_META[tipoSel].hint}</p>
        </div>

        {/* Monto */}
        <Controller
          name="monto"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Monto *"
              prefix="$"
              placeholder="0"
              value={field.value || ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '')
                field.onChange(raw ? parseInt(raw, 10) : 0)
              }}
              onBlur={field.onBlur}
              error={errors.monto?.message}
            />
          )}
        />

        {/* Motivo */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Motivo <span className="text-red-500">*</span>
          </label>
          <input
            {...register('motivo')}
            placeholder={
              tipoSel === 'SANGRIA'
                ? 'Ej: Llevar a caja fuerte / Depósito en banco'
                : tipoSel === 'INGRESO'
                ? 'Ej: Préstamo del dueño / Cambio inicial'
                : 'Ej: Cliente devolvió producto X (cuenta #123)'
            }
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
          />
          {errors.motivo && <p className="text-xs text-red-600 mt-1">{errors.motivo.message}</p>}
        </div>

        {/* Referencia opcional */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Referencia <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            {...register('referencia')}
            placeholder="# de cuenta, recibo, etc."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none"
          />
        </div>

        {/* Resumen */}
        <div className={`rounded-xl p-3 ${TIPO_META[tipoSel].badge}`}>
          <p className="text-[11px] uppercase tracking-wide font-medium opacity-75">Impacto en caja</p>
          <p className="text-base font-bold tabular-nums">
            {TIPO_META[tipoSel].signo} {formatCOP(watch('monto') || 0)}
          </p>
        </div>
      </form>
    </Modal>
  )
}
