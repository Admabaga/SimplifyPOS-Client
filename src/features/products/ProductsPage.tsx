import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import {
  Pencil, Trash2, DollarSign, Plus, AlertTriangle, Package, BarChart3,
  LayoutGrid, List, Tag,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Table, Th, Td, Badge, Spinner, EmptyState,
  Modal, ConfirmDialog, Card, StatCard, SearchInput, Pagination,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import Can from '@/shared/components/Can'
import { formatCOP } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import type { Producto, ProductoPrecio } from '@/shared/types'
import { productsApi } from './api'
import type { CreateProductoDto, CreateProductoPrecioDto, UpdateProductoPrecioDto } from './api'
import { categoriasApi } from '@/features/categories/api'
import { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const productSchema = z.object({
  nombre:               z.string().min(1, 'Requerido'),
  codigo:               z.string().optional(),
  descripcion:          z.string().optional(),
  categoria_id:         z.coerce.number().optional(),
  activo:               z.boolean().default(true),
  stock_inicial:        z.coerce.number().min(0).optional(),
  precio_costo_inicial: z.coerce.number().min(0).optional(),
  codigo_arancelario:   z.string().optional(),
})

const priceSchema = z.object({
  nombre:   z.string().min(1, 'Requerido'),
  precio:   z.coerce.number().min(0, 'Debe ser positivo'),
  cantidad: z.coerce.number().min(1, 'Mínimo 1'),
})

type ProductForm = z.infer<typeof productSchema>
type PriceForm   = z.infer<typeof priceSchema>

type ViewMode = 'table' | 'grid'

// ─── StockBadge ──────────────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)   return <Badge variant="red" dot>Agotado</Badge>
  if (stock <= 5)    return <Badge variant="yellow" dot>Stock bajo ({stock})</Badge>
  return                    <Badge variant="green" dot>En stock ({stock})</Badge>
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product, catName, catIva, onEdit, onDelete, onPrices,
}: {
  product: Producto
  catName?: string
  catIva?: number
  onEdit: () => void
  onDelete: () => void
  onPrices: () => void
}) {
  const stock = product.stock_total ?? 0
  const stockColor = stock === 0 ? 'border-red-100 bg-red-50/30' : stock <= 5 ? 'border-yellow-100 bg-yellow-50/20' : 'border-slate-200'

  return (
    <Card className={`border ${stockColor} hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Package size={18} className="text-slate-500" />
        </div>
        <StockBadge stock={stock} />
      </div>

      <h3 className="font-semibold text-slate-900 text-sm mb-0.5 leading-tight">{product.nombre}</h3>
      {catName && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-xs text-slate-400">{catName}</span>
          {catIva !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums ${
                catIva === 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : catIva === 5
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
              title="IVA heredado de la categoría"
            >
              IVA {catIva}%
            </span>
          )}
        </div>
      )}
      {(product.codigo || product.codigo_arancelario) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-2">
          {product.codigo && (
            <p className="text-xs text-slate-400 font-mono">#{product.codigo}</p>
          )}
          {product.codigo_arancelario && (
            <p
              className="text-[10px] text-slate-400 font-mono"
              title="Código arancelario DIAN"
            >
              DIAN: {product.codigo_arancelario}
            </p>
          )}
        </div>
      )}

      {/* Precios (presentaciones) */}
      {product.precios && product.precios.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {product.precios.filter((p: any) => p.nombre !== 'Perdida' && p.activo !== false).slice(0, 3).map((pr: any) => (
            <span key={pr.id} className="inline-flex items-center gap-1 px-2 py-0.5 t-bg-xlt border t-border-lt rounded-lg text-xs t-text-dk font-medium">
              <Tag size={9} />
              {pr.nombre}: {formatCOP(pr.precio)}
            </span>
          ))}
          {product.precios.length > 3 && (
            <span className="text-xs text-slate-400 px-1">+{product.precios.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-sm font-bold text-slate-800 tabular-nums">{formatCOP(product.precio_ponderado)}</span>
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" icon={<DollarSign size={12} />} onClick={onPrices} className="text-blue-500">
            Precios
          </Button>
          <Can permission="productos:update">
            <Button size="xs" variant="ghost" icon={<Pencil size={12} />} onClick={onEdit} />
          </Can>
          <Can permission="productos:delete">
            <Button size="xs" variant="ghost" icon={<Trash2 size={12} />} onClick={onDelete} className="text-red-400 hover:text-red-600 hover:bg-red-50" />
          </Can>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductsPage() {
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState<number | 'todas'>('todas')
  const [stockFilter, setStockFilter] = useState<'todos' | 'con-stock' | 'sin-stock' | 'bajo-stock'>('todos')
  const [editProduct, setEditProduct]       = useState<Producto | null>(null)
  const [deleteId, setDeleteId]             = useState<number | null>(null)
  const [pricesProduct, setPricesProduct]   = useState<Producto | null>(null)
  const [showCreate, setShowCreate]         = useState(false)
  const [showAddPrice, setShowAddPrice]     = useState(false)
  const [editPriceItem, setEditPriceItem]   = useState<ProductoPrecio | null>(null)
  const [deletePriceId, setDeletePriceId]   = useState<number | null>(null)
  const [inlineEdit, setInlineEdit]         = useState<{ id: number; field: 'nombre'; value: string } | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn:  () => productsApi.getAll({ limit: 500 }),
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => categoriasApi.getAll(),
  })

  const { data: prices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['products', pricesProduct?.id, 'prices'],
    queryFn:  () => productsApi.getPrices(pricesProduct!.id),
    enabled:  !!pricesProduct,
  })

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: (newProduct) => {
      qc.setQueryData(['products'], (old: Producto[] | undefined) =>
        old ? [...old, newProduct] : [newProduct]
      )
      toast.success('Producto creado')
      setShowCreate(false)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al crear producto')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateProductoDto> }) => productsApi.update(id, dto),
    onSuccess: (updated) => {
      qc.setQueryData(['products'], (old: Producto[] | undefined) =>
        old ? old.map((p) => p.id === updated.id ? updated : p) : old
      )
      toast.success('Producto actualizado')
      setEditProduct(null)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al actualizar')),
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['products'] })
      const prev = qc.getQueryData(['products'])
      qc.setQueryData(['products'], (old: Producto[] | undefined) =>
        old ? old.filter((p) => p.id !== id) : old
      )
      return { prev }
    },
    onError: (err: any, _id, ctx) => {
      qc.setQueryData(['products'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar'))
    },
    onSuccess: () => { toast.success('Producto eliminado'); setDeleteId(null) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const addPriceMutation = useMutation({
    mutationFn: ({ dto }: { dto: CreateProductoPrecioDto }) => productsApi.addPrice(pricesProduct!.id, dto),
    onSuccess: (newPrice) => {
      const pid = pricesProduct?.id
      qc.setQueryData(['products', pid, 'prices'], (old: ProductoPrecio[] | undefined) =>
        old ? [...old, newPrice] : [newPrice]
      )
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Precio añadido')
      setShowAddPrice(false)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al añadir precio')),
  })

  const updatePriceMutation = useMutation({
    mutationFn: ({ priceId, dto }: { priceId: number; dto: UpdateProductoPrecioDto }) =>
      productsApi.updatePrice(pricesProduct!.id, priceId, dto),
    onSuccess: (updated) => {
      const pid = pricesProduct?.id
      qc.setQueryData(['products', pid, 'prices'], (old: ProductoPrecio[] | undefined) =>
        old ? old.map((pr) => (pr.id === updated.id ? updated : pr)) : old
      )
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Precio actualizado')
      setEditPriceItem(null)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al actualizar precio')),
  })

  const deletePriceMutation = useMutation({
    mutationFn: (priceId: number) => productsApi.removePrice(pricesProduct!.id, priceId),
    onMutate: async (priceId) => {
      const pid = pricesProduct?.id
      await qc.cancelQueries({ queryKey: ['products', pid, 'prices'] })
      const prev = qc.getQueryData(['products', pid, 'prices'])
      qc.setQueryData(['products', pid, 'prices'], (old: ProductoPrecio[] | undefined) =>
        old ? old.filter((pr) => pr.id !== priceId) : old
      )
      return { prev, pid }
    },
    onError: (err: any, _id, ctx) => {
      qc.setQueryData(['products', ctx?.pid, 'prices'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar precio'))
    },
    onSuccess: () => { toast.success('Precio eliminado'); setDeletePriceId(null) },
    onSettled: (_data, _err, _id, ctx) => {
      qc.invalidateQueries({ queryKey: ['products', ctx?.pid, 'prices'] })
    },
  })

  const inlineMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateProductoDto> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setInlineEdit(null)
    },
    onError: (error) => toast.error(apiError(error)),
  })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activos   = products.filter((p) => p.activo)
    const sinStock  = activos.filter((p) => (p.stock_total ?? 0) === 0)
    const stockBajo = activos.filter((p) => (p.stock_total ?? 0) > 0 && (p.stock_total ?? 0) <= 5)
    const totalStock = activos.reduce((s, p) => s + (p.stock_total ?? 0), 0)
    return { total: products.length, activos: activos.length, sinStock: sinStock.length, stockBajo: stockBajo.length, totalStock }
  }, [products])

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const stock = p.stock_total ?? 0
      if (!p.nombre.toLowerCase().includes(search.toLowerCase())) return false
      if (catFilter !== 'todas' && p.categoria_id !== catFilter)    return false
      if (stockFilter === 'con-stock'  && stock === 0)   return false
      if (stockFilter === 'sin-stock'  && stock > 0)    return false
      if (stockFilter === 'bajo-stock' && (stock === 0 || stock > 5)) return false
      return true
    })
  }, [products, search, catFilter, stockFilter])

  const pg = usePagination(filtered)

  const catName = (id?: number) => categorias.find((c) => c.id === id)?.nombre

  return (
    <div>
      <PageHeader
        title="Productos"
        subtitle="Inventario y presentaciones de precio"
        actions={
          <div className="flex gap-2">
            {/* Vista toggle */}
            <div className="flex gap-0.5 p-1 bg-slate-100 rounded-lg">
              {(['table', 'grid'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  aria-label={mode === 'table' ? 'Vista lista' : 'Vista cuadrícula'}
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-md transition-all ${viewMode === mode ? 'bg-white shadow-xs text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {mode === 'table' ? <List size={15} /> : <LayoutGrid size={15} />}
                </button>
              ))}
            </div>
            <Can permission="productos:create">
              <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
                Nuevo producto
              </Button>
            </Can>
          </div>
        }
      />

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Productos activos"  value={String(stats.activos)}   icon={<Package       size={17} className="text-green-600"  />} accent="green"  />
        <StatCard label="Total en catálogo"  value={String(stats.total)}     icon={<BarChart3      size={17} className="text-blue-600"   />} accent="blue"   />
        <StatCard label="Stock bajo"         value={String(stats.stockBajo)} subValue="≤ 5 unidades" icon={<AlertTriangle size={17} className="text-yellow-500" />} accent="yellow" />
        <StatCard label="Sin stock"          value={String(stats.sinStock)}  icon={<AlertTriangle  size={17} className="text-red-500"    />} accent="red"    />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-start sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto..." className="w-full sm:max-w-xs" />

        {/* Stock filter */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { key: 'todos',      label: 'Todos' },
            { key: 'con-stock',  label: 'Con stock' },
            { key: 'bajo-stock', label: 'Stock bajo' },
            { key: 'sin-stock',  label: 'Agotados' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStockFilter(f.key as typeof stockFilter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${stockFilter === f.key ? 'bg-white shadow-xs text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Categorías — select compacto */}
        {categorias.length > 0 && (
          <div className="relative">
            <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={catFilter === 'todas' ? '' : String(catFilter)}
              onChange={(e) => setCatFilter(e.target.value === '' ? 'todas' : Number(e.target.value))}
              className="pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">Todas las categorías</option>
              {categorias
                .filter((cat) => products.some((p) => p.categoria_id === cat.id))
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]">▾</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? 'Sin resultados' : 'Sin productos'}
          description={search ? `No hay productos que coincidan con "${search}"` : 'Crea tu primer producto'}
          action={!search && <Can permission="productos:create"><Button icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Nuevo producto</Button></Can>}
        />
      ) : viewMode === 'grid' ? (
        /* ── Grid view ──────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pg.paginated.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              catName={catName(p.categoria_id ?? undefined)}
              catIva={categorias.find((c) => c.id === p.categoria_id)?.iva}
              onEdit={() => setEditProduct(p)}
              onDelete={() => setDeleteId(p.id)}
              onPrices={() => setPricesProduct(p)}
            />
          ))}
        </div>
      ) : (
        /* ── Table view ─────────────────────────────────────────────────── */
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th className="hidden sm:table-cell">Código</Th>
                <Th>Presentaciones</Th>
                <Th className="hidden sm:table-cell">Stock</Th>
                <Th className="hidden md:table-cell">Precio base</Th>
                <Th className="hidden lg:table-cell">Categoría</Th>
                <Th className="hidden sm:table-cell">Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {pg.paginated.map((p) => {
                const cat   = categorias.find((c) => c.id === p.categoria_id)
                const stock = p.stock_total ?? 0
                const presentaciones = p.precios?.filter((pr: any) => pr.nombre !== 'Perdida' && pr.activo !== false) ?? []

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package size={13} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          {inlineEdit?.id === p.id && inlineEdit.field === 'nombre' ? (
                            <input
                              autoFocus
                              value={inlineEdit.value}
                              onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                              onBlur={() => inlineMutation.mutate({ id: p.id, data: { nombre: inlineEdit.value } })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') inlineMutation.mutate({ id: p.id, data: { nombre: inlineEdit.value } })
                                if (e.key === 'Escape') setInlineEdit(null)
                              }}
                              className="font-semibold text-slate-900 block truncate border-b border-blue-400 focus:outline-none bg-transparent w-full"
                            />
                          ) : (
                            <span
                              className="font-semibold text-slate-900 block truncate cursor-text"
                              title="Doble clic para editar"
                              onDoubleClick={() => setInlineEdit({ id: p.id, field: 'nombre', value: p.nombre })}
                            >
                              {p.nombre}
                            </span>
                          )}
                          <span className={`sm:hidden text-[10px] font-medium ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-yellow-600' : 't-text'}`}>
                            {stock === 0 ? 'Sin stock' : `${stock} u.`}
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-400 font-mono text-xs hidden sm:table-cell">
                      <div className="flex flex-col leading-tight">
                        <span>{p.codigo ?? '—'}</span>
                        {p.codigo_arancelario && (
                          <span className="text-[10px] text-slate-400/80" title="Código arancelario DIAN">
                            DIAN {p.codigo_arancelario}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      {/* Mobile: solo conteo */}
                      <span className="sm:hidden text-xs text-slate-500 whitespace-nowrap">
                        {presentaciones.length} precio{presentaciones.length !== 1 ? 's' : ''}
                      </span>
                      {/* Desktop: chips */}
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {presentaciones.slice(0, 3).map((pr: any) => (
                          <span key={pr.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 t-bg-xlt border t-border-lt rounded-md text-[10px] t-text-dk font-medium whitespace-nowrap">
                            {pr.nombre}
                          </span>
                        ))}
                        {presentaciones.length > 3 && (
                          <span className="text-[10px] text-slate-400 px-1 py-0.5">+{presentaciones.length - 3}</span>
                        )}
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell"><StockBadge stock={stock} /></Td>
                    <Td className="font-semibold text-slate-700 tabular-nums hidden md:table-cell">{formatCOP(p.precio_ponderado)}</Td>
                    <Td className="hidden lg:table-cell">
                      {cat ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{cat.nombre}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                              cat.iva === 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : cat.iva === 5
                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                            title="Tarifa IVA heredada de la categoría — se aplica al emitir factura"
                          >
                            IVA {cat.iva}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">Sin categoría · IVA 0%</span>
                      )}
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Badge variant={p.activo ? 'green' : 'gray'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-1 items-center">
                        <Button size="sm" variant="ghost" icon={<DollarSign size={13} />} onClick={() => setPricesProduct(p)} className="text-blue-500 hidden sm:inline-flex">
                          Precios
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Ver precios" icon={<DollarSign size={13} />} onClick={() => setPricesProduct(p)} className="text-blue-500 sm:hidden" />
                        <Can permission="productos:update">
                          <Button size="sm" variant="ghost" aria-label="Editar producto" icon={<Pencil size={13} />} onClick={() => setEditProduct(p)} />
                        </Can>
                        <Can permission="productos:delete">
                          <Button size="sm" variant="ghost" aria-label="Eliminar producto" icon={<Trash2 size={13} />} onClick={() => setDeleteId(p.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50" />
                        </Can>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          </div>
          <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between text-xs text-slate-500">
            <span>{filtered.length} producto{filtered.length !== 1 ? 's' : ''}</span>
            <span>Stock total: <strong className="text-slate-700">{stats.totalStock} u.</strong></span>
          </div>
        </Card>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ProductFormModal open={showCreate} onClose={() => setShowCreate(false)} categorias={categorias}
        onSubmit={(dto) => createMutation.mutate(dto)} loading={createMutation.isPending} title="Nuevo producto" showStock />

      {editProduct && (
        <ProductFormModal
          open={!!editProduct}
          onClose={() => setEditProduct(null)}
          categorias={categorias}
          defaultValues={{ nombre: editProduct.nombre, activo: editProduct.activo, codigo: editProduct.codigo ?? undefined, descripcion: editProduct.descripcion ?? undefined, categoria_id: editProduct.categoria_id ?? undefined, codigo_arancelario: (editProduct as any).codigo_arancelario ?? undefined }}
          onSubmit={(dto) => updateMutation.mutate({ id: editProduct.id, dto })}
          loading={updateMutation.isPending}
          title="Editar producto"
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar producto"
        message="¿Eliminar este producto? Se quitará del inventario permanentemente."
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteId !== null && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Precios modal */}
      <Modal
        open={!!pricesProduct}
        onClose={() => { setPricesProduct(null); setShowAddPrice(false) }}
        title={`Presentaciones — ${pricesProduct?.nombre ?? ''}`}
        size="lg"
        footer={
          <Can permission="precios:create">
            <Button icon={<Plus size={14} />} size="sm" onClick={() => setShowAddPrice(true)}>
              Añadir presentación
            </Button>
          </Can>
        }
      >
        {pricesLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : prices.length === 0 ? (
          <EmptyState title="Sin presentaciones" description="Añade la primera presentación de precio" />
        ) : (
          <div className="space-y-2">
            {prices.map((pr: ProductoPrecio) => {
              const isProtegido = pr.nombre === 'Unitario' || pr.nombre === 'Perdida'
              return (
                <div key={pr.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${isProtegido ? 'bg-slate-50/60 border-slate-100' : 'border-slate-200'}`}>
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Tag size={14} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{pr.nombre}</p>
                      {isProtegido && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">Protegido</span>}
                    </div>
                    {pr.cantidad > 1 && <p className="text-xs text-slate-400">{pr.cantidad} unidades por presentación</p>}
                  </div>
                  <p className="text-base font-bold text-slate-900 tabular-nums">{formatCOP(pr.precio)}</p>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Can permission="precios:update">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Editar precio"
                        icon={<Pencil size={13} />}
                        onClick={() => setEditPriceItem(pr)}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      />
                    </Can>
                    {!isProtegido && (
                      <Can permission="precios:delete">
                        <Button size="sm" variant="ghost" aria-label="Eliminar precio" icon={<Trash2 size={13} />} onClick={() => setDeletePriceId(pr.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50" />
                      </Can>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {showAddPrice && (
        <PriceFormModal
          open={showAddPrice}
          onClose={() => setShowAddPrice(false)}
          onSubmit={(dto) => addPriceMutation.mutate({ dto })}
          loading={addPriceMutation.isPending}
        />
      )}

      {editPriceItem && (
        <PriceFormModal
          open={!!editPriceItem}
          onClose={() => setEditPriceItem(null)}
          onSubmit={(dto) =>
            updatePriceMutation.mutate({
              priceId: editPriceItem.id,
              dto: { nombre: dto.nombre, precio: dto.precio, cantidad: dto.cantidad },
            })
          }
          loading={updatePriceMutation.isPending}
          defaultValues={{
            nombre: editPriceItem.nombre,
            precio: Number(editPriceItem.precio) || 0,
            cantidad: Number(editPriceItem.cantidad) || 1,
          }}
          isEdit
        />
      )}

      <ConfirmDialog
        open={deletePriceId !== null}
        title="Eliminar presentación"
        message="¿Eliminar esta presentación de precio? No se puede eliminar 'Unitario'."
        confirmLabel="Eliminar"
        danger
        loading={deletePriceMutation.isPending}
        onConfirm={() => deletePriceId !== null && deletePriceMutation.mutate(deletePriceId)}
        onCancel={() => setDeletePriceId(null)}
      />
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProductFormModalProps {
  open: boolean
  onClose: () => void
  categorias: { id: number; nombre: string; iva?: number }[]
  defaultValues?: Partial<ProductForm>
  onSubmit: (dto: CreateProductoDto) => void
  loading: boolean
  title: string
  showStock?: boolean  // true al crear, false al editar
}

function ProductFormModal({ open, onClose, categorias, defaultValues, onSubmit, loading, title, showStock = false }: ProductFormModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as unknown as Resolver<any>,
    defaultValues: {
      nombre:               defaultValues?.nombre              ?? '',
      codigo:               defaultValues?.codigo              ?? '',
      descripcion:          defaultValues?.descripcion         ?? '',
      categoria_id:         defaultValues?.categoria_id,
      activo:               defaultValues?.activo              ?? true,
      stock_inicial:        undefined,
      precio_costo_inicial: undefined,
      codigo_arancelario:   (defaultValues as any)?.codigo_arancelario ?? '',
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>Guardar</Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input label="Nombre *"      {...register('nombre')}      error={errors.nombre?.message} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Código interno" {...register('codigo')}      placeholder="Ej: AGU001" />
          <Input
            label="Código arancelario DIAN"
            {...register('codigo_arancelario')}
            placeholder="Ej: 2203.00.00.00"
            title="Partida arancelaria DIAN — aplica a productos importados"
          />
        </div>
        <Input label="Descripción"   {...register('descripcion')} placeholder="Descripción opcional..." />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Categoría</label>
          <select {...register('categoria_id')} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none bg-white">
            <option value="">Sin categoría (IVA 0%)</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}{c.iva !== undefined ? ` — IVA ${c.iva}%` : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            La categoría define el IVA que se aplica al producto en las facturas.
          </p>
        </div>
        <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
          <input type="checkbox" {...register('activo')} className="w-4 h-4 rounded" />
          <span className="text-slate-700 group-hover:text-slate-900">Activo</span>
        </label>

        {showStock && (
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock inicial (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Unidades"
                type="number"
                {...register('stock_inicial')}
                placeholder="0"
                error={errors.stock_inicial?.message}
              />
              <Input
                label="Costo total ($)"
                type="number"
                {...register('precio_costo_inicial')}
                placeholder="0"
                error={errors.precio_costo_inicial?.message}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Si ingresas unidades, se registra una compra de apertura para inicializar el inventario.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}

interface PriceFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (dto: PriceForm) => void
  loading: boolean
  defaultValues?: Partial<PriceForm>
  isEdit?: boolean
}

function PriceFormModal({ open, onClose, onSubmit, loading, defaultValues, isEdit = false }: PriceFormModalProps) {
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<PriceForm>({
    resolver: zodResolver(priceSchema) as unknown as Resolver<any>,
    defaultValues: {
      nombre: defaultValues?.nombre ?? '',
      precio: defaultValues?.precio ?? 0,
      cantidad: defaultValues?.cantidad ?? 0,
    },
  })

  // Estado local para evitar el bug NumberInput+RHF (ref.current.value formateado → coerce → valor incorrecto)
  const precioInput = useCurrencyInput(defaultValues?.precio ?? 0)
  const cantInput   = useCurrencyInput(defaultValues?.cantidad ?? 0)

  useEffect(() => {
    if (open) {
      reset({
        nombre: defaultValues?.nombre ?? '',
        precio: defaultValues?.precio ?? 0,
        cantidad: defaultValues?.cantidad ?? 0,
      })
      precioInput.setFromNumber(defaultValues?.precio ?? 0)
      cantInput.setFromNumber(defaultValues?.cantidad ?? 0)
    }
  }, [open, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar presentación' : 'Añadir presentación'} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>{isEdit ? 'Guardar' : 'Añadir'}</Button>
        </>
      }
    >
      <form className="space-y-4">
        <Input label="Nombre de la presentación *" {...register('nombre')} error={errors.nombre?.message} placeholder="Ej: Por 6, Media caja, Litro..." autoFocus />

        {/* Precio — estado local + setValue para que RHF reciba el entero limpio */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Precio de venta *</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 pointer-events-none">$</span>
            <input
              {...precioInput.inputProps}
              placeholder="0"
              onChange={(e) => {
                precioInput.inputProps.onChange(e)
                const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                setValue('precio', n, { shouldValidate: true })
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
            />
          </div>
          {errors.precio && <p className="text-xs text-red-600">{errors.precio.message}</p>}
        </div>

        {/* Cantidad — mismo patrón */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Unidades incluidas *</label>
          <input
            {...cantInput.inputProps}
            placeholder="1"
            onChange={(e) => {
              cantInput.inputProps.onChange(e)
              const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
              setValue('cantidad', n, { shouldValidate: true })
            }}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
          />
          {errors.cantidad && <p className="text-xs text-red-600">{errors.cantidad.message}</p>}
          <p className="text-xs text-slate-500">Cuántas unidades individuales contiene esta presentación</p>
        </div>
      </form>
    </Modal>
  )
}
