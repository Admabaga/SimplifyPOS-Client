import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { Pencil, Trash2, Plus, Receipt, DollarSign, TrendingDown, Search, Tag } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Table, Th, Td, Spinner, EmptyState,
  Modal, ConfirmDialog, Card, StatCard, Pagination,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import Can from '@/shared/components/Can'
import { apiError } from '@/shared/lib/apiError'
import { formatCOP, formatDate } from '@/shared/lib/formatters'
import { gastosApi } from './api'
import type { CreateGastoDto, MetodoPagoGasto } from './api'
import { mediosPagoApi } from '@/features/payment-methods/api'
import type { Gasto } from '@/shared/types'
import { useCajaGuard } from '@/shared/hooks/useCajaGuard'
import { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'

const schema = z.object({
  descripcion: z.string().min(1, 'Requerido'),
  monto: z.coerce.number().min(0, 'Debe ser positivo'),
  fecha: z.string().min(1, 'Requerido'),
  categoria: z.string().optional(),
  metodo_pago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']),
  comprobante_path: z.string().nullable().optional(),
})
type FormData = z.infer<typeof schema>

export default function ExpensesPage() {
  const qc = useQueryClient()
  const { requireCaja } = useCajaGuard()
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<{ id: number } & FormData | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')

  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => gastosApi.getAll({ limit: 100 }),
    refetchOnMount: 'always',
  })

  // Stats EXACTOS del tenant (agregados SQL, no dependen de paginación)
  const { data: statsData } = useQuery({
    queryKey: ['expenses', 'stats'],
    queryFn: gastosApi.stats,
    refetchOnMount: 'always',
  })

  const createMutation = useMutation({
    mutationFn: gastosApi.create,
    onSuccess: (newGasto) => {
      qc.setQueryData(['expenses'], (old: Gasto[] | undefined) =>
        old ? [newGasto, ...old] : [newGasto]
      )
      qc.invalidateQueries({ queryKey: ['expenses', 'stats'] })
      toast.success('Gasto registrado')
      setShowCreate(false)
    },
    onError: (err) => toast.error(apiError(err, 'Error al registrar gasto')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateGastoDto> }) => gastosApi.update(id, dto),
    onSuccess: (updated) => {
      qc.setQueryData(['expenses'], (old: Gasto[] | undefined) =>
        old ? old.map((g) => g.id === updated.id ? updated : g) : old
      )
      qc.invalidateQueries({ queryKey: ['expenses', 'stats'] })
      toast.success('Gasto actualizado')
      setEditItem(null)
    },
    onError: (err) => toast.error(apiError(err, 'Error al actualizar')),
  })

  const deleteMutation = useMutation({
    mutationFn: gastosApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['expenses'] })
      const prev = qc.getQueryData(['expenses'])
      qc.setQueryData(['expenses'], (old: Gasto[] | undefined) =>
        old ? old.filter((g) => g.id !== id) : old
      )
      return { prev }
    },
    onError: (err, _id, ctx) => {
      qc.setQueryData(['expenses'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar'))
    },
    onSuccess: () => { toast.success('Gasto eliminado'); setDeleteId(null) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['expenses'] }),  // incluye ['expenses','stats']
  })

  // Compute stats & categories
  const categorias = useMemo(() => {
    const cats = new Set(gastos.map((g) => g.categoria ?? 'Sin categoría').filter(Boolean))
    return ['todas', ...Array.from(cats).sort()]
  }, [gastos])

  // Stats del endpoint /expenses/stats — exactos sin importar paginación
  const stats = useMemo(() => ({
    total: statsData?.total ?? 0,
    totalMes: statsData?.total_mes ?? 0,
    count: statsData?.count ?? 0,
    maxGasto: statsData?.max_gasto ?? 0,
  }), [statsData])

  const filtered = useMemo(() => {
    let result = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha))
    if (categoriaFilter !== 'todas') {
      result = result.filter((g) => (g.categoria ?? 'Sin categoría') === categoriaFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((g) =>
        g.descripcion.toLowerCase().includes(q) || (g.categoria ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [gastos, categoriaFilter, search])

  const pg = usePagination(filtered)

  return (
    <div>
      <Can permission="gastos:read" fallback={<p className="text-slate-500">Sin acceso</p>}>
        <PageHeader
          title="Gastos"
          actions={
            <Can permission="gastos:create">
              <Button icon={<Plus size={16} />} onClick={() => requireCaja('registrar un gasto') && setShowCreate(true)}>Registrar gasto</Button>
            </Can>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Este mes"
            value={formatCOP(stats.totalMes)}
            icon={<TrendingDown size={16} />}
            accent="red"
          />
          <StatCard
            label="Total histórico"
            value={formatCOP(stats.total)}
            icon={<DollarSign size={16} />}
            accent="orange"
          />
          <StatCard
            label="Registros"
            value={String(stats.count)}
            icon={<Receipt size={16} />}
            accent="blue"
          />
          <StatCard
            label="Categorías"
            value={String(categorias.length - 1)}
            icon={<Tag size={16} />}
            accent="purple"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar gasto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>
          {categorias.length > 2 && (
            <div className="flex gap-1.5 flex-wrap">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    categoriaFilter === cat
                      ? 't-bg text-white t-border'
                      : 'bg-white text-slate-600 border-slate-200 hover:t-border'
                  }`}
                >
                  {cat === 'todas' ? 'Todas' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt size={40} />}
            title={search || categoriaFilter !== 'todas' ? 'Sin resultados' : 'Sin gastos'}
            description={search ? `No hay gastos que coincidan con "${search}"` : 'Registra tu primer gasto operativo'}
          />
        ) : (
          <Card padding={false} className="overflow-hidden">
            <Table>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <Th>Descripción</Th>
                  <Th className="hidden sm:table-cell">Categoría</Th>
                  <Th>Monto</Th>
                  <Th className="hidden sm:table-cell">Fecha</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pg.paginated.map((g) => {
                  const monto = parseFloat(String(g.monto))
                  const isAlto = monto > stats.totalMes * 0.3

                  return (
                    <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                      <Td>
                        <div>
                          <span className="font-medium text-slate-800">{g.descripcion}</span>
                          <div className="sm:hidden flex items-center gap-1.5 mt-0.5">
                            {g.categoria && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                                <Tag size={8} />{g.categoria}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">{formatDate(g.fecha)}</span>
                          </div>
                        </div>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        {g.categoria ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                            <Tag size={9} />
                            {g.categoria}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </Td>
                      <Td>
                        <span className={`font-semibold ${isAlto ? 'text-red-600' : 'text-slate-700'}`}>
                          {formatCOP(monto)}
                        </span>
                      </Td>
                      <Td className="text-slate-500 text-xs hidden sm:table-cell">{formatDate(g.fecha)}</Td>
                      <Td>
                        <div className="flex gap-1 justify-end">
                          <Can permission="gastos:update">
                            <Button
                              size="sm" variant="ghost"
                              icon={<Pencil size={14} />}
                              onClick={() => setEditItem({
                                id: g.id,
                                descripcion: g.descripcion,
                                monto: parseFloat(String(g.monto)),
                                fecha: g.fecha,
                                categoria: g.categoria ?? '',
                                metodo_pago: g.metodo_pago,
                                comprobante_path: g.comprobante_path ?? null,
                              })}
                            />
                          </Can>
                          <Can permission="gastos:delete">
                            <Button
                              size="sm" variant="ghost"
                              icon={<Trash2 size={14} />}
                              onClick={() => setDeleteId(g.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            />
                          </Can>
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-700">
                Total: {formatCOP(filtered.reduce((s, g) => s + parseFloat(String(g.monto)), 0))}
              </span>
            </div>
          </Card>
        )}

        <GastoModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSubmit={(dto) => createMutation.mutate(dto)}
          loading={createMutation.isPending}
          title="Registrar gasto"
        />

        {editItem && (
          <GastoModal
            open={!!editItem}
            onClose={() => setEditItem(null)}
            defaultValues={editItem}
            onSubmit={(dto) => updateMutation.mutate({ id: editItem.id, dto })}
            loading={updateMutation.isPending}
            title="Editar gasto"
          />
        )}

        <ConfirmDialog
          open={deleteId !== null}
          title="Eliminar gasto"
          message="¿Eliminar este gasto permanentemente?"
          confirmLabel="Eliminar"
          danger
          loading={deleteMutation.isPending}
          onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      </Can>
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  defaultValues?: Partial<FormData>
  onSubmit: (dto: CreateGastoDto) => void
  loading: boolean
  title: string
}

function GastoModal({ open, onClose, defaultValues, onSubmit, loading, title }: ModalProps) {
  // Tipos de método de pago disponibles según los medios_pago activos del negocio.
  // Cada negocio configura los suyos: algunos solo manejan efectivo, otros efectivo+transferencia+tarjeta.
  const { data: mediosPago = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => mediosPagoApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
  const tiposDisponibles = useMemo<MetodoPagoGasto[]>(() => {
    const set = new Set<MetodoPagoGasto>()
    for (const m of mediosPago) if (m.activo) set.add(m.tipo)
    // Orden estable de presentación
    return (['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as MetodoPagoGasto[]).filter((t) => set.has(t))
  }, [mediosPago])

  const defaultMetodo: MetodoPagoGasto =
    defaultValues?.metodo_pago ??
    (tiposDisponibles.includes('EFECTIVO') ? 'EFECTIVO' : (tiposDisponibles[0] ?? 'EFECTIVO'))

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<any>,
    defaultValues: {
      descripcion: defaultValues?.descripcion ?? '',
      monto: defaultValues?.monto ?? undefined,
      fecha: defaultValues?.fecha ?? new Date().toISOString().slice(0, 10),
      categoria: defaultValues?.categoria ?? '',
      metodo_pago: defaultMetodo,
      comprobante_path: defaultValues?.comprobante_path ?? null,
    },
  })

  const metodoPago = watch('metodo_pago')
  const comprobantePath = watch('comprobante_path')
  const requiereComprobante = metodoPago !== 'EFECTIVO'
  const [uploading, setUploading] = useState(false)

  // Estado local para el monto — evita bug NumberInput+RHF (valor formateado → coerce errado)
  const montoInput = useCurrencyInput(defaultValues?.monto ?? 0)

  useEffect(() => {
    if (open) {
      reset({
        descripcion: defaultValues?.descripcion ?? '',
        monto: defaultValues?.monto ?? undefined,
        fecha: defaultValues?.fecha ?? new Date().toISOString().slice(0, 10),
        categoria: defaultValues?.categoria ?? '',
        metodo_pago: defaultMetodo,
        comprobante_path: defaultValues?.comprobante_path ?? null,
      })
      montoInput.setFromNumber(defaultValues?.monto ?? 0)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      const { path } = await gastosApi.uploadComprobante(file)
      setValue('comprobante_path', path, { shouldValidate: true })
      toast.success('Comprobante subido')
    } catch (err) {
      toast.error(apiError(err, 'No se pudo subir el comprobante'))
    } finally {
      setUploading(false)
    }
  }

  const submit = (data: FormData) => {
    if (requiereComprobante && !data.comprobante_path) {
      toast.error('Adjunta el comprobante para pagos no en efectivo')
      return
    }
    onSubmit({
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: data.fecha,
      categoria: data.categoria || undefined,
      metodo_pago: data.metodo_pago,
      comprobante_path: data.comprobante_path ?? null,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(submit)}>Guardar</Button>
        </>
      }
    >
      <form className="space-y-3">
        <Input label="Descripción *" placeholder="Ej: Pago de arriendo" {...register('descripcion')} error={errors.descripcion?.message} />

        {/* Monto — estado local + setValue para que RHF reciba el entero limpio */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Monto *</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 pointer-events-none">$</span>
            <input
              {...montoInput.inputProps}
              placeholder="0"
              onChange={(e) => {
                montoInput.inputProps.onChange(e)
                const clean = e.target.value.replace(/\D/g, '')
                const n = clean ? parseInt(clean, 10) : 0
                setValue('monto', n, { shouldValidate: true })
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
            />
          </div>
          {errors.monto && <p className="text-xs text-red-600">{errors.monto.message}</p>}
        </div>

        <Input label="Fecha *" type="date" {...register('fecha')} error={errors.fecha?.message} />
        <Input label="Categoría" placeholder="Ej: Servicios, Arriendo, Nómina..." {...register('categoria')} />

        {/* Método de pago — solo los tipos que el negocio tiene configurados */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Método de pago *</label>
          {tiposDisponibles.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Tu negocio aún no tiene medios de pago activos. Configúralos en Ajustes → Medios de pago.
            </p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {tiposDisponibles.map((tipo) => {
                const active = metodoPago === tipo
                const label = tipo === 'EFECTIVO' ? 'Efectivo' : tipo === 'TRANSFERENCIA' ? 'Transferencia' : 'Tarjeta'
                return (
                  <button
                    type="button"
                    key={tipo}
                    onClick={() => setValue('metodo_pago', tipo, { shouldValidate: true })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active ? 't-bg text-white t-border' : 'bg-white text-slate-600 border-slate-200 hover:t-border'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Comprobante — obligatorio si el método no es efectivo */}
        {requiereComprobante && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Comprobante * <span className="text-xs text-slate-400 font-normal">(imagen o PDF, máx 8 MB)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
              }}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            {uploading && <p className="text-xs text-slate-500">Subiendo…</p>}
            {comprobantePath && !uploading && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <Receipt size={12} /> Comprobante adjunto
                <button
                  type="button"
                  onClick={() => setValue('comprobante_path', null)}
                  className="ml-2 text-red-500 hover:underline"
                >
                  quitar
                </button>
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
