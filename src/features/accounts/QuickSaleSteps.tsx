/**
 * QuickSaleSteps — componentes presentacionales de la venta rápida.
 *
 * StepCart (búsqueda + carrito) y StepPayment (resumen + medio de pago).
 * Sin estado propio relevante: reciben todo por props desde useQuickSale.
 * Reutilizados por el flujo inline de venta rápida (QuickSaleInline).
 */
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Package } from 'lucide-react'
import { Input, Badge } from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import type { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'
import type { Producto, ProductoPrecio, MedioPago } from '@/shared/types'
import type { CartItem } from './useQuickSale'

// ─── Step 1: Cart ─────────────────────────────────────────────────────────────

export function StepCart({
  search, setSearch, searchRef, results, cart, total, onAdd, onUpdateQty, onRemove,
}: {
  search: string
  setSearch: (s: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  results: Producto[]
  cart: CartItem[]
  total: number
  onAdd: (p: Producto, pr: ProductoPrecio) => void
  onUpdateQty: (idx: number, delta: number) => void
  onRemove: (idx: number) => void
}) {
  return (
    <div className="space-y-4">
      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          autoFocus
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Resultados */}
      {search.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-52 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</div>
          ) : (
            results.map((prod) => <ProductResultRow key={prod.id} product={prod} onAdd={onAdd} />)
          )}
        </div>
      )}

      {/* Carrito */}
      {cart.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Carrito</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {cart.map((item, idx) => (
              <div
                key={`${item.producto.id}-${item.precio.id}`}
                className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.producto.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {item.precio.nombre} · {formatCOP(item.precio.precio)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onUpdateQty(idx, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{item.cantidad}</span>
                  <button
                    onClick={() => onUpdateQty(idx, 1)}
                    disabled={item.cantidad >= item.producto.stock_total}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors disabled:opacity-40"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-slate-700">
                    {formatCOP(item.precio.precio * item.cantidad)}
                  </span>
                  <button
                    onClick={() => onRemove(idx)}
                    className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-600">Total</span>
              <span className="text-base font-bold text-slate-900 tabular-nums">{formatCOP(total)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <ShoppingCart size={28} className="mb-2 opacity-40" />
          <p className="text-sm">Busca y agrega productos al carrito</p>
        </div>
      )}
    </div>
  )
}

function ProductResultRow({ product, onAdd }: { product: Producto; onAdd: (p: Producto, pr: ProductoPrecio) => void }) {
  const mainPrice = product.precios.find((p) => p.activo) ?? product.precios[0]
  if (!mainPrice) return null

  const hasMultiple = product.precios.filter((p) => p.activo).length > 1

  if (!hasMultiple) {
    return (
      <button
        onClick={() => onAdd(product, mainPrice)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Package size={14} className="text-slate-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{product.nombre}</p>
            <p className="text-xs text-slate-400">{mainPrice.nombre} · stock: {product.stock_total}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-slate-700 tabular-nums">{formatCOP(mainPrice.precio)}</span>
          <Plus size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    )
  }

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <Package size={11} />
          {product.nombre}
          <Badge variant="gray">stock: {product.stock_total}</Badge>
        </p>
      </div>
      {product.precios.filter((p) => p.activo).map((precio) => (
        <button
          key={precio.id}
          onClick={() => onAdd(product, precio)}
          className="w-full flex items-center justify-between px-4 py-2 pl-8 hover:bg-blue-50 transition-colors group"
        >
          <span className="text-sm text-slate-700">{precio.nombre}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">{formatCOP(precio.precio)}</span>
            <Plus size={13} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Step 2: Payment ──────────────────────────────────────────────────────────

export function StepPayment({
  cart, total, medios, selectedMedio, setSelectedMedio, montoInput,
}: {
  cart: CartItem[]
  total: number
  medios: MedioPago[]
  selectedMedio: MedioPago | null
  setSelectedMedio: (m: MedioPago) => void
  montoInput: ReturnType<typeof useCurrencyInput>
}) {
  const montoFinal = montoInput.numericValue() > 0 ? montoInput.numericValue() : total
  const cambio = montoFinal - total

  return (
    <div className="space-y-5">
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumen</p>
        {cart.map((item) => (
          <div key={`${item.producto.id}-${item.precio.id}`} className="flex justify-between text-sm">
            <span className="text-slate-600">
              {item.cantidad}× {item.producto.nombre}
              {item.precio.nombre !== 'Unidad' && <span className="text-slate-400"> ({item.precio.nombre})</span>}
            </span>
            <span className="font-medium tabular-nums">{formatCOP(item.precio.precio * item.cantidad)}</span>
          </div>
        ))}
        <div className="border-t border-slate-200 pt-2 flex justify-between">
          <span className="font-semibold text-slate-800">Total</span>
          <span className="font-bold text-slate-900 text-base tabular-nums">{formatCOP(total)}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Medio de pago</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {medios.filter((m) => m.activo).map((medio) => (
            <button
              key={medio.id}
              onClick={() => setSelectedMedio(medio)}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                selectedMedio?.id === medio.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-400'
                  : 'border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              <TipoIcon tipo={medio.tipo} />
              <span className="block mt-0.5">{medio.nombre}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedMedio?.tipo === 'EFECTIVO' && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monto recibido</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {[total, 5000, 10000, 20000, 50000, 100000]
              .filter((v, i, arr) => v >= total || i === 0 || (v > total && arr.slice(0, i).every((x) => x <= total)))
              .slice(0, 5)
              .map((preset) => (
                <button
                  key={preset}
                  onClick={() => montoInput.setFromNumber(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    montoInput.numericValue() === preset || (montoInput.numericValue() === 0 && preset === total)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {formatCOP(preset)}
                </button>
              ))}
          </div>
          <Input {...montoInput.inputProps} placeholder={total.toLocaleString('es-CO')} />
          {cambio > 0 && (
            <p className="mt-1.5 text-sm text-green-700 font-semibold">Cambio: {formatCOP(cambio)}</p>
          )}
          {cambio < 0 && (
            <p className="mt-1.5 text-sm text-red-600 font-semibold">Falta: {formatCOP(-cambio)}</p>
          )}
        </div>
      )}
    </div>
  )
}

function TipoIcon({ tipo }: { tipo: string }) {
  const cls = 'text-slate-400 mb-0.5'
  if (tipo === 'EFECTIVO') return <span className={cls}>💵</span>
  if (tipo === 'TARJETA') return <span className={cls}>💳</span>
  if (tipo === 'TRANSFERENCIA') return <span className={cls}>📲</span>
  return <span className={cls}>💱</span>
}
