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
})
type FormData = z.infer<typeof schema>

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<{ id: number } & FormData | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

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
    onSuccess: () => { toast.success('Proveedor eliminado'); setDeleteId(null) },
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
        <Table>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th>Email</Th>
              <Th>Dirección</Th>
              <Th>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td className="font-medium">{p.nombre}</Td>
                <Td>{p.telefono ?? '—'}</Td>
                <Td>{p.email ?? '—'}</Td>
                <Td>{p.direccion ?? '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Can permission="proveedores:update">
                      <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => setEditItem({ id: p.id, nombre: p.nombre, telefono: p.telefono ?? '', email: p.email ?? '', direccion: p.direccion ?? '' })} />
                    </Can>
                    <Can permission="proveedores:delete">
                      <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDeleteId(p.id)} className="text-red-500 hover:text-red-700" />
                    </Can>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
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
        open={deleteId !== null}
        title="Eliminar proveedor"
        message="¿Eliminar este proveedor?"
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
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
        <Input label="Teléfono" {...register('telefono')} />
        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        <Input label="Dirección" {...register('direccion')} />
      </form>
    </Modal>
  )
}
