import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import {
  Plus, Trash2, FileText, DollarSign, ShoppingCart, Package,
  ChevronDown, ChevronUp, Upload, AlertCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Table, Th, Td, Spinner, EmptyState, Modal, Card,
  StatCard, DateRangeBar, SearchInput, Badge, FileDropZone, InfoBanner, Pagination,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import { apiError } from '@/shared/lib/apiError'
import Can from '@/shared/components/Can'
import { formatCOP, formatDate } from '@/shared/lib/formatters'
import { facturasApi } from './api'
import type { CreateFacturaDto } from './api'
import { proveedoresApi } from '@/features/suppliers/api'
import { productsApi } from '@/features/products/api'
import type { CreateProductoDto } from '@/features/products/api'

// Solo proveedor en RHF — los ítems se manejan con estado local
// para evitar el bug de NumberInput+RHF (valor formateado "75.600" → coerce → 75.6)
const facturaSchema = z.object({
  proveedor_id: z.coerce.number().min(1, 'Selecciona un proveedor'),
})
type FacturaForm = z.infer<typeof facturaSchema>

type ItemState = {
  id: string
  producto_id: number
  cantDisplay: string
  precioDisplay: string
}

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate]   = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [search, setSearch]           = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const today = new Date().toISOString().slice(0, 10)
  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const [desde, setDesde] = useState(ninetyAgo)
  const [hasta, setHasta] = useState(today)

  const { data: facturas = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => facturasApi.getAll({ limit: 100 }),
    refetchOnMount: 'always',
  })

  // Stats EXACTOS del tenant (agregados SQL, no dependen de paginación)
  const { data: statsData } = useQuery({
    queryKey: ['invoices', 'stats'],
    queryFn: facturasApi.stats,
    refetchOnMount: 'always',
  })

  const { data: proveedores = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => proveedoresApi.getAll(),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateFacturaDto) => facturasApi.create(dto),
    onSuccess: (newFactura) => {
      qc.setQueryData(['invoices'], (old: typeof facturas | undefined) =>
        old ? [newFactura, ...old] : [newFactura]
      )
      qc.invalidateQueries({ queryKey: ['invoices', 'stats'] })  // stats SQL exactos
      // Products stock changed — must refetch
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'stock'] })
      toast.success('Factura creada y stock actualizado')
      setShowCreate(false)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al crear factura')),
  })

  const proveedorNombre = (id: number) => proveedores.find((p) => p.id === id)?.nombre ?? '—'
  const productoNombre  = (id: number) => products.find((p) => p.id === id)?.nombre ?? `#${id}`
  const facturaTotal    = (f: { compras: { precio_total: number }[] }) =>
    f.compras.reduce((s, c) => s + (c.precio_total ?? 0), 0)

  // ── Stats (del endpoint /invoices/stats — exactos sin importar paginación) ────
  const stats = useMemo(() => ({
    total: statsData?.total_invertido ?? 0,
    count: statsData?.facturas ?? 0,
    totalMes: statsData?.total_mes ?? 0,
    esMes: statsData?.facturas_mes ?? 0,
    totalUnidades: statsData?.unidades ?? 0,
  }), [statsData])

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return facturas.filter((f) => {
      const fecha = f.fecha_creacion?.slice(0, 10) ?? ''
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
      if (search) {
        const q = search.toLowerCase()
        const prov = proveedorNombre(f.proveedor_id).toLowerCase()
        if (!prov.includes(q) && !String(f.id).includes(q)) return false
      }
      return true
    })
  }, [facturas, desde, hasta, search, proveedores])

  const pg = usePagination(filtered)

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else               next.add(id)
      return next
    })
  }

  const handleFiles = (files: File[]) => {
    setUploadedFiles(files)
    toast.success(`${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}. Abre el formulario para crear la factura.`)
  }

  return (
    <div>
      <Can permission="facturas:read" fallback={<p className="text-slate-500 p-4">Sin acceso</p>}>
        <PageHeader
          title="Facturas de compra"
          subtitle="Registro de compras a proveedores"
          actions={
            <Can permission="facturas:create">
              <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
                Nueva factura
              </Button>
            </Can>
          }
        />

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Invertido este mes"
            value={formatCOP(stats.totalMes)}
            subValue={`${stats.esMes} factura${stats.esMes !== 1 ? 's' : ''}`}
            icon={<DollarSign size={17} className="t-text" />}
            accent="green"
          />
          <StatCard
            label="Total histórico"
            value={formatCOP(stats.total)}
            icon={<DollarSign size={17} className="text-blue-600" />}
            accent="blue"
          />
          <StatCard
            label="Facturas totales"
            value={String(stats.count)}
            icon={<FileText size={17} className="text-purple-600" />}
            accent="purple"
          />
          <StatCard
            label="Unidades compradas"
            value={stats.totalUnidades.toLocaleString('es-CO')}
            icon={<Package size={17} className="text-orange-600" />}
            accent="orange"
          />
        </div>

        {/* ── Upload zone ──────────────────────────────────────────────────── */}
        <Can permission="facturas:create">
          <div className="mb-5">
            {uploadedFiles.length > 0 ? (
              <div className="flex items-center gap-3 p-3.5 t-bg-xlt border t-border rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium t-text-dk">
                    {uploadedFiles.length} archivo{uploadedFiles.length > 1 ? 's' : ''} listo{uploadedFiles.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs t-text truncate">{uploadedFiles.map((f) => f.name).join(', ')}</p>
                </div>
                <Button size="sm" onClick={() => setShowCreate(true)} icon={<Plus size={13} />}>
                  Crear factura
                </Button>
                <button onClick={() => setUploadedFiles([])} className="t-text hover:t-text-dk">
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <FileDropZone
                compact
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,image/*"
                onFiles={handleFiles}
              />
            )}
          </div>
        </Can>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start">
          <DateRangeBar
            desde={desde}
            hasta={hasta}
            onDesde={setDesde}
            onHasta={setHasta}
            presets={['week', 'month', 'lastMonth']}
            className="flex-1"
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Proveedor o #..." className="max-w-xs" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} />}
            title={search ? 'Sin resultados' : 'Sin facturas'}
            description={search ? `Sin coincidencias para "${search}"` : 'Registra tu primera factura de compra'}
            action={
              !search && (
                <Can permission="facturas:create">
                  <Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Nueva factura</Button>
                </Can>
              )
            }
          />
        ) : (
          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th className="hidden sm:table-cell">#</Th>
                  <Th>Proveedor</Th>
                  <Th>Total</Th>
                  <Th className="hidden sm:table-cell">Ítems</Th>
                  <Th className="hidden md:table-cell">Fecha</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {pg.paginated.map((f) => {
                  const total    = facturaTotal(f)
                  const expanded = expandedIds.has(f.id)

                  return (
                    <>
                      <tr
                        key={f.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        onClick={() => toggleExpand(f.id)}
                      >
                        <Td className="font-mono text-xs text-slate-400 hidden sm:table-cell">#{f.id}</Td>
                        <Td>
                          <div>
                            <p className="font-semibold text-slate-800">{proveedorNombre(f.proveedor_id)}</p>
                            {f.compras.length > 0 && (
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                {f.compras.slice(0, 2).map((c) => productoNombre(c.producto_id)).join(', ')}
                                {f.compras.length > 2 && ` +${f.compras.length - 2} más`}
                              </p>
                            )}
                            <span className="sm:hidden text-[10px] text-slate-400">
                              {f.compras.length} ítem{f.compras.length !== 1 ? 's' : ''} · {formatDate(f.fecha_creacion)}
                            </span>
                          </div>
                        </Td>
                        <Td className="font-bold text-slate-800 tabular-nums">{formatCOP(total)}</Td>
                        <Td className="hidden sm:table-cell">
                          <Badge variant="gray">
                            <ShoppingCart size={10} className="mr-0.5" />
                            {f.compras.length} ítem{f.compras.length !== 1 ? 's' : ''}
                          </Badge>
                        </Td>
                        <Td className="text-slate-400 text-xs whitespace-nowrap hidden md:table-cell">{formatDate(f.fecha_creacion)}</Td>
                        <Td>
                          <div className="flex items-center justify-end text-slate-400 group-hover:text-slate-600">
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </div>
                        </Td>
                      </tr>

                      {/* Expanded row — items */}
                      {expanded && (
                        <tr key={`${f.id}-detail`}>
                          <td colSpan={6} className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Detalle de compras</p>
                              {f.compras.map((c) => (
                                <div key={c.id} className="flex items-center gap-3 py-1.5 text-sm">
                                  <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                    <Package size={11} className="text-slate-500" />
                                  </div>
                                  <span className="flex-1 font-medium text-slate-700 truncate">{productoNombre(c.producto_id)}</span>
                                  <span className="text-slate-400 tabular-nums">{c.cantidad_inicial} unid.</span>
                                  <span className="text-slate-400 text-xs">costo unit: {formatCOP((c.precio_total ?? 0) / (c.cantidad_inicial || 1))}</span>
                                  <span className="font-semibold text-slate-800 tabular-nums">{formatCOP(c.precio_total)}</span>
                                </div>
                              ))}
                              <div className="flex justify-end pt-2 border-t border-slate-200 mt-2">
                                <span className="text-sm font-bold text-slate-700 tabular-nums">Total: {formatCOP(total)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </Table>
            </div>

            <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>{filtered.length} factura{filtered.length !== 1 ? 's' : ''}</span>
              <span className="font-semibold text-slate-700 tabular-nums">
                Total filtrado: {formatCOP(filtered.reduce((s, f) => s + facturaTotal(f), 0))}
              </span>
            </div>
          </Card>
        )}

        {/* ── Create Modal ─────────────────────────────────────────────────── */}
        <FacturaModal
          open={showCreate}
          onClose={() => { setShowCreate(false); setUploadedFiles([]) }}
          proveedores={proveedores}
          products={products}
          onSubmit={(dto) => createMutation.mutate(dto)}
          loading={createMutation.isPending}
          uploadedFiles={uploadedFiles}
        />
      </Can>
    </div>
  )
}

interface FacturaModalProps {
  open: boolean
  onClose: () => void
  proveedores: { id: number; nombre: string }[]
  products: { id: number; nombre: string }[]
  onSubmit: (dto: CreateFacturaDto) => void
  loading: boolean
  uploadedFiles?: File[]
}

// ── helpers locales ─────────────────────────────────────────────────────────────
const parseNum = (s: string) => { const n = parseInt(s.replace(/\D/g, '') || '0', 10); return isNaN(n) ? 0 : n }
const fmtNum   = (s: string) => { const n = parseNum(s); return n > 0 ? n.toLocaleString('es-CO') : '' }

const ITEM_INPUT_CLASS =
  'w-full px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white'

function FacturaModal({ open, onClose, proveedores, products, onSubmit, loading, uploadedFiles = [] }: FacturaModalProps) {
  const qc = useQueryClient()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FacturaForm>({
    resolver: zodResolver(facturaSchema) as unknown as Resolver<any>,
    defaultValues: { proveedor_id: 0 },
  })

  const mkItem = (): ItemState => ({ id: crypto.randomUUID(), producto_id: 0, cantDisplay: '1', precioDisplay: '' })
  const [items, setItems]       = useState<ItemState[]>([mkItem()])
  const [itemErr, setItemErr]   = useState<string | null>(null)
  // Quick-create producto
  const [quickCreateItemId, setQuickCreateItemId] = useState<string | null>(null)
  const [extraProducts, setExtraProducts]         = useState<{ id: number; nombre: string }[]>([])

  // Resetear al abrir el modal
  useEffect(() => {
    if (open) {
      reset({ proveedor_id: 0 })
      setItems([mkItem()])
      setItemErr(null)
      setExtraProducts([])
    }
  }, [open, reset])

  const allProducts = useMemo(
    () => [...products, ...extraProducts.filter((ep) => !products.find((p) => p.id === ep.id))],
    [products, extraProducts],
  )

  const addItem    = () => setItems((p) => [...p, mkItem()])
  const removeItem = (id: string) => setItems((p) => p.filter((it) => it.id !== id))
  const patchItem  = (id: string, patch: Partial<Omit<ItemState, 'id'>>) =>
    setItems((p) => p.map((it) => it.id === id ? { ...it, ...patch } : it))

  const totalFactura = items.reduce((s, it) => s + parseNum(it.precioDisplay), 0)

  // Mutación para crear un producto rápido desde la factura
  const quickCreateMutation = useMutation({
    mutationFn: (dto: CreateProductoDto) => productsApi.create(dto),
    onSuccess: (newProd) => {
      toast.success(`Producto "${newProd.nombre}" creado`)
      qc.invalidateQueries({ queryKey: ['products'] })
      setExtraProducts((prev) => [...prev, { id: newProd.id, nombre: newProd.nombre }])
      if (quickCreateItemId) {
        patchItem(quickCreateItemId, { producto_id: newProd.id })
      }
      setQuickCreateItemId(null)
    },
    onError: (e: unknown) => toast.error(apiError(e)),
  })

  const doSubmit = handleSubmit((rhfData) => {
    const hasNoProduct = items.some((it) => it.producto_id === 0)
    const hasNoQty     = items.some((it) => parseNum(it.cantDisplay) < 1)
    if (hasNoProduct || hasNoQty) {
      setItemErr('Completa producto y cantidad en todos los ítems')
      return
    }
    setItemErr(null)
    onSubmit({
      proveedor_id: rhfData.proveedor_id,
      items: items.map((it) => ({
        producto_id:  it.producto_id,
        cantidad:     parseNum(it.cantDisplay),
        precio_total: parseNum(it.precioDisplay),
      })),
    })
  })

  return (
    <>
      <Modal
        open={open && !quickCreateItemId}
        onClose={onClose}
        title="Nueva factura de compra"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button loading={loading} onClick={doSubmit} icon={<FileText size={14} />}>
              Crear factura {totalFactura > 0 && `— ${formatCOP(totalFactura)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Archivos adjuntos */}
          {uploadedFiles.length > 0 && (
            <InfoBanner icon={<Upload size={14} />} variant="info">
              <span className="font-medium">Archivos adjuntos:</span> {uploadedFiles.map((f) => f.name).join(', ')}
              <span className="block text-xs mt-0.5 opacity-75">Ingresa los datos manualmente basándote en el documento.</span>
            </InfoBanner>
          )}

          {/* Proveedor */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Proveedor *</label>
            <select
              {...register('proveedor_id')}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            {errors.proveedor_id && <p className="text-xs text-red-600">{errors.proveedor_id.message}</p>}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">Ítems de compra</span>
              <Button size="sm" variant="outline" icon={<Plus size={12} />} type="button" onClick={addItem}>
                Añadir ítem
              </Button>
            </div>

            {/* Header — hidden on mobile, shown sm+ */}
            <div className="hidden sm:grid grid-cols-12 gap-2 mb-1 px-1">
              <p className="col-span-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Producto</p>
              <p className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Cant.</p>
              <p className="col-span-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Precio total</p>
              <p className="col-span-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">C/u</p>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const cant      = parseNum(item.cantDisplay) || 1
                const ptotal    = parseNum(item.precioDisplay)
                const costoUnit = ptotal / cant
                return (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center">
                    {/* Producto */}
                    <div className="sm:col-span-5">
                      <select
                        value={item.producto_id}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setQuickCreateItemId(item.id)
                          } else {
                            patchItem(item.id, { producto_id: Number(e.target.value) })
                          }
                        }}
                        className={ITEM_INPUT_CLASS}
                      >
                        <option value={0}>Producto...</option>
                        {allProducts.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        <option value="__new__">＋ Crear nuevo producto...</option>
                      </select>
                    </div>

                    {/* Cantidad + Precio row on mobile */}
                    <div className="flex gap-2 sm:contents">
                      {/* Cantidad */}
                      <div className="flex-1 sm:col-span-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Cant."
                          value={item.cantDisplay}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '')
                            patchItem(item.id, { cantDisplay: raw ? parseInt(raw, 10).toLocaleString('es-CO') : '' })
                          }}
                          className={ITEM_INPUT_CLASS}
                        />
                      </div>

                      {/* Precio total */}
                      <div className="flex-1 sm:col-span-3 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Total"
                          value={item.precioDisplay}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '')
                            patchItem(item.id, { precioDisplay: raw ? parseInt(raw, 10).toLocaleString('es-CO') : '' })
                          }}
                          className={`${ITEM_INPUT_CLASS} pl-5`}
                        />
                      </div>
                    </div>

                    {/* Costo unitario + borrar */}
                    <div className="sm:col-span-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {costoUnit > 0 ? formatCOP(costoUnit) : '—'}
                      </span>
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={<Trash2 size={12} />}
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        disabled={items.length === 1}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {itemErr && <p className="text-xs text-red-600 mt-1">{itemErr}</p>}
          </div>

          {/* Total */}
          {totalFactura > 0 && (
            <div className="flex justify-between items-center p-3.5 t-bg-xlt border t-border rounded-xl">
              <span className="text-sm font-semibold t-text-dk">Total factura</span>
              <span className="text-lg font-bold t-text-dk tabular-nums">{formatCOP(totalFactura)}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Quick-create producto desde factura */}
      {quickCreateItemId && (
        <QuickCreateProductModal
          open={!!quickCreateItemId}
          onClose={() => setQuickCreateItemId(null)}
          onSubmit={(dto) => quickCreateMutation.mutate(dto)}
          loading={quickCreateMutation.isPending}
        />
      )}
    </>
  )
}

// ── Quick-create producto ─────────────────────────────────────────────────────

const quickProductSchema = z.object({
  nombre:       z.string().min(1, 'Requerido'),
  codigo:       z.string().optional(),
  categoria_id: z.coerce.number().optional(),
})
type QuickProductForm = z.infer<typeof quickProductSchema>

function QuickCreateProductModal({
  open, onClose, onSubmit, loading,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (dto: CreateProductoDto) => void
  loading: boolean
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<QuickProductForm>({
    resolver: zodResolver(quickProductSchema) as unknown as Resolver<any>,
  })
  const { data: categorias = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => import('@/features/categories/api').then((m) => m.categoriasApi.getAll()),
  })

  useEffect(() => { if (open) reset() }, [open, reset])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear nuevo producto"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit((d) => onSubmit(d))}>
            Crear y agregar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <InfoBanner icon={<AlertCircle size={14} />} variant="info">
          El producto se creará en el inventario y quedará seleccionado en este ítem de la factura.
        </InfoBanner>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Nombre *</label>
          <input
            {...register('nombre')}
            autoFocus
            placeholder="Nombre del producto"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
          />
          {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Código (opcional)</label>
          <input
            {...register('codigo')}
            placeholder="Ej: AGU001"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Categoría</label>
          <select
            {...register('categoria_id')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white"
          >
            <option value="">Sin categoría</option>
            {categorias.map((c: { id: number; nombre: string }) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-400">
          El stock se registrará automáticamente al guardar la factura con las unidades que ingreses en este ítem.
        </p>
      </div>
    </Modal>
  )
}
