/**
 * Combobox — input con búsqueda + dropdown filtrable (genérico, reutilizable).
 *
 * UX:
 *  - Escribe para filtrar en vivo (por el texto que devuelva `toText`).
 *  - Click / focus abre el dropdown completo aunque no haya texto.
 *  - Flechas ↑↓ navegan, Enter selecciona, Esc cierra.
 *  - Click fuera cierra sin perder la selección actual.
 *
 * SRP: solo maneja la interacción del combobox. El filtrado y el render de cada
 * item los define quien lo usa (DIP — depende de funciones inyectadas).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface ComboboxProps<T> {
  items: T[]
  value: T | null
  onChange: (item: T | null) => void
  /** Texto buscable de cada item (se compara en minúsculas, sin acentos). */
  toText: (item: T) => string
  /** Clave única estable por item. */
  toKey: (item: T) => string | number
  /** Render de cada opción en el dropdown. */
  renderItem: (item: T) => ReactNode
  /** Texto a mostrar en el input cuando hay selección. */
  renderSelected?: (item: T) => string
  placeholder?: string
  label?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  /**
   * Si hay un item ya seleccionado y el dropdown está cerrado,
   * un Enter dispara este callback (ej: confirmar/crear con el item activo).
   */
  onEnterWithSelection?: () => void
}

function normalize(s: string): string {
  // Quita acentos para que "lopez" matchee "López"
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function Combobox<T>({
  items,
  value,
  onChange,
  toText,
  toKey,
  renderItem,
  renderSelected,
  placeholder = 'Buscar…',
  label,
  emptyText = 'Sin resultados',
  disabled = false,
  className = '',
  onEnterWithSelection,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return items
    return items.filter((it) => normalize(toText(it)).includes(q))
  }, [items, query, toText])

  // Reset highlight cuando cambia el filtro
  useEffect(() => { setHighlight(0) }, [query])

  function select(item: T) {
    onChange(item)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Dropdown cerrado: Enter con item seleccionado → disparar onEnterWithSelection
    if (!open && e.key === 'Enter' && value && onEnterWithSelection) {
      e.preventDefault()
      onEnterWithSelection()
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[highlight]
      if (item) select(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  // Scroll del item resaltado a la vista
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const displayValue = value
    ? (renderSelected ? renderSelected(value) : toText(value))
    : ''

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      )}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : displayValue}
          placeholder={value ? displayValue : placeholder}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-16 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
          role="combobox"
          aria-expanded={open}
          aria-controls="combobox-list"
          autoComplete="off"
          autoFocus
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => { onChange(null); setQuery(''); inputRef.current?.focus() }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
              aria-label="Limpiar selección"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setOpen((o) => !o); inputRef.current?.focus() }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            aria-label="Abrir lista"
          >
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <ul
          id="combobox-list"
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1 animate-fade-in"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-400 text-center">{emptyText}</li>
          ) : (
            filtered.map((it, idx) => (
              <li
                key={toKey(it)}
                role="option"
                aria-selected={idx === highlight}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => { e.preventDefault(); select(it) }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  idx === highlight ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                }`}
              >
                {renderItem(it)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
