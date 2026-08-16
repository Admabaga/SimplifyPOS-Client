import { useState, useEffect } from 'react'
import { useProductFilters } from './useProductFilters'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import {
  Pencil, Trash2, DollarSign, Plus, Package,
  LayoutGrid, List, Tag,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  PageHeader, Button, Input, Table, Th, Td, Badge, Spinner, EmptyState,
  Modal, ModalSection, ConfirmDialog, Card, SearchInput, Pagination,
} from '@/shared/components/ui'
import { usePagination } from '@/shared/hooks/usePagination'
import Can from '@/shared/components/Can'
import { formatCOP } from '@/shared/lib/formatters'
import { apiError } from '@/shared/lib/apiError'
import type { Producto, ProductoPrecio } from '@/shared/types'
import { productsApi } from './api'
import type { CreateProductoDto, UpdateProductoDto, CreateProductoPrecioDto, UpdateProductoPrecioDto } from './api'
import { categoriasApi } from '@/features/categories/api'
import { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const productSchema = z.object({
  nombre:               z.string().min(1, 'Requerido'),
  codigo:               z.string().optional(),
  descripcion:          z.string().optional(),
  categoria_id:         z.coerce.number().optional(),
  activo:               z.boolean().default(true),
  precio_venta:         z.coerce.number().min(0).optional(),
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

// ─── Stock: lectura tipo instrumento ─────────────────────────────────────────
// Quien atiende necesita responder "¿cuánto tengo?" en una fracción de segundo,
// con el cliente enfrente. Por eso la CANTIDAD es el elemento dominante (número
// tabular, alineado en columna para comparar de un vistazo) y el color es solo
// confirmación — nunca el único canal (número + barra + texto en los estados
// que exigen atención).

const STOCK_LOW = 5       // umbral de negocio (mismo que stats y filtros)
const STOCK_FULL = 20     // referencia de "lleno" para la barra

function stockTone(stock: number) {
  if (stock === 0)
    return { bar: 'bg-red-500',   rail: 'bg-red-100',   num: 'text-red-600',    label: 'Agotado',    stripe: 'border-l-red-400' }
  if (stock <= STOCK_LOW)
    return { bar: 'bg-amber-500', rail: 'bg-amber-100', num: 'text-amber-700',  label: 'Stock bajo', stripe: 'border-l-amber-400' }
  return   { bar: 't-bg',         rail: 'bg-slate-100', num: 'text-slate-900',  label: '',           stripe: 'border-l-transparent' }
}

/** Medidor de existencias: número + barra de nivel. El estado normal es
 *  silencioso; solo lo que necesita atención se anuncia con texto. */
function StockGauge({ stock, compact = false }: { stock: number; compact?: boolean }) {
  const t = stockTone(stock)
  const pct = stock === 0 ? 0 : Math.max(6, Math.min(100, (stock / STOCK_FULL) * 100))
  const title = `${stock} unidades${t.label ? ` — ${t.label}` : ''}`

  return (
    <div className={compact ? 'w-full' : 'min-w-[86px]'} title={title}>
      <div className="flex items-baseline gap-1">
        <span
          className={`num font-bold leading-none ${compact ? 'text-[19px]' : 'text-[22px]'} ${t.num}`}
        >
          {stock}
        </span>
        <span className="text-[10px] font-medium text-slate-400">uds</span>
      </div>
      <div
        className={`mt-1.5 h-[3px] w-full overflow-hidden rounded-full ${t.rail}`}
        role="meter"
        aria-valuenow={stock}
        aria-valuemin={0}
        aria-label={title}
      >
        <div className={`h-full rounded-full ${t.bar} transition-[width] duration-500 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      {t.label && (
        <span className={`mt-1 block text-[10px] font-medium ${stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>
          {t.label}
        </span>
      )}
    </div>
  )
}

// ─── StatusReadout ────────────────────────────────────────────────────────────
// Lectura de estado que además filtra. Es un botón real (Enter/Espacio, foco
// visible, aria-pressed) — la superficie es distinta, el comportamiento no.

function StatusReadout({
  label, value, tone, active, onClick, hint,
}: {
  label: string
  value: number
  tone: 'ok' | 'low' | 'out'
  active: boolean
  onClick: () => void
  hint?: string
}) {
  const tones = {
    ok:  { dot: 't-bg',          num: 'text-slate-900', on: 'bg-slate-50' },
    low: { dot: 'bg-amber-500',  num: 'text-amber-700', on: 'bg-amber-50/70' },
    out: { dot: 'bg-red-500',    num: 'text-red-600',   on: 'bg-red-50/60' },
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label} — clic para filtrar`}
      className={`relative min-w-0 px-4 py-3.5 text-left transition-colors sm:min-w-[124px] sm:px-5 sm:py-5 ${
        active ? tones.on : 'hover:bg-slate-50'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400`}
    >
      {/* Marca de "filtro activo": la franja se lee sin depender del color de fondo */}
      <span
        className={`absolute inset-x-0 bottom-0 h-0.5 transition-opacity ${tones.dot} ${active ? 'opacity-100' : 'opacity-0'}`}
      />
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tones.dot}`} />
        <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      </span>
      <span className={`mt-1.5 block num text-[26px] font-bold leading-none sm:text-[30px] ${tones.num}`}>
        {value}
      </span>
      {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
    </button>
  )
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
  const tone = stockTone(stock)

  return (
    <Card
      padding={false}
      // h-full + flex-col: la grilla estira las tarjetas a la altura de la fila,
      // pero sin esto el contenido no ocupa el alto y la banda de acciones
      // quedaba flotando a media tarjeta en las que tienen menos presentaciones.
      className={`group flex h-full flex-col overflow-hidden border-l-2 ${tone.stripe} transition-all duration-200 hover:border-slate-300 hover:shadow-md`}
    >
      <div className="flex-1 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 transition-colors group-hover:bg-white group-hover:ring-1 group-hover:ring-slate-200">
          <Package size={18} className="text-slate-500" />
        </div>
        <div className="w-[92px] shrink-0"><StockGauge stock={stock} compact /></div>
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
            <p className="text-xs text-slate-400 num">#{product.codigo}</p>
          )}
          {product.codigo_arancelario && (
            <p
              className="text-[10px] text-slate-400 num"
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
          {product.precios.filter((p) => p.nombre !== 'Perdida' && p.activo !== false).slice(0, 3).map((pr) => (
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

      </div>

      {/* Banda de acciones: separada por superficie, no solo por una línea */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <div className="min-w-0">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">Precio base</span>
          <span className="block num text-[15px] font-bold text-slate-800">{formatCOP(product.precio_ponderado)}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="xs" variant="ghost" icon={<DollarSign size={12} />} onClick={onPrices} className="text-blue-500">
            Precios
          </Button>
          <Can permission="productos:update">
            <Button size="xs" variant="ghost" aria-label="Editar producto" icon={<Pencil size={12} />} onClick={onEdit} />
          </Can>
          <Can permission="productos:delete">
            <Button size="xs" variant="ghost" aria-label="Eliminar producto" icon={<Trash2 size={12} />} onClick={onDelete} className="text-red-400 hover:text-red-600 hover:bg-red-50" />
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
  const [deleteProd, setDeleteProd]         = useState<Producto | null>(null)
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
    mutationFn: async (dto: CreateProductoDto & { precio_venta?: number }) => {
      const { precio_venta, ...productoDto } = dto
      const nuevo = await productsApi.create(productoDto)
      // Crea la presentación de venta unitaria automáticamente (ahorra el paso
      // de ir a "Precios" → añadir "Unidad" manualmente).
      if (precio_venta != null && precio_venta > 0) {
        await productsApi.addPrice(nuevo.id, { nombre: 'Unidad', precio: precio_venta, cantidad: 1 })
      }
      return nuevo
    },
    onSuccess: () => {
      // Invalidamos para refrescar precio_ponderado/presentaciones del producto nuevo.
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto creado')
      setShowCreate(false)
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Error al crear producto')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateProductoDto }) => productsApi.update(id, dto),
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
    onError: (err: unknown, _id, ctx) => {
      qc.setQueryData(['products'], ctx?.prev)
      toast.error(apiError(err, 'Error al eliminar'))
    },
    onSuccess: () => { toast.success('Producto eliminado'); setDeleteProd(null) },
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
    onError: (err: unknown, _id, ctx) => {
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

  // ── Stats + Filtrado (extraídos a useProductFilters) ─────────────────────
  const { stats, filtered } = useProductFilters(products, search, catFilter, stockFilter)

  const pg = usePagination(filtered)

  const catName = (id?: number) => categorias.find((c) => c.id === id)?.nombre

  return (
    <div>
      <PageHeader
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

      {/* ── Franja de instrumentos ────────────────────────────────────────────
          Una sola superficie en vez de 4 tarjetas sueltas: el dato que manda
          (unidades en inventario) domina por escala, y los estados que exigen
          acción son botones que filtran la tabla — leer y actuar en un gesto. */}
      <Card padding={false} className="mb-5 overflow-hidden">
        <div className="flex flex-col divide-y divide-slate-100 sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
          {/* Lectura dominante */}
          <div className="flex-1 p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Unidades en inventario
            </p>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="num text-[36px] font-bold leading-none tracking-[-0.03em] text-slate-900 sm:text-[44px]">
                {stats.totalStock.toLocaleString('es-CO')}
              </span>
              <span className="text-xs font-medium text-slate-400">unidades</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <span className="num font-bold text-slate-700">{stats.activos}</span> activos
              {' de '}
              <span className="num">{stats.total}</span> en catálogo
            </p>
          </div>

          {/* Estados accionables */}
          <div className="grid grid-cols-3 sm:flex sm:divide-x sm:divide-slate-100">
            <StatusReadout
              label="Sin alertas"
              value={Math.max(0, stats.activos - stats.stockBajo - stats.sinStock)}
              tone="ok"
              active={stockFilter === 'con-stock'}
              onClick={() => setStockFilter(stockFilter === 'con-stock' ? 'todos' : 'con-stock')}
            />
            <StatusReadout
              label="Stock bajo"
              hint="≤ 5 u."
              value={stats.stockBajo}
              tone="low"
              active={stockFilter === 'bajo-stock'}
              onClick={() => setStockFilter(stockFilter === 'bajo-stock' ? 'todos' : 'bajo-stock')}
            />
            <StatusReadout
              label="Agotados"
              value={stats.sinStock}
              tone="out"
              active={stockFilter === 'sin-stock'}
              onClick={() => setStockFilter(stockFilter === 'sin-stock' ? 'todos' : 'sin-stock')}
            />
          </div>
        </div>
      </Card>

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
              onDelete={() => setDeleteProd(p)}
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
                <Th className="pl-5 tracking-[0.1em]">Producto</Th>
                <Th className="hidden sm:table-cell tracking-[0.1em]">Código</Th>
                <Th className="tracking-[0.1em]">Presentaciones</Th>
                <Th className="hidden sm:table-cell tracking-[0.1em]">Existencias</Th>
                <Can permission="users:create_supervisor"><Th className="hidden md:table-cell text-right tracking-[0.1em]">Precio base</Th></Can>
                <Th className="hidden xl:table-cell tracking-[0.1em]">Categoría</Th>
                <Th className="hidden sm:table-cell tracking-[0.1em]">Estado</Th>
                <Th className="text-right tracking-[0.1em]">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {pg.paginated.map((p) => {
                const cat   = categorias.find((c) => c.id === p.categoria_id)
                const stock = p.stock_total ?? 0
                const presentaciones = p.precios?.filter((pr) => pr.nombre !== 'Perdida' && pr.activo !== false) ?? []

                const tone = stockTone(stock)

                return (
                  <tr key={p.id} className="group hover:bg-slate-50/70 transition-colors">
                    <Td className={`border-l-2 ${tone.stripe} pl-4`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-white group-hover:ring-1 group-hover:ring-slate-200 flex items-center justify-center shrink-0 transition-all">
                          <Package size={13} className="text-slate-400" />
                        </div>
                        <div className="min-w-0 max-w-[200px]">
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
                          {/* Móvil: la columna Existencias se oculta, así que el
                              nivel viaja aquí — mismo lenguaje visual, menos espacio. */}
                          <span className="sm:hidden mt-1 flex items-center gap-1.5">
                            <span className={`num text-[13px] font-bold ${tone.num}`}>
                              {stock}<span className="ml-0.5 font-sans text-[9px] font-medium text-slate-400">uds</span>
                            </span>
                            <span className={`h-[3px] w-10 overflow-hidden rounded-full ${tone.rail}`}>
                              <span
                                className={`block h-full rounded-full ${tone.bar}`}
                                style={{ width: `${stock === 0 ? 0 : Math.max(6, Math.min(100, (stock / STOCK_FULL) * 100))}%` }}
                              />
                            </span>
                            {tone.label && (
                              <span className={`text-[9px] font-medium ${stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                {tone.label}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      {/* Los EAN de 13-22 dígitos empujaban la tabla hasta forzar
                          scroll horizontal. Se truncan y el valor completo queda
                          en el tooltip — el código rara vez se lee entero de un vistazo. */}
                      <div className="flex max-w-[112px] flex-col gap-0.5 leading-tight">
                        <span className="num truncate text-[13px] text-slate-500" title={p.codigo ?? undefined}>
                          {p.codigo ?? '—'}
                        </span>
                        {p.codigo_arancelario && (
                          <span
                            className="w-fit max-w-full truncate rounded bg-slate-50 px-1 py-px num text-[9px] tabular-nums text-slate-400 ring-1 ring-slate-200/70"
                            title={`Código arancelario DIAN: ${p.codigo_arancelario}`}
                          >
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
                      {/* Desktop: presentación + precio — el nombre solo obligaba
                          a abrir "Precios" para saber a cuánto se vende. */}
                      <div className="hidden max-w-[158px] sm:flex flex-wrap gap-1">
                        {presentaciones.slice(0, 2).map((pr) => (
                          <span
                            key={pr.id}
                            className="inline-flex items-baseline gap-1 rounded-md border t-border-lt t-bg-xlt px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap t-text-dk"
                          >
                            {pr.nombre}
                            <span className="num opacity-70">{formatCOP(pr.precio)}</span>
                          </span>
                        ))}
                        {presentaciones.length > 2 && (
                          <button
                            onClick={() => setPricesProduct(p)}
                            className="rounded-md px-1 py-0.5 text-[10px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Ver todas las presentaciones"
                          >
                            +{presentaciones.length - 2}
                          </button>
                        )}
                        {presentaciones.length === 0 && (
                          <span className="text-[10px] text-slate-300">Sin precio</span>
                        )}
                      </div>
                    </Td>
                    <Td className="hidden sm:table-cell"><StockGauge stock={stock} /></Td>
                    <Can permission="users:create_supervisor"><Td className="hidden md:table-cell text-right num text-[15px] font-bold text-slate-800">{formatCOP(p.precio_ponderado)}</Td></Can>
                    <Td className="hidden xl:table-cell">
                      {cat ? (
                        <div className="flex max-w-[124px] items-center gap-1.5 flex-wrap">
                          <span
                            className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                            title={cat.nombre}
                          >
                            {cat.nombre}
                          </span>
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
                      <div className="flex gap-1 items-center justify-end">
                        <Button size="sm" variant="ghost" icon={<DollarSign size={13} />} onClick={() => setPricesProduct(p)} className="text-blue-500 hidden sm:inline-flex">
                          Precios
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Ver precios" icon={<DollarSign size={13} />} onClick={() => setPricesProduct(p)} className="text-blue-500 sm:hidden" />
                        <Can permission="productos:update">
                          <Button size="sm" variant="ghost" aria-label="Editar producto" icon={<Pencil size={13} />} onClick={() => setEditProduct(p)} />
                        </Can>
                        <Can permission="productos:delete">
                          <Button size="sm" variant="ghost" aria-label="Eliminar producto" icon={<Trash2 size={13} />} onClick={() => setDeleteProd(p)} className="text-red-400 hover:text-red-600 hover:bg-red-50" />
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
          <div className="flex justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
            <span>
              <span className="num font-bold text-slate-700">{filtered.length}</span>
              {' '}producto{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== products.length && <span className="text-slate-400"> de {products.length}</span>}
            </span>
            <span>
              Stock total{' '}
              <span className="num font-bold text-slate-700">
                {stats.totalStock.toLocaleString('es-CO')}
              </span>{' '}unidades
            </span>
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
          defaultValues={{
            nombre: editProduct.nombre,
            activo: editProduct.activo,
            codigo: editProduct.codigo ?? undefined,
            descripcion: editProduct.descripcion ?? undefined,
            categoria_id: editProduct.categoria_id ?? undefined,
            codigo_arancelario: (editProduct as any).codigo_arancelario ?? undefined,
            stock_inicial: editProduct.stock_total ?? 0,
          }}
          stockActual={editProduct.stock_total ?? 0}
          onSubmit={({ precio_venta: _pv, stock_inicial, precio_costo_inicial: _pc, ...rest }) =>
            updateMutation.mutate({
              id: editProduct.id,
              dto: { ...rest, ...(stock_inicial !== undefined ? { stock_ajuste: stock_inicial } : {}) },
            })
          }
          loading={updateMutation.isPending}
          title="Editar producto"
        />
      )}

      <ConfirmDialog
        open={!!deleteProd}
        title="Eliminar producto"
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Se eliminará el producto y todas sus presentaciones de precio del inventario.</p>
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Producto</span>
                <span className="font-medium">{deleteProd?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stock total</span>
                <span className="font-medium">{deleteProd?.stock_total ?? 0} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Precio base</span>
                <span className="font-medium">{deleteProd ? formatCOP(parseFloat(String(deleteProd.precio_ponderado))) : ''}</span>
              </div>
            </div>
            <p className="text-xs text-red-600 font-medium">Se eliminará del inventario permanentemente.</p>
          </div>
        }
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteProd && deleteMutation.mutate(deleteProd.id)}
        onCancel={() => setDeleteProd(null)}
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
  onSubmit: (dto: CreateProductoDto & { precio_venta?: number }) => void
  loading: boolean
  title: string
  showStock?: boolean   // true al crear → muestra precio + stock inicial
  stockActual?: number  // si se pasa → modo edición: muestra campo de ajuste de stock
}

function ProductFormModal({ open, onClose, categorias, defaultValues, onSubmit, loading, title, showStock = false, stockActual }: ProductFormModalProps) {
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as unknown as Resolver<any>,
    defaultValues: {
      nombre:               defaultValues?.nombre              ?? '',
      codigo:               defaultValues?.codigo              ?? '',
      descripcion:          defaultValues?.descripcion         ?? '',
      categoria_id:         defaultValues?.categoria_id,
      activo:               defaultValues?.activo              ?? true,
      precio_venta:         undefined,
      stock_inicial:        undefined,
      precio_costo_inicial: undefined,
      codigo_arancelario:   (defaultValues as any)?.codigo_arancelario ?? '',
    },
  })

  const precioVentaInput  = useCurrencyInput(0)
  const stockInicialInput = useCurrencyInput(0)
  const costoPrecioInput  = useCurrencyInput(0)

  useEffect(() => {
    if (open) {
      reset({
        nombre:               defaultValues?.nombre              ?? '',
        codigo:               defaultValues?.codigo              ?? '',
        descripcion:          defaultValues?.descripcion         ?? '',
        categoria_id:         defaultValues?.categoria_id,
        activo:               defaultValues?.activo              ?? true,
        precio_venta:         undefined,
        stock_inicial:        stockActual ?? undefined,
        precio_costo_inicial: undefined,
        codigo_arancelario:   (defaultValues as any)?.codigo_arancelario ?? '',
      })
      precioVentaInput.setFromNumber(0)
      stockInicialInput.setFromNumber(stockActual ?? 0)
      costoPrecioInput.setFromNumber(0)
    }
  }, [open, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      eyebrow="Inventario"
      icon={<Package size={17} />}
      description="La categoría define el IVA; el precio de venta crea la presentación «Unidad»."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(onSubmit)}>Guardar</Button>
        </>
      }
    >
      {/* onSubmit preventDefault: pistola de barras envía Enter — evita submit prematuro */}
      <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
        <ModalSection title="Identificación" className="space-y-3.5">
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
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm group">
          <input type="checkbox" {...register('activo')} className="w-4 h-4 rounded" />
          <span className="text-slate-700 group-hover:text-slate-900">Activo</span>
        </label>
        </ModalSection>

        {/* Ajuste de stock — solo en modo edición */}
        {stockActual !== undefined && (
          <ModalSection title="Inventario" className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Cantidad en stock</label>
            <input
              {...stockInicialInput.inputProps}
              placeholder="0"
              onChange={(e) => {
                stockInicialInput.inputProps.onChange(e)
                const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                setValue('stock_inicial', n, { shouldValidate: true })
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
            />
            <p className="text-[11px] text-slate-400">
              Ajusta las unidades disponibles (valor actual: {stockActual}).
            </p>
          </ModalSection>
        )}

        {showStock && (
          <ModalSection title="Precio de venta" className="space-y-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Valor de venta unitaria ($)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 pointer-events-none">$</span>
                <input
                  {...precioVentaInput.inputProps}
                  placeholder="0"
                  onChange={(e) => {
                    precioVentaInput.inputProps.onChange(e)
                    const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                    setValue('precio_venta', n || undefined, { shouldValidate: true })
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
                />
              </div>
              {errors.precio_venta && <p className="text-xs text-red-600">{errors.precio_venta.message}</p>}
            </div>
            <p className="text-[11px] text-slate-400">
              Se crea automáticamente la presentación <span className="font-medium">«Unidad»</span> con
              este precio. Luego puedes añadir más presentaciones (paca, media, etc.) en «Precios».
            </p>
          </ModalSection>
        )}

        {showStock && (
          <ModalSection title="Stock inicial" description="Opcional — si ingresas unidades se registra una compra de apertura." className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Unidades</label>
                <input
                  {...stockInicialInput.inputProps}
                  placeholder="0"
                  onChange={(e) => {
                    stockInicialInput.inputProps.onChange(e)
                    const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                    setValue('stock_inicial', n || undefined, { shouldValidate: true })
                    // Total = costo unitario × unidades
                    const costoUnit = costoPrecioInput.numericValue()
                    setValue('precio_costo_inicial', costoUnit * n || undefined, { shouldValidate: true })
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
                />
                {errors.stock_inicial && <p className="text-xs text-red-600">{errors.stock_inicial.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Costo unitario ($)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 pointer-events-none">$</span>
                  <input
                    {...costoPrecioInput.inputProps}
                    placeholder="0"
                    onChange={(e) => {
                      costoPrecioInput.inputProps.onChange(e)
                      const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
                      // Guardamos el TOTAL (costo unitario × unidades) que espera el backend
                      const unidades = stockInicialInput.numericValue()
                      setValue('precio_costo_inicial', n * unidades || undefined, { shouldValidate: true })
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
                  />
                </div>
                {errors.precio_costo_inicial && <p className="text-xs text-red-600">{errors.precio_costo_inicial.message}</p>}
              </div>
            </div>
            {stockInicialInput.numericValue() > 0 && costoPrecioInput.numericValue() > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <span className="text-xs text-slate-500">
                  {stockInicialInput.numericValue().toLocaleString('es-CO')} uds × ${costoPrecioInput.numericValue().toLocaleString('es-CO')}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  Costo total: ${(stockInicialInput.numericValue() * costoPrecioInput.numericValue()).toLocaleString('es-CO')}
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Ingresa el costo <span className="font-medium">por unidad</span> — se multiplica por las unidades.
            </p>
          </ModalSection>
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
