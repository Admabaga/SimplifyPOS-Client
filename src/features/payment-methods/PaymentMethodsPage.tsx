import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Plus, CreditCard, Banknote, Smartphone, ArrowUpDown } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Card, Spinner, EmptyState,
  Modal, ConfirmDialog,
} from '@/shared/components/ui'
import Can from '@/shared/components/Can'
import { apiError } from '@/shared/lib/apiError'
import { mediosPagoApi, type CreateMedioPagoDto, type UpdateMedioPagoDto } from './api'
import type { MedioPago } from '@/shared/types'

const TIPOS = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: <Banknote size={14} /> },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Smartphone size={14} /> },
  { value: 'TARJETA', label: 'Tarjeta', icon: <CreditCard size={14} /> },
]

const tipoLabel = (tipo?: string) => TIPOS.find((t) => t.value === tipo)?.label ?? tipo ?? '—'
const tipoIcon = (tipo?: string) => TIPOS.find((t) => t.value === tipo)?.icon ?? <CreditCard size={14} />

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  comision_porcentaje: z.number().min(0).max(100),
  tipo: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']),
  activo: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

export default function PaymentMethodsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<MedioPago | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: medios = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: mediosPagoApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: mediosPagoApi.create,
    onSuccess: (newMedio) => {
      qc.setQueryData(['payment-methods'], (old: MedioPago[] | undefined) =>
        old ? [...old, newMedio] : [newMedio]
      )
      toast.success('Medio de pago creado')
      setShowCreate(false)
    },
    onError: (err) => toast.error(apiError(err, 'Error al crear')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateMedioPagoDto }) =>
      mediosPagoApi.update(id, dto),
    onSuccess: (updated) => {
      qc.setQueryData(['payment-methods'], (old: MedioPago[] | undefined) =>
        old ? old.map((m) => m.id === updated.id ? updated : m) : old
      )
      toast.success('Actualizado')
      setEditItem(null)
    },
    onError: (err) => toast.error(apiError(err, 'Error al actualizar')),
  })

  const deleteMutation = useMutation({
    mutationFn: mediosPagoApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['payment-methods'] })
      const prev = qc.getQueryData(['payment-methods'])
      qc.setQueryData(['payment-methods'], (old: MedioPago[] | undefined) =>
        old ? old.filter((m) => m.id !== id) : old
      )
      return { prev }
    },
    onError: (err, _id, ctx) => {
      qc.setQueryData(['payment-methods'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar'))
    },
    onSuccess: () => { toast.success('Eliminado'); setDeleteId(null) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  })

  const activosMedios = medios.filter((m) => m.activo)
  const inactivosMedios = medios.filter((m) => !m.activo)

  return (
    <div>
      <PageHeader
        title="Medios de pago"
        subtitle={`${activosMedios.length} activo${activosMedios.length !== 1 ? 's' : ''}`}
        actions={
          <Can permission="medios_pago:create">
            <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              Nuevo medio
            </Button>
          </Can>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : medios.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={40} />}
          title="Sin medios de pago"
          description="Agrega efectivo, transferencias o tarjetas"
        />
      ) : (
        <div className="space-y-6">
          {/* Activos */}
          {activosMedios.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Activos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activosMedios.map((mp) => (
                  <MedioPagoCard
                    key={mp.id}
                    mp={mp}
                    onEdit={() => setEditItem(mp)}
                    onDelete={() => setDeleteId(mp.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactivos */}
          {inactivosMedios.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Inactivos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactivosMedios.map((mp) => (
                  <MedioPagoCard
                    key={mp.id}
                    mp={mp}
                    onEdit={() => setEditItem(mp)}
                    onDelete={() => setDeleteId(mp.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal crear */}
      <MedioPagoModal
        open={showCreate}
        title="Nuevo medio de pago"
        onClose={() => setShowCreate(false)}
        onSubmit={(dto) => createMutation.mutate({ nombre: dto.nombre, comision_porcentaje: dto.comision_porcentaje, tipo: dto.tipo })}
        loading={createMutation.isPending}
      />

      {/* Modal editar */}
      {editItem && (
        <MedioPagoModal
          open={!!editItem}
          title="Editar medio de pago"
          defaultValues={{
            nombre: editItem.nombre,
            comision_porcentaje: parseFloat(editItem.comision_porcentaje as string) || 0,
            tipo: editItem.tipo,
          }}
          onClose={() => setEditItem(null)}
          onSubmit={(dto) => updateMutation.mutate({ id: editItem.id, dto: { nombre: dto.nombre, comision_porcentaje: dto.comision_porcentaje, tipo: dto.tipo } })}
          loading={updateMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar medio de pago"
        message="¿Eliminar este medio de pago? Se desactivará si hay pagos asociados."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

function MedioPagoCard({ mp, onEdit, onDelete }: {
  mp: MedioPago
  onEdit: () => void
  onDelete: () => void
}) {
  const comision = parseFloat(mp.comision_porcentaje as string) || 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl t-bg-xlt t-text shrink-0">
            {tipoIcon(mp.tipo)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{mp.nombre}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <ArrowUpDown size={10} />
                {comision > 0 ? `${comision}% comisión` : 'Sin comisión'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Can permission="medios_pago:update">
            <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={onEdit} />
          </Can>
          <Can permission="medios_pago:delete">
            <Button
              size="sm" variant="ghost"
              icon={<Trash2 size={14} />}
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            />
          </Can>
        </div>
      </div>
    </Card>
  )
}

interface ModalProps {
  open: boolean
  title: string
  defaultValues?: Partial<FormData>
  onClose: () => void
  onSubmit: (dto: FormData) => void
  loading: boolean
}

function MedioPagoModal({ open, title, defaultValues, onClose, onSubmit, loading }: ModalProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      comision_porcentaje: defaultValues?.comision_porcentaje ?? 0,
      tipo: defaultValues?.tipo ?? 'EFECTIVO',
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}>Guardar</Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input label="Nombre *" {...register('nombre')} error={errors.nombre?.message} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => field.onChange(t.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-colors ${
                      field.value === t.value
                        ? 't-border t-bg-xlt t-text-dk'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <Input
          label="Comisión"
          type="number"
          step="0.01"
          min="0"
          max="100"
          suffix="%"
          {...register('comision_porcentaje', { valueAsNumber: true })}
          error={errors.comision_porcentaje?.message}
          helper="0 = sin comisión"
        />
      </form>
    </Modal>
  )
}
