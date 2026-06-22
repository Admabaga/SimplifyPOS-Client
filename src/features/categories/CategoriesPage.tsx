/**
 * CategoriesPage — Gestión de categorías globales.
 *
 * Regla de negocio:
 *  - Categorías sin admin_id → globales para todos los tenants de SimplifyPOS.
 *  - Solo el master puede crear, editar o eliminar.
 *  - Todos los admins pueden leer (para asignarlas a productos).
 *  - El campo `iva` refleja la tarifa vigente en Colombia (Estatuto Tributario).
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Trash2, Plus, Tag, Info, ShieldAlert } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Card, Spinner, EmptyState,
  Modal, ConfirmDialog, InfoBanner, Select,
} from '@/shared/components/ui'
import Can from '@/shared/components/Can'
import { apiError } from '@/shared/lib/apiError'
import { useAuthStore } from '@/stores/auth'
import { categoriasApi } from './api'
import type { CreateCategoriaDto } from './api'
import type { Categoria } from '@/shared/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre:                     z.string().min(1, 'Requerido'),
  descripcion:                z.string().optional(),
  iva:                        z.coerce.number().int().min(0).max(100),
  codigo_ciiu:                z.string().optional(),
  codigo_arancelario_default: z.string().optional(),
})
type FormData = z.infer<typeof schema>

// ─── IVA badge ────────────────────────────────────────────────────────────────

function IvaBadge({ iva }: { iva: number }) {
  if (iva === 0)  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">0 % Exento</span>
  if (iva === 5)  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">5 % IVA</span>
  return             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{iva} % IVA</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const qc = useQueryClient()
  const role = useAuthStore((s) => s.user?.role)
  const isMaster = role === 'master'

  const [showCreate, setShowCreate] = useState(false)
  const [editItem,   setEditItem]   = useState<Categoria | null>(null)
  const [deleteCat,  setDeleteCat]  = useState<Categoria | null>(null)

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriasApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: categoriasApi.create,
    onSuccess: (newCat) => {
      qc.setQueryData(['categories'], (old: Categoria[] | undefined) =>
        old ? [...old, newCat] : [newCat]
      )
      toast.success('Categoría creada')
      setShowCreate(false)
    },
    onError: (err) => toast.error(apiError(err, 'Error al crear categoría')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateCategoriaDto> }) =>
      categoriasApi.update(id, dto),
    onSuccess: (updated) => {
      qc.setQueryData(['categories'], (old: Categoria[] | undefined) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : old
      )
      toast.success('Categoría actualizada')
      setEditItem(null)
    },
    onError: (err) => toast.error(apiError(err, 'Error al actualizar')),
  })

  const deleteMutation = useMutation({
    mutationFn: categoriasApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['categories'] })
      const prev = qc.getQueryData(['categories'])
      qc.setQueryData(['categories'], (old: Categoria[] | undefined) =>
        old ? old.filter((c) => c.id !== id) : old
      )
      return { prev }
    },
    onError: (err, _id, ctx) => {
      qc.setQueryData(['categories'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar'))
    },
    onSuccess: () => { toast.success('Categoría eliminada'); setDeleteCat(null) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  // Agrupar: 19% primero, luego 5%, luego 0%
  const sorted = [...categorias].sort((a, b) => b.iva - a.iva || a.nombre.localeCompare(b.nombre))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorías"
        subtitle="Categorías globales de SimplifyPOS con IVA según Estatuto Tributario colombiano"
        actions={
          <Can permission="categorias:create">
            <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
              Nueva categoría
            </Button>
          </Can>
        }
      />

      {/* Banner informativo para no-master */}
      {!isMaster && (
        <InfoBanner icon={<ShieldAlert size={16} />} variant="info">
          Las categorías son globales — las define el master de SimplifyPOS.
          Solo lectura para tu cuenta. IVA calculado automáticamente al facturar.
        </InfoBanner>
      )}

      {/* Banner explicativo IVA para master */}
      {isMaster && (
        <InfoBanner icon={<Info size={16} />} variant="info">
          Cada categoría define la tarifa IVA que se aplica a sus productos al emitir facturas.
          Tasas vigentes Colombia 2025: <strong>0%</strong> (canasta familiar, medicamentos, agua),
          <strong> 5%</strong> (algunos seguros), <strong>19%</strong> (tarifa general — art. 468 ET).
        </InfoBanner>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : categorias.length === 0 ? (
        <EmptyState icon={<Tag size={40} />} title="Sin categorías" description="Crea la primera categoría global" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Categoría</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium hidden sm:table-cell">Descripción</th>
                <th className="text-center py-2 px-3 text-slate-500 font-medium">IVA</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium hidden lg:table-cell">Arancel DIAN</th>
                {isMaster && <th className="py-2 px-3" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((cat) => (
                <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    <div>
                      <span>{cat.nombre}</span>
                      {cat.descripcion && (
                        <span className="sm:hidden block text-xs text-slate-400 mt-0.5 font-normal">{cat.descripcion}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs hidden sm:table-cell">{cat.descripcion ?? '—'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <IvaBadge iva={cat.iva} />
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell">
                    {cat.codigo_arancelario_default
                      ? <span className="font-mono text-xs text-slate-500">{cat.codigo_arancelario_default}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  {isMaster && (
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 justify-end">
                        <Can permission="categorias:update">
                          <Button size="sm" variant="ghost" icon={<Pencil size={14} />}
                            onClick={() => setEditItem(cat)} />
                        </Can>
                        <Can permission="categorias:delete">
                          <Button size="sm" variant="ghost" icon={<Trash2 size={14} />}
                            onClick={() => setDeleteCat(cat)}
                            className="text-red-500 hover:text-red-700" />
                        </Can>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear */}
      <CategoriaModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(dto) => createMutation.mutate(dto)}
        loading={createMutation.isPending}
        title="Nueva categoría"
      />

      {/* Modal editar */}
      {editItem && (
        <CategoriaModal
          open
          onClose={() => setEditItem(null)}
          defaultValues={{ nombre: editItem.nombre, descripcion: editItem.descripcion ?? '', iva: editItem.iva }}
          onSubmit={(dto) => updateMutation.mutate({ id: editItem.id, dto })}
          loading={updateMutation.isPending}
          title="Editar categoría"
        />
      )}

      <ConfirmDialog
        open={!!deleteCat}
        title="Eliminar categoría"
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Los productos asociados perderán su categoría y quedarán sin tarifa IVA asignada.</p>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Categoría</span>
                <span className="font-medium">{deleteCat?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IVA</span>
                <span className="font-medium">{deleteCat?.iva} %</span>
              </div>
            </div>
            <p className="text-xs text-red-600 font-medium">Esta acción no se puede deshacer.</p>
          </div>
        }
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteCat && deleteMutation.mutate(deleteCat.id)}
        onCancel={() => setDeleteCat(null)}
      />
    </div>
  )
}

// ─── Modal form ───────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  defaultValues?: Partial<FormData>
  onSubmit: (dto: CreateCategoriaDto) => void
  loading: boolean
  title: string
}

function CategoriaModal({ open, onClose, defaultValues, onSubmit, loading, title }: ModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      nombre:                     defaultValues?.nombre ?? '',
      descripcion:                defaultValues?.descripcion ?? '',
      iva:                        defaultValues?.iva ?? 19,
      codigo_ciiu:                defaultValues?.codigo_ciiu ?? '',
      codigo_arancelario_default: defaultValues?.codigo_arancelario_default ?? '',
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit as any)}>Guardar</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Nombre *" {...register('nombre')} error={errors.nombre?.message} autoFocus />
        <Input label="Descripción" {...register('descripcion')} placeholder="Ej: Artículos de canasta básica" />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Código CIIU"
            {...register('codigo_ciiu')}
            placeholder="Ej: 4711"
          />
          <Input
            label="Arancel DIAN"
            {...register('codigo_arancelario_default')}
            placeholder="Ej: 2203.00.00.00"
          />
        </div>
        <Select
          label="Tarifa IVA *"
          {...register('iva')}
          options={[
            { value: '0',  label: '0% — Excluido / Exento (canasta familiar, medicamentos, agua)' },
            { value: '5',  label: '5% — Tarifa reducida' },
            { value: '19', label: '19% — Tarifa general (art. 468 ET)' },
          ]}
        />
      </form>
    </Modal>
  )
}
