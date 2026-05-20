import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Save, Shield, Trash2 } from 'lucide-react'
import { rolesApi } from './api'
import { apiError } from '@/shared/lib/apiError'
import {
  Button, Card, PageHeader, Badge, Modal, ConfirmDialog,
  Input, Spinner, EmptyState
} from '@/shared/components/ui'
import { clsx } from 'clsx'
import type { Rol } from '@/shared/types'

const crearSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  description: z.string().optional(),
})
type CrearForm = z.infer<typeof crearSchema>

export default function RolesPage() {
  const qc = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<Rol | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Rol | null>(null)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  })

  const { data: permCatalog } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.listPermissions(),
  })

  useEffect(() => {
    if (selectedRole) {
      setSelectedPerms(new Set(selectedRole.permissions ?? []))
    }
  }, [selectedRole])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CrearForm>({
    resolver: zodResolver(crearSchema),
  })

  const createMut = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setShowCreate(false); reset(); toast.success('Rol creado') },
    onError: (err) => toast.error(apiError(err, 'Error al crear rol')),
  })

  const setPermsMut = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      rolesApi.setPermissions(id, permissions),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Permisos guardados') },
    onError: (err) => toast.error(apiError(err, 'Error al guardar permisos')),
  })

  const deleteMut = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setConfirmDelete(null)
      if (selectedRole?.id === confirmDelete?.id) setSelectedRole(null)
      toast.success('Rol eliminado')
    },
    onError: (err) => toast.error(apiError(err, 'No se puede eliminar este rol')),
  })

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  const grouped = permCatalog?.grouped ?? {}

  return (
    <div>
      <PageHeader
        title="Roles & Permisos"
        subtitle="Gestión dinámica de roles y matriz de permisos"
        actions={<Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Nuevo rol</Button>}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de roles */}
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Roles del sistema</h3>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : roles.length === 0 ? (
            <EmptyState title="Sin roles" />
          ) : (
            <div className="space-y-1">
              {roles.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                    selectedRole?.id === role.id ? 't-bg text-white' : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Shield size={14} />
                    <span className="text-sm font-medium">{role.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {role.is_system && (
                      <Badge variant={selectedRole?.id === role.id ? 'gray' : 'green'} className="text-[10px]">sistema</Badge>
                    )}
                    {!role.is_system && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(role) }}
                        className={clsx('p-1 rounded', selectedRole?.id === role.id ? 'hover:t-bg text-white' : 'hover:bg-red-50 text-red-400')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Matriz de permisos */}
        <Card className="lg:col-span-2">
          {!selectedRole ? (
            <EmptyState icon={<Shield size={40} />} title="Selecciona un rol" description="Haz clic en un rol para editar sus permisos" />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedRole.name}</h3>
                  <p className="text-xs text-gray-400">{selectedRole.permissions.length} permisos activos · {selectedPerms.size} seleccionados</p>
                </div>
                <Button
                  icon={<Save size={14} />}
                  onClick={() => setPermsMut.mutate({ id: selectedRole.id, permissions: [...selectedPerms] })}
                  loading={setPermsMut.isPending}
                  disabled={selectedRole.is_system && selectedRole.name === 'master'}
                >
                  Guardar
                </Button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {Object.entries(grouped).map(([resource, perms]) => {
                  const all = (perms as string[]).every((p) => selectedPerms.has(p))
                  return (
                    <div key={resource} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 capitalize">{resource}</span>
                        <button
                          onClick={() => {
                            setSelectedPerms((prev) => {
                              const next = new Set(prev)
                              if (all) (perms as string[]).forEach((p) => next.delete(p))
                              else (perms as string[]).forEach((p) => next.add(p))
                              return next
                            })
                          }}
                          className="text-xs t-text hover:underline"
                        >
                          {all ? 'Quitar todos' : 'Marcar todos'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(perms as string[]).map((perm) => (
                          <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(perm)}
                              onChange={() => togglePerm(perm)}
                              disabled={selectedRole.is_system && selectedRole.name === 'master'}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-600">{perm.split(':')[1]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal crear rol */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset() }}
        title="Nuevo rol"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancelar</Button>
            <Button onClick={handleSubmit((d) => createMut.mutate(d))} loading={createMut.isPending}>Crear</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Nombre" {...register('name')} error={errors.name?.message} placeholder="ej: cajero" />
          <Input label="Descripción" {...register('description')} placeholder="Opcional" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        title="Eliminar rol"
        message={`¿Eliminar el rol "${confirmDelete?.name}"? Los usuarios con este rol quedarán sin acceso.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  )
}
