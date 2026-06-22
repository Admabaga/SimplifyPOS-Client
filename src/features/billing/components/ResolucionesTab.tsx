import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus, Power, Trash2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  Button, Card, Input, Select, Modal, Spinner, Badge, EmptyState,
  Table, Th, Td, ConfirmDialog,
} from '@/shared/components/ui'
import { billingApi } from '../api'
import type { ResolucionDian, ResolucionInput } from '../types'
import { apiError } from '@/shared/lib/apiError'
import { formatDate } from '@/shared/lib/formatters'

const schema = z.object({
  tipo_documento: z.enum(['FACTURA_VENTA']),
  numero_resolucion: z.string().min(1),
  fecha_resolucion: z.string().min(1),
  prefijo: z.string().max(10),
  rango_desde: z.coerce.number().min(1),
  rango_hasta: z.coerce.number().min(1),
  fecha_vigencia_desde: z.string().min(1),
  fecha_vigencia_hasta: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export default function ResolucionesTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteRes, setDeleteRes] = useState<ResolucionDian | null>(null)

  const { data: resoluciones = [], isLoading } = useQuery({
    queryKey: ['billing', 'resoluciones'],
    queryFn: billingApi.listResoluciones,
  })

  const createMutation = useMutation({
    mutationFn: (d: ResolucionInput) => billingApi.createResolucion(d),
    onSuccess: () => {
      toast.success('Resolución creada')
      qc.invalidateQueries({ queryKey: ['billing', 'resoluciones'] })
      setShowCreate(false)
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const activarMutation = useMutation({
    mutationFn: (id: number) => billingApi.activarResolucion(id),
    onSuccess: () => {
      toast.success('Resolución activada')
      qc.invalidateQueries({ queryKey: ['billing', 'resoluciones'] })
    },
    onError: (e) => toast.error(apiError(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billingApi.deleteResolucion(id),
    onSuccess: () => {
      toast.success('Resolución eliminada')
      qc.invalidateQueries({ queryKey: ['billing', 'resoluciones'] })
      setDeleteRes(null)
    },
    onError: (e) => toast.error(apiError(e)),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size={28} /></div>

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Resoluciones DIAN</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Numeración autorizada para documentos equivalentes POS y facturas de venta.
            </p>
          </div>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
            Nueva resolución
          </Button>
        </div>

        {resoluciones.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title="Sin resoluciones registradas"
            description="Agrega tu primera resolución DIAN para comenzar a emitir documentos fiscales."
          />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <thead>
                <tr>
                  <Th>Resolución</Th>
                  <Th className="hidden sm:table-cell">Prefijo · Rango</Th>
                  <Th className="hidden md:table-cell">Usados / Disp.</Th>
                  <Th className="hidden lg:table-cell">Vigencia</Th>
                  <Th>Estado</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {resoluciones.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <Td>
                      <div className="text-xs font-semibold">{r.numero_resolucion}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(r.fecha_resolucion)}</div>
                      <div className="sm:hidden text-[10px] text-slate-400 font-mono mt-0.5">{r.prefijo || '—'} · {r.rango_desde}-{r.rango_hasta}</div>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <div className="font-mono text-xs whitespace-nowrap">{r.prefijo || '—'} · {r.rango_desde} - {r.rango_hasta}</div>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <div className="text-xs tabular-nums">
                        <span className="text-slate-600">{r.consecutivo_actual - r.rango_desde}</span>
                        {' / '}
                        <span className="font-bold">{r.numeros_disponibles}</span>
                      </div>
                    </Td>
                    <Td className="hidden lg:table-cell">
                      <div className="text-[10px] text-slate-500 whitespace-nowrap">
                        {formatDate(r.fecha_vigencia_desde)} → {formatDate(r.fecha_vigencia_hasta)}
                      </div>
                    </Td>
                    <Td>
                      {r.activa ? (
                        <Badge variant="green" dot>Activa</Badge>
                      ) : !r.vigente ? (
                        <Badge variant="red" dot>Vencida</Badge>
                      ) : (
                        <Badge variant="gray" dot>Inactiva</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1 justify-end">
                        {!r.activa && r.vigente && r.numeros_disponibles > 0 && (
                          <Button
                            size="sm" variant="ghost" icon={<Power size={12} />}
                            onClick={() => activarMutation.mutate(r.id)}
                            loading={activarMutation.isPending}
                            title="Activar"
                          >
                            <span className="hidden sm:inline">Activar</span>
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" icon={<Trash2 size={12} />}
                          onClick={() => setDeleteRes(r)}
                          title="Eliminar"
                        />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <CreateResolucionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteRes}
        title="Eliminar resolución"
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Se eliminará esta resolución DIAN. No se puede deshacer si tiene tickets emitidos.</p>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Número</span>
                <span className="font-medium">{deleteRes?.numero_resolucion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prefijo</span>
                <span className="font-medium">{deleteRes?.prefijo || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rango</span>
                <span className="font-medium">{deleteRes?.rango_desde} – {deleteRes?.rango_hasta}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vigencia hasta</span>
                <span className="font-medium">{deleteRes ? formatDate(deleteRes.fecha_vigencia_hasta) : ''}</span>
              </div>
            </div>
            <p className="text-xs text-red-600 font-medium">Esta acción no se puede deshacer.</p>
          </div>
        }
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteRes && deleteMutation.mutate(deleteRes.id)}
        onCancel={() => setDeleteRes(null)}
      />
    </div>
  )
}

function CreateResolucionModal({
  open, onClose, onSubmit, loading,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (d: ResolucionInput) => void
  loading: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      tipo_documento: 'FACTURA_VENTA',
      fecha_resolucion: today,
      fecha_vigencia_desde: today,
      fecha_vigencia_hasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      prefijo: '',
      rango_desde: 1,
      rango_hasta: 1000,
    },
  })

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nueva resolución DIAN" size="lg">
      <form onSubmit={handleSubmit((d) => onSubmit(d))} className="space-y-3">
        <Select label="Tipo de documento" {...register('tipo_documento')} options={[
          { value: 'FACTURA_VENTA', label: 'Factura de venta' },
        ]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Número resolución" {...register('numero_resolucion')} error={errors.numero_resolucion?.message} placeholder="18764000001234" />
          <Input label="Fecha resolución" type="date" {...register('fecha_resolucion')} error={errors.fecha_resolucion?.message} />
          <Input label="Prefijo" {...register('prefijo')} placeholder="FE" />
          <div />
          <Input label="Rango desde" type="number" {...register('rango_desde')} error={errors.rango_desde?.message} />
          <Input label="Rango hasta" type="number" {...register('rango_hasta')} error={errors.rango_hasta?.message} />
          <Input label="Vigencia desde" type="date" {...register('fecha_vigencia_desde')} />
          <Input label="Vigencia hasta" type="date" {...register('fecha_vigencia_hasta')} />
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Crear</Button>
        </div>
      </form>
    </Modal>
  )
}
