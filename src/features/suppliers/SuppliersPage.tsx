import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Plus, Truck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Table, Th, Td, Spinner, EmptyState,
  Modal, ConfirmDialog,
} from '@/shared/components/ui'
import Can from '@/shared/components/Can'
import { apiError } from '@/shared/lib/apiError'
import { proveedoresApi } from './api'
import type { CreateProveedorDto } from './api'
import type { Proveedor } from '@/shared/types'

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<{ id: number } & FormData | null>(null)
  const [deleteSupplier, setDeleteSupplier] = useState<Proveedor | null>(null)

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => proveedoresApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: proveedoresApi.create,
    onSuccess: (newProv) => {
      qc.setQueryData(['suppliers'], (old: Proveedor[] | undefined) =>
        old ? [...old, newProv] : [newProv]
      )
      toast.success('Proveedor creado')
      setShowCreate(false)
    },
    onError: (err) => toast.error(apiError(err, 'Error al crear proveedor')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateProveedorDto> }) => proveedoresApi.update(id, dto),
    onSuccess: (updated) => {
      qc.setQueryData(['suppliers'], (old: Proveedor[] | undefined) =>
        old ? old.map((p) => p.id === updated.id ? updated : p) : old
      )
      toast.success('Proveedor actualizado')
      setEditItem(null)
    },
    onError: (err) => toast.error(apiError(err, 'Error al actualizar')),
  })

  const deleteMutation = useMutation({
    mutationFn: proveedoresApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['suppliers'] })
      const prev = qc.getQueryData(['suppliers'])
      qc.setQueryData(['suppliers'], (old: Proveedor[] | undefined) =>
        old ? old.filter((p) => p.id !== id) : old
      )
      return { prev }
    },
    onError: (err, _id, ctx) => {
      qc.setQueryData(['suppliers'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar'))
    },
    onSuccess: () => { toast.success('Proveedor eliminado'); setDeleteSupplier(null) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })

  return (
    <div>
      <PageHeader
        title="Proveedores"
        actions={
          <Can permission="proveedores:create">
            <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Nuevo proveedor</Button>
          </Can>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : proveedores.length === 0 ? (
        <EmptyState icon={<Truck size={40} />} title="Sin proveedores" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th className="hidden sm:table-cell">Teléfono</Th>
                <Th className="hidden md:table-cell">Email</Th>
                <Th className="hidden lg:table-cell">Ciudad</Th>
                <Th className="hidden xl:table-cell">Dirección</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <Td>
                    <div>
                      <span className="font-medium text-slate-800">{p.nombre}</span>
                      <span className="sm:hidden block text-xs text-slate-400 mt-0.5">{p.telefono ?? p.email ?? ''}</span>
                    </div>
                  </Td>
                  <Td className="hidden sm:table-cell">{p.telefono ?? '—'}</Td>
                  <Td className="hidden md:table-cell">{p.email ?? '—'}</Td>
                  <Td className="hidden lg:table-cell">{(p as any).ciudad ?? '—'}</Td>
                  <Td className="hidden xl:table-cell">{p.direccion ?? '—'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Can permission="proveedores:update">
                        <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => setEditItem({ id: p.id, nombre: p.nombre, telefono: p.telefono ?? '', email: p.email ?? '', direccion: p.direccion ?? '', ciudad: (p as any).ciudad ?? '' })} />
                      </Can>
                      <Can permission="proveedores:delete">
                        <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDeleteSupplier(p)} className="text-red-500 hover:text-red-700" />
                      </Can>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ProveedorModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(dto) => createMutation.mutate(dto)}
        loading={createMutation.isPending}
        title="Nuevo proveedor"
      />

      {editItem && (
        <ProveedorModal
          open={!!editItem}
          onClose={() => setEditItem(null)}
          defaultValues={editItem}
          onSubmit={(dto) => updateMutation.mutate({ id: editItem.id, dto })}
          loading={updateMutation.isPending}
          title="Editar proveedor"
        />
      )}

      <ConfirmDialog
        open={!!deleteSupplier}
        title="Eliminar proveedor"
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Se eliminará el proveedor del sistema. Las compras asociadas no se verán afectadas.</p>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nombre</span>
                <span className="font-medium">{deleteSupplier?.nombre}</span>
              </div>
              {deleteSupplier?.email && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium">{deleteSupplier.email}</span>
                </div>
              )}
              {(deleteSupplier as any)?.ciudad && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ciudad</span>
                  <span className="font-medium">{(deleteSupplier as any).ciudad}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-red-600 font-medium">Esta acción no se puede deshacer.</p>
          </div>
        }
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteSupplier && deleteMutation.mutate(deleteSupplier.id)}
        onCancel={() => setDeleteSupplier(null)}
      />
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  defaultValues?: Partial<FormData>
  onSubmit: (dto: CreateProveedorDto) => void
  loading: boolean
  title: string
}

function ProveedorModal({ open, onClose, defaultValues, onSubmit, loading, title }: ModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      telefono: defaultValues?.telefono ?? '',
      email: defaultValues?.email ?? '',
      direccion: defaultValues?.direccion ?? '',
      ciudad: (defaultValues as any)?.ciudad ?? '',
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>Guardar</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Nombre *" {...register('nombre')} error={errors.nombre?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono" {...register('telefono')} />
          <Input label="Ciudad" {...register('ciudad')} placeholder="Medellín" />
        </div>
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Dirección" {...register('direccion')} />
      </form>
    </Modal>
  )
}
