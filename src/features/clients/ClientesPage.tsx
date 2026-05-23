/**
 * ClientesPage — directorio fiscal de clientes por tenant.
 *
 * - Lista con tabs Activos / Todos
 * - Clientes genéricos destacados (badge especial)
 * - CRUD completo (crear, editar, desactivar)
 * - Seed automático de genéricos si la lista está vacía
 * - Búsqueda por nombre o documento
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, Plus, Pencil, PowerOff, AlertCircle, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Select, Modal, Badge, Spinner, EmptyState,
  Table, Th, Td, SearchInput, ConfirmDialog, TabBar, InfoBanner,
} from '@/shared/components/ui'
import Can from '@/shared/components/Can'
import { formatDate } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import { clientesApi, type ClienteDto } from './api'
import type { Cliente } from '@/shared/types'

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre_fiscal: z.string().min(2, 'Mínimo 2 caracteres').max(300),
  tipo_doc: z.enum(['CC', 'NIT', 'CE', 'PA', 'TI']).optional(),
  documento: z.string().max(30).optional(),
  direccion: z.string().max(300).optional(),
  telefono: z.string().max(60).optional(),
  email: z.string().email('Email inválido').max(200).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

type FilterTab = 'activos' | 'todos'

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const qc = useQueryClient()
  const [tab, setTab]           = useState<FilterTab>('activos')
  const [search, setSearch]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]   = useState<Cliente | null>(null)
  const [disabling, setDisabling] = useState<Cliente | null>(null)

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clients', tab],
    queryFn: () => clientesApi.getAll(tab === 'activos'),
  })

  // Seed genéricos automáticamente cuando no haya clientes activos
  const seedMutation = useMutation({
    mutationFn: clientesApi.seedGenericos,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      if (created.length > 0) toast.success(`${created.length} clientes genéricos creados`)
    },
    onError: (err: unknown) => toast.error(apiError(err)),
  })

  useEffect(() => {
    if (!isLoading && clientes.length === 0 && tab === 'activos') {
      seedMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, clientes.length])

  const filtered = useMemo(() => {
    if (!search) return clientes
    const q = search.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nombre_fiscal.toLowerCase().includes(q) ||
        (c.documento ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [clientes, search])

  const activos = clientes.filter((c) => c.activo).length
  const genericos = clientes.filter((c) => c.es_generico).length

  const tabItems = [
    { key: 'activos' as FilterTab, label: 'Activos', count: activos },
    { key: 'todos'   as FilterTab, label: 'Todos',   count: clientes.length },
  ]

  function onCreated(c: Cliente) {
    qc.setQueryData(['clients', 'activos'], (old: Cliente[] | undefined) =>
      old ? [...old, c] : [c],
    )
    qc.invalidateQueries({ queryKey: ['clients'] })
    setShowCreate(false)
    toast.success('Cliente creado')
  }

  function onUpdated(c: Cliente) {
    qc.invalidateQueries({ queryKey: ['clients'] })
    setEditing(null)
    toast.success('Cliente actualizado')
  }

  const disableMutation = useMutation({
    mutationFn: (id: number) => clientesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setDisabling(null)
      toast.success('Cliente desactivado')
    },
    onError: (err: unknown) => toast.error(apiError(err)),
  })

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Directorio fiscal — se usa al crear cuentas y generar facturas automáticamente"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => seedMutation.mutate()}
              loading={seedMutation.isPending}
              title="Crea Consumidor Final y Cliente Genérico NIT si no existen"
            >
              Inicializar genéricos
            </Button>
            <Can permission="cuentas:create">
              <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
                Nuevo cliente
              </Button>
            </Can>
          </div>
        }
      />

      {/* ── Info banner ──────────────────────────────────────────────────────── */}
      {genericos > 0 && (
        <div className="mb-4">
          <InfoBanner icon={<ShieldCheck size={15} />} variant="info">
            Los clientes <strong>genéricos</strong> (Consumidor Final, Cliente NIT) sirven para
            emitir FACTURA_VENTA cuando el cliente final no proporciona sus datos. No se pueden
            editar ni eliminar.
          </InfoBanner>
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-4">
        <TabBar tabs={tabItems} active={tab} onChange={setTab} />
        <div className="w-full sm:max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar nombre o documento…" />
        </div>
      </div>

      {/* ── Tabla ─────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title={search ? 'Sin resultados' : 'Sin clientes'}
          description={
            search
              ? `No hay clientes que coincidan con "${search}"`
              : 'Crea tu primer cliente o inicializa los genéricos'
          }
          action={
            !search && (
              <Can permission="cuentas:create">
                <Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Nuevo cliente</Button>
              </Can>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nombre fiscal</Th>
                <Th>Doc.</Th>
                <Th className="hidden sm:table-cell">Teléfono</Th>
                <Th className="hidden md:table-cell">Email</Th>
                <Th className="hidden md:table-cell">Creación</Th>
                <Th>Estado</Th>
                <Th className="text-right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-slate-50 transition-colors hover:bg-slate-50/60 ${!c.activo ? 'opacity-50' : ''}`}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{c.nombre_fiscal}</p>
                        {c.tipo_doc && c.documento && (
                          <p className="text-xs text-slate-400">{c.tipo_doc} {c.documento}</p>
                        )}
                      </div>
                      {c.es_generico && (
                        <Badge variant="purple" dot>Genérico</Badge>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {c.tipo_doc && c.documento ? (
                      <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
                        {c.tipo_doc} {c.documento}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </Td>
                  <Td className="hidden sm:table-cell text-sm text-slate-600">
                    {c.telefono ?? <span className="text-slate-300">—</span>}
                  </Td>
                  <Td className="hidden md:table-cell text-sm text-slate-600">
                    {c.email ?? <span className="text-slate-300">—</span>}
                  </Td>
                  <Td className="hidden md:table-cell text-sm text-slate-400">
                    {formatDate(c.fecha_creacion)}
                  </Td>
                  <Td>
                    <Badge variant={c.activo ? 'green' : 'gray'} dot>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    {!c.es_generico && c.activo && (
                      <div className="flex justify-end gap-1">
                        <Can permission="cuentas:create">
                          <button
                            onClick={() => setEditing(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        </Can>
                        <Can permission="cuentas:delete">
                          <button
                            onClick={() => setDisabling(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Desactivar"
                          >
                            <PowerOff size={14} />
                          </button>
                        </Can>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── Modales ───────────────────────────────────────────────────────────── */}
      <ClienteFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={onCreated}
      />

      {editing && (
        <ClienteFormModal
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={onUpdated}
          inicial={editing}
        />
      )}

      <ConfirmDialog
        open={!!disabling}
        title="Desactivar cliente"
        message={`¿Desactivar a "${disabling?.nombre_fiscal}"? No aparecerá en la lista de selección, pero sus datos históricos se conservan.`}
        confirmLabel="Desactivar"
        danger
        loading={disableMutation.isPending}
        onConfirm={() => disabling && disableMutation.mutate(disabling.id)}
        onCancel={() => setDisabling(null)}
      />
    </div>
  )
}

// ─── ClienteFormModal ────────────────────────────────────────────────────────

interface FormModalProps {
  open: boolean
  onClose: () => void
  onSaved: (c: Cliente) => void
  inicial?: Cliente
}

function ClienteFormModal({ open, onClose, onSaved, inicial }: FormModalProps) {
  const isEdit = !!inicial
  const [showSnapshotBanner, setShowSnapshotBanner] = useState(
    !isEdit && !localStorage.getItem('snapshot_banner_dismissed'),
  )
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre_fiscal: inicial?.nombre_fiscal ?? '',
      tipo_doc: (inicial?.tipo_doc as FormData['tipo_doc']) ?? undefined,
      documento: inicial?.documento ?? '',
      direccion: inicial?.direccion ?? '',
      telefono: inicial?.telefono ?? '',
      email: inicial?.email ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        nombre_fiscal: inicial?.nombre_fiscal ?? '',
        tipo_doc: (inicial?.tipo_doc as FormData['tipo_doc']) ?? undefined,
        documento: inicial?.documento ?? '',
        direccion: inicial?.direccion ?? '',
        telefono: inicial?.telefono ?? '',
        email: inicial?.email ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(data: FormData) {
    const dto: ClienteDto = {
      nombre_fiscal: data.nombre_fiscal,
      tipo_doc: data.tipo_doc ?? null,
      documento: data.documento || null,
      direccion: data.direccion || null,
      telefono: data.telefono || null,
      email: data.email || null,
    }
    try {
      const saved = isEdit
        ? await clientesApi.update(inicial!.id, dto)
        : await clientesApi.create(dto)
      onSaved(saved)
    } catch (err: unknown) {
      toast.error(apiError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && showSnapshotBanner && (
          <InfoBanner icon={<AlertCircle size={15} />} variant="info">
            <span className="flex items-start justify-between gap-2">
              <span>
                Estos datos se copiarán como snapshot al crear la cuenta. Si el cliente cambia
                sus datos, las cuentas anteriores conservan el snapshot original.
              </span>
              <button
                type="button"
                className="shrink-0 text-blue-400 hover:text-blue-600 mt-0.5"
                aria-label="Cerrar aviso"
                onClick={() => {
                  localStorage.setItem('snapshot_banner_dismissed', '1')
                  setShowSnapshotBanner(false)
                }}
              >
                ✕
              </button>
            </span>
          </InfoBanner>
        )}

        <Input
          label="Nombre / Razón social *"
          {...register('nombre_fiscal')}
          error={errors.nombre_fiscal?.message}
          placeholder="Juan García / Empresa SAS"
          autoFocus
        />

        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Tipo doc"
            {...register('tipo_doc')}
            options={[
              { value: '', label: 'Seleccionar' },
              { value: 'CC', label: 'C.C.' },
              { value: 'NIT', label: 'NIT' },
              { value: 'CE', label: 'C.E.' },
              { value: 'PA', label: 'Pasaporte' },
              { value: 'TI', label: 'T.I.' },
            ]}
          />
          <div className="col-span-2">
            <Input
              label="Número de documento"
              {...register('documento')}
              error={errors.documento?.message}
              placeholder="1020304050"
            />
          </div>
        </div>

        <Input
          label="Dirección"
          {...register('direccion')}
          placeholder="Calle 45 # 10-20, Medellín"
        />

        <div className="grid grid-cols-2 gap-2">
          <Input label="Teléfono" {...register('telefono')} placeholder="3001234567" />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
