import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  UserPlus, Lock, Unlock, Trash2, Key, Copy, CheckCircle2,
  User, Shield,
} from 'lucide-react'
import { usuariosApi } from './api'
import { rolesApi } from '../roles/api'
import {
  Button, Card, PageHeader, Table, Th, Td, Badge,
  Modal, ConfirmDialog, Input, Spinner, EmptyState, SearchInput,
} from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { useAuthStore } from '@/stores/auth'
import type { Usuario } from '@/shared/types'

// ── Schemas ────────────────────────────────────────────────────────────────────

const crearSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email:  z.string().email('Email inválido'),
  role_id: z.coerce.number().min(1, 'Selecciona un rol'),
})
type CrearForm = z.infer<typeof crearSchema>

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { variant: 'purple' | 'blue' | 'green' | 'yellow'; label: string }> = {
  master:     { variant: 'purple', label: 'Master' },
  admin:      { variant: 'blue',   label: 'Admin' },
  supervisor: { variant: 'green',  label: 'Supervisor' },
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const isMaster = me?.role === 'master'

  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null)
  const [confirmReset, setConfirmReset] = useState<Usuario | null>(null)
  const [tempResult, setTempResult] = useState<{ nombre: string; email: string; password: string } | null>(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usuariosApi.list(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  })

  // Roles que puede asignar según su propio rol
  const rolesPermitidos = useMemo(() => {
    const sinMaster = roles.filter((r) => r.name.toLowerCase() !== 'master')
    if (isMaster) return sinMaster
    // admin: solo supervisor; si no encuentra por nombre exacto, excluye master y admin como fallback
    const soloSupervisor = sinMaster.filter((r) => r.name.toLowerCase() === 'supervisor')
    return soloSupervisor.length > 0 ? soloSupervisor : sinMaster.filter((r) => r.name.toLowerCase() !== 'admin')
  }, [roles, isMaster])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CrearForm>({
    resolver: zodResolver(crearSchema) as unknown as Resolver<CrearForm>,
  })

  // Crear usuario — el backend genera contraseña temporal automáticamente
  const createMut = useMutation({
    mutationFn: (data: CrearForm) => usuariosApi.create(data),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      reset()
      setTempResult({
        nombre: vars.nombre,
        email:  vars.email,
        password: res.temp_password ?? '(ver con el admin)',
      })
      toast.success('Usuario creado')
    },
    onError: (err) => toast.error(apiError(err, 'Error al crear usuario')),
  })

  const lockMut = useMutation({
    mutationFn: ({ id, lock }: { id: number; lock: boolean }) =>
      lock ? usuariosApi.lock(id) : usuariosApi.unlock(id),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(v.lock ? 'Usuario bloqueado' : 'Usuario desbloqueado')
    },
    onError: (err) => toast.error(apiError(err, 'Error al cambiar estado del usuario')),
  })

  const deleteMut = useMutation({
    mutationFn: usuariosApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setConfirmDelete(null)
      toast.success('Usuario eliminado')
    },
    onError: (err) => toast.error(apiError(err, 'Error al eliminar')),
  })

  const resetMut = useMutation({
    mutationFn: usuariosApi.resetPassword,
    onSuccess: (data, id) => {
      const u = users.find((x) => x.id === id)
      setConfirmReset(null)
      setTempResult({
        nombre:   u?.nombre ?? '',
        email:    u?.email ?? '',
        password: data.temp_password,
      })
      toast.success('Contraseña reseteada')
    },
    onError: (err) => toast.error(apiError(err, 'Error al resetear contraseña')),
  })

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter((u) =>
      u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle={isMaster ? 'Gestión de cuentas de acceso' : 'Crea y gestiona supervisores'}
        actions={
          <Button icon={<UserPlus size={14} />} onClick={() => setShowCreate(true)}>
            Nuevo usuario
          </Button>
        }
      />

      {/* Search */}
      <div className="mb-4 max-w-xs">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o email..." />
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<User size={36} />}
            title={search ? 'Sin resultados' : 'Sin usuarios'}
            description={search ? `No hay coincidencias para "${search}"` : 'Crea el primer usuario del equipo'}
            action={
              !search && (
                <Button icon={<UserPlus size={14} />} onClick={() => setShowCreate(true)}>
                  Nuevo usuario
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th className="hidden sm:table-cell">Rol</Th>
                <Th className="hidden sm:table-cell">Estado</Th>
                <Th className="hidden md:table-cell">Creado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rolConf = ROLE_LABELS[u.role_name] ?? { variant: 'green' as const, label: u.role_name }
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full t-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{u.nombre}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          {/* Mobile role */}
                          <div className="sm:hidden mt-0.5">
                            <Badge variant={rolConf.variant}>{rolConf.label}</Badge>
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Badge variant={rolConf.variant}>
                        <Shield size={10} className="mr-1" />
                        {rolConf.label}
                      </Badge>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <Badge variant={u.activo ? 'green' : 'red'} dot>
                          {u.activo ? 'Activo' : 'Bloqueado'}
                        </Badge>
                        {u.must_change_password && (
                          <span className="text-[10px] text-orange-500">Debe cambiar contraseña</span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-xs text-slate-400 hidden md:table-cell">{formatDate(u.created_at)}</Td>
                    <Td>
                      <div className="flex gap-1 items-center">
                        {u.role_name !== 'master' && (
                          <button
                            title={u.activo ? 'Bloquear' : 'Desbloquear'}
                            onClick={() => lockMut.mutate({ id: u.id, lock: u.activo })}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.activo
                                ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                                : 't-text hover:t-bg-xlt'
                            }`}
                          >
                            {u.activo ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        )}
                        <button
                          title="Resetear contraseña"
                          onClick={() => setConfirmReset(u)}
                          className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500 transition-colors"
                        >
                          <Key size={14} />
                        </button>
                        {u.role_name !== 'master' && isMaster && (
                          <button
                            title="Eliminar usuario"
                            onClick={() => setConfirmDelete(u)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* ── Modal crear usuario ──────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset() }}
        title="Nuevo usuario"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset() }}>Cancelar</Button>
            <Button
              loading={createMut.isPending}
              icon={<UserPlus size={14} />}
              onClick={handleSubmit((d) => createMut.mutate(d))}
            >
              Crear y enviar acceso
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre completo *"
            placeholder="Ej: María García"
            autoFocus
            {...register('nombre')}
            error={errors.nombre?.message}
          />
          <Input
            label="Correo electrónico *"
            type="email"
            placeholder="usuario@correo.com"
            {...register('email')}
            error={errors.email?.message}
          />

          {/* Rol */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Rol *</label>
            <select
              {...register('role_id')}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white"
            >
              <option value="">-- Selecciona un rol --</option>
              {rolesPermitidos.map((r) => (
                <option key={r.id} value={r.id}>
                  {ROLE_LABELS[r.name.toLowerCase()]?.label ?? r.name}
                </option>
              ))}
            </select>
            {errors.role_id && <p className="text-xs text-red-600">{String(errors.role_id.message)}</p>}
          </div>

          <p className="text-xs text-slate-400 pt-0.5">
            Se generará una contraseña temporal. El usuario deberá cambiarla al primer ingreso.
          </p>
        </div>
      </Modal>

      {/* ── Contraseña temporal generada ────────────────────────────────── */}
      <Modal
        open={!!tempResult}
        onClose={() => setTempResult(null)}
        title="Usuario creado — acceso temporal"
        size="sm"
        footer={<Button onClick={() => setTempResult(null)}>Listo</Button>}
      >
        {tempResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 t-bg-xlt border t-border-lt rounded-xl">
              <CheckCircle2 size={16} className="t-text shrink-0" />
              <p className="text-sm t-text-dk font-medium">
                Cuenta creada para <strong>{tempResult.nombre}</strong>
              </p>
            </div>

            <p className="text-sm text-slate-600">
              Comparte estos datos con el usuario. Deberá cambiar la contraseña al primer ingreso.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Correo</p>
                  <p className="text-sm font-mono text-slate-700">{tempResult.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                <div>
                  <p className="text-[10px] text-amber-600 uppercase tracking-wide font-semibold">Contraseña temporal</p>
                  <p className="text-base font-mono font-bold text-amber-800 tracking-widest">{tempResult.password}</p>
                </div>
                <button
                  onClick={() => handleCopy(tempResult.password)}
                  className="p-2 hover:bg-amber-100 rounded-lg transition-colors text-amber-600"
                  title="Copiar"
                >
                  {copied ? <CheckCircle2 size={15} className="t-text" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        title="Eliminar usuario"
        message={`¿Eliminar a ${confirmDelete?.nombre}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMut.isPending}
      />

      <ConfirmDialog
        open={!!confirmReset}
        onCancel={() => setConfirmReset(null)}
        onConfirm={() => confirmReset && resetMut.mutate(confirmReset.id)}
        title="Resetear contraseña"
        message={`¿Resetear la contraseña de ${confirmReset?.nombre}? Se generará una temporal.`}
        confirmLabel="Resetear"
        loading={resetMut.isPending}
      />
    </div>
  )
}
