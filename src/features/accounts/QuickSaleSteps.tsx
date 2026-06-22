/**
 * QuickSaleSteps — componentes presentacionales de la venta rápida.
 *
 * StepCart (búsqueda + carrito) y StepPayment (resumen + medio de pago).
 * Sin estado propio relevante: reciben todo por props desde useQuickSale.
 * Reutilizados por el flujo inline de venta rápida (QuickSaleInline).
 */
import { useEffect, useRef, useState } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, X, Package, CreditCard, Banknote, Smartphone, Repeat2 } from 'lucide-react'
import { Input, Badge } from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import type { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'
import type { Producto, ProductoPrecio, MedioPago } from '@/shared/types'
import type { CartItem } from './useQuickSale'

// ─── Step 1: Cart ─────────────────────────────────────────────────────────────

export function StepCart({
  search, setSearch, searchRef, results, cart, total, onAdd, onUpdateQty, onSetQty, onRemove,
}: {
  search: string
  setSearch: (s: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  results: Producto[]
  cart: CartItem[]
  total: number
  onAdd: (p: Producto, pr: ProductoPrecio) => void
  onUpdateQty: (idx: number, delta: number) => void
  onSetQty: (idx: number, qty: number) => void
  onRemove: (idx: number) => void
}) {
  const [highlight, setHighlight] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)

  // Abrir dropdown cuando hay texto o resultados
  const showDropdown = dropdownOpen && results.length > 0

  // Reset highlight al cambiar resultados
  useEffect(() => { setHighlight(0) }, [results])

  // Scroll al item resaltado
  useEffect(() => {
    if (!showDropdown || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, showDropdown])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') { setDropdownOpen(true); return }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const prod = results[highlight]
      if (prod) {
        const mainPrice = prod.precios.find((p) => p.activo) ?? prod.precios[0]
        if (mainPrice) { onAdd(prod, mainPrice); setDropdownOpen(false) }
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  // Aplanar resultados para navegación con flechas cuando hay múltiples precios
  const flatItems: { prod: Producto; precio: ProductoPrecio }[] = results.flatMap((p) => {
    const activos = p.precios.filter((pr) => pr.activo)
    return activos.length > 0 ? activos.map((pr) => ({ prod: p, precio: pr })) : []
  })

  return (
    <div className="space-y-3">
      {/* Buscador con combobox */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); setHighlight(0) }}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar producto por nombre o código..."
          autoFocus
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setDropdownOpen(false); searchRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}

        {/* Dropdown de resultados */}
        {showDropdown && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-40 top-full mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 animate-fade-in"
          >
            {flatItems.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</li>
            ) : (
              flatItems.map(({ prod, precio }, idx) => (
                <li
                  key={`${prod.id}-${precio.id}`}
                  role="option"
                  aria-selected={idx === highlight}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => { e.preventDefault(); onAdd(prod, precio); setDropdownOpen(false) }}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                    idx === highlight ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${idx === highlight ? 'bg-blue-100' : 'bg-slate-100'}`}>
                      <Package size={11} className={idx === highlight ? 'text-blue-500' : 'text-slate-400'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{prod.nombre}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {precio.nombre !== 'Unidad' && `${precio.nombre} · `}Stock: {prod.stock_total}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-semibold tabular-nums">{formatCOP(precio.precio)}</span>
                    {idx === highlight && (
                      <span className="text-[9px] font-bold text-blue-500 bg-blue-100 rounded px-1 py-0.5">↵ Enter</span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

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
                  {/* Input manual de cantidad — editable directamente */}
                  <input
                    type="number"
                    min={1}
                    max={item.producto.stock_total}
                    value={item.cantidad}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      if (!isNaN(v)) onSetQty(idx, v)
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-10 text-center text-sm font-semibold tabular-nums border border-slate-200 rounded-lg py-0.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
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
  cart, total, medios, selectedMedio, setSelectedMedio, montoInput, compact = false,
}: {
  cart: CartItem[]
  total: number
  medios: MedioPago[]
  selectedMedio: MedioPago | null
  setSelectedMedio: (m: MedioPago) => void
  montoInput: ReturnType<typeof useCurrencyInput>
  /** Oculta el bloque "Resumen del pedido" (cuando el carrito ya se ve al lado). */
  compact?: boolean
}) {
  const montoRecibido = montoInput.numericValue()
  const comision = selectedMedio
    ? (total * (Number(selectedMedio.comision_porcentaje) / 100))
    : 0
  const totalNeto = total - comision
  const cambio = montoRecibido > total ? montoRecibido - total : 0
  const isEfectivo = selectedMedio?.tipo === 'EFECTIVO'

  // Presets de billetes útiles (el total exacto + billetes superiores comunes)
  const presetsEfectivo = (() => {
    const billetes = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000]
    const candidatos = [total, ...billetes.filter((b) => b > total)]
    return [...new Set(candidatos)].slice(0, 5)
  })()

  return (
    <div className="space-y-4">
      {/* ── Resumen del pedido ── */}
      {compact ? (
        <div className="flex items-center justify-between rounded-2xl t-bg-xlt border t-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold t-text uppercase tracking-wide">Total a cobrar</span>
            <span className="text-[11px] text-slate-400">
              · {cart.reduce((s, i) => s + i.cantidad, 0)} u.
            </span>
          </div>
          <span className="text-xl font-extrabold t-text-dk tabular-nums">{formatCOP(total)}</span>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Resumen</p>
          {cart.map((item) => (
            <div key={`${item.producto.id}-${item.precio.id}`} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[11px] font-bold text-slate-500 bg-slate-200 rounded-md px-1.5 py-0.5 tabular-nums">
                  ×{item.cantidad}
                </span>
                <span className="text-slate-700 truncate">{item.producto.nombre}</span>
                {item.precio.nombre !== 'Unidad' && (
                  <span className="text-[10px] text-slate-400 shrink-0">({item.precio.nombre})</span>
                )}
              </div>
              <span className="font-semibold tabular-nums text-slate-800 shrink-0 ml-2">
                {formatCOP(item.precio.precio * item.cantidad)}
              </span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800">Total a cobrar</span>
            <span className="text-lg font-extrabold text-slate-900 tabular-nums">{formatCOP(total)}</span>
          </div>
        </div>
      )}

      {/* ── Medio de pago — radio cards ── */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Medio de pago *</p>
        <div className="grid grid-cols-1 gap-2">
          {medios.filter((m) => m.activo).map((medio) => (
            <button
              key={medio.id}
              type="button"
              onClick={() => setSelectedMedio(medio)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-left ${
                selectedMedio?.id === medio.id
                  ? 't-border t-bg-xlt ring-1 ring-[var(--t-primary-ring)]'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedMedio?.id === medio.id ? 't-bg-lt' : 'bg-slate-100'
                }`}>
                  <MedioIcon tipo={medio.tipo} selected={selectedMedio?.id === medio.id} />
                </div>
                <span className="text-sm font-medium text-slate-800">{medio.nombre}</span>
              </div>
              {Number(medio.comision_porcentaje) > 0 && (
                <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-100 rounded-lg px-2 py-0.5">
                  {medio.comision_porcentaje}% comisión
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Monto recibido (solo efectivo) ── */}
      {isEfectivo && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Monto recibido</p>
          {/* Presets de billetes */}
          <div className="flex flex-wrap gap-1.5">
            {presetsEfectivo.map((preset) => {
              const isActive = montoRecibido === preset || (montoRecibido === 0 && preset === total)
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => montoInput.setFromNumber(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {preset === total ? `Exacto · ${formatCOP(preset)}` : formatCOP(preset)}
                </button>
              )
            })}
          </div>
          {/* Input manual */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none select-none">$</span>
            <input
              {...montoInput.inputProps}
              placeholder={total.toLocaleString('es-CO')}
              className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Vuelto */}
          {cambio > 0 && (
            <div className="p-3.5 t-bg-xlt border t-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💵</span>
                <div>
                  <p className="text-sm font-bold t-text-dk">Vuelto a dar</p>
                  <p className="text-[10px] t-text">
                    Se cobra {formatCOP(total)} · devolver {formatCOP(cambio)}
                  </p>
                </div>
              </div>
              <span className="text-xl font-extrabold t-text-dk tabular-nums">{formatCOP(cambio)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Comisión (medios con costo) ── */}
      {comision > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs space-y-1">
          <div className="flex justify-between text-orange-700">
            <span>Subtotal venta</span>
            <span className="font-semibold tabular-nums">{formatCOP(total)}</span>
          </div>
          <div className="flex justify-between text-orange-600">
            <span>Comisión {selectedMedio?.nombre} ({selectedMedio?.comision_porcentaje}%)</span>
            <span className="tabular-nums">−{formatCOP(comision)}</span>
          </div>
          <div className="flex justify-between text-orange-800 font-bold border-t border-orange-100 pt-1">
            <span>Ingreso neto</span>
            <span className="tabular-nums">{formatCOP(totalNeto)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function MedioIcon({ tipo, selected }: { tipo: string; selected: boolean }) {
  const cls = `w-4 h-4 ${selected ? 't-text' : 'text-slate-500'}`
  if (tipo === 'EFECTIVO') return <Banknote className={cls} />
  if (tipo === 'TARJETA') return <CreditCard className={cls} />
  if (tipo === 'TRANSFERENCIA') return <Smartphone className={cls} />
  return <Repeat2 className={cls} />
}

