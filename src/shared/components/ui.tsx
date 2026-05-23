/**
 * SimplifyPOS Design System — UI Components
 * Modern, accessible, responsive
 */
import React, {
  type ButtonHTMLAttributes, type ReactNode, type ReactElement,
  forwardRef, useEffect, useId, useRef, useState, isValidElement, cloneElement,
} from 'react'
import { clsx } from 'clsx'
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Calendar, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none shrink-0'
    const variants = {
      primary:   'bg-[var(--t-primary)] hover:bg-[var(--t-primary-dark)] active:opacity-90 text-white focus-visible:ring-[var(--t-primary)] shadow-sm hover:shadow-md',
      secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 focus-visible:ring-slate-400 shadow-xs',
      danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white focus-visible:ring-red-500 shadow-sm hover:shadow-md',
      ghost:     'hover:bg-slate-100 active:bg-slate-200 text-slate-600 focus-visible:ring-slate-400 font-medium',
      outline:   'border border-[var(--t-primary-light)] text-[var(--t-primary-dark)] hover:bg-[var(--t-primary-xlight)] active:bg-[var(--t-primary-light)] focus-visible:ring-[var(--t-primary)]',
    }
    const sizes = {
      xs: 'text-[11px] px-2 py-1 h-6 gap-1 font-medium',
      sm: 'text-xs px-3 py-1.5 h-8',
      md: 'text-sm px-4 py-2.5 h-10',
      lg: 'text-sm px-5 py-3 h-11',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin shrink-0" size={14} /> : icon && <span className="shrink-0 flex items-center">{icon}</span>}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  helper?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefix, suffix, className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined}
            className={clsx(
              'w-full px-4 py-2.5 rounded-lg border text-sm transition-all duration-150',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)]',
              error ? 'border-red-400 bg-red-50/50 text-red-900' : 'border-slate-200 bg-white hover:border-slate-300',
              prefix && 'pl-9',
              suffix && 'pr-9',
              className
            )}
            {...props}
          />
          {suffix && <span className="absolute right-3 text-slate-400 pointer-events-none flex items-center">{suffix}</span>}
        </div>
        {error && <p id={`${inputId}-err`} role="alert" className="text-xs text-red-600 flex items-center gap-1">{error}</p>}
        {helper && !error && <p id={`${inputId}-help`} className="text-xs text-slate-500">{helper}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── NumberInput ──────────────────────────────────────────────────────────────
// Igual que Input pero formatea números con separador de miles colombiano (.)
// Compatible con react-hook-form register + z.coerce.number()

export const NumberInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, prefix, suffix, className, id, onChange, onBlur, value, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId

    const format = (v: unknown): string => {
      if (v === undefined || v === null || v === '') return ''
      const str = String(v).replace(/[^0-9]/g, '')
      if (!str) return ''
      const n = parseInt(str, 10)
      return isNaN(n) ? '' : n.toLocaleString('es-CO')
    }

    const [display, setDisplay] = useState(() => format(value))

    useEffect(() => {
      setDisplay(format(value))
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '')
      setDisplay(raw ? parseInt(raw, 10).toLocaleString('es-CO') : '')
      onChange?.({ ...e, target: { ...e.target, value: raw } } as React.ChangeEvent<HTMLInputElement>)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setDisplay(format(display.replace(/[^0-9]/g, '')))
      onBlur?.(e)
    }

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && <span className="absolute left-3 text-slate-400 pointer-events-none flex items-center">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="numeric"
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined}
            value={display}
            onChange={handleChange}
            onBlur={handleBlur}
            className={clsx(
              'w-full px-4 py-2.5 rounded-lg border text-sm transition-all duration-150',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)]',
              error ? 'border-red-400 bg-red-50/50 text-red-900' : 'border-slate-200 bg-white hover:border-slate-300',
              prefix && 'pl-9',
              suffix && 'pr-9',
              className
            )}
            {...props}
          />
          {suffix && <span className="absolute right-3 text-slate-400 pointer-events-none flex items-center">{suffix}</span>}
        </div>
        {error && <p id={`${inputId}-err`} role="alert" className="text-xs text-red-600 flex items-center gap-1">{error}</p>}
        {helper && !error && <p id={`${inputId}-help`} className="text-xs text-slate-500">{helper}</p>}
      </div>
    )
  }
)
NumberInput.displayName = 'NumberInput'

// ─── Select ──────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const autoId = useId()
    const selectId = id ?? autoId
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg border text-sm transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-[var(--t-primary-ring)] focus:border-[var(--t-primary)] bg-white',
            error ? 'border-red-400' : 'border-slate-200 hover:border-slate-300',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, padding = true, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-slate-200/80 shadow-xs',
        padding && 'p-5',
        hover && 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  subValue?: React.ReactNode
  icon?: ReactNode
  iconBg?: string
  trend?: number        // % change, positive=up, negative=down
  trendLabel?: string
  accent?: 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'orange' | 'slate'
  onClick?: () => void
  className?: string
}

const accentMap = {
  green:  { gradient: 'from-green-50 to-green-50/30',   border: 'border-green-100',  iconColor: 'text-green-600' },
  blue:   { gradient: 'from-blue-50 to-blue-50/30',     border: 'border-blue-100',   iconColor: 'text-blue-600' },
  red:    { gradient: 'from-red-50 to-red-50/30',       border: 'border-red-100',    iconColor: 'text-red-600' },
  yellow: { gradient: 'from-yellow-50 to-yellow-50/30', border: 'border-yellow-100', iconColor: 'text-yellow-600' },
  purple: { gradient: 'from-purple-50 to-purple-50/30', border: 'border-purple-100', iconColor: 'text-purple-600' },
  orange: { gradient: 'from-orange-50 to-orange-50/30', border: 'border-orange-100', iconColor: 'text-orange-600' },
  slate:  { gradient: 'from-slate-50 to-white',         border: 'border-slate-200',  iconColor: 'text-slate-600' },
}

export function StatCard({ label, value, subValue, icon, iconBg: _iconBg, trend, trendLabel, accent = 'green', onClick, className }: StatCardProps) {
  const ac = accentMap[accent]
  const trendUp   = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0
  const trendFlat = trend !== undefined && trend === 0

  // Tintar el icono con el color del accent (preservando className previo)
  const tintedIcon = isValidElement(icon)
    ? cloneElement(icon as ReactElement<{ className?: string }>, {
        className: clsx((icon.props as { className?: string }).className, ac.iconColor),
      })
    : icon

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br p-3 sm:p-4 flex flex-col justify-between min-h-[100px] sm:min-h-[110px] transition-all',
        ac.border,
        ac.gradient,
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className,
      )}
    >
      {icon && (
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
            {tintedIcon}
          </div>
        </div>
      )}
      <div className={clsx(icon && 'mt-3')}>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-none truncate">{value}</p>
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1.5 leading-tight">{label}</p>
        {subValue && <p className="text-[10px] text-slate-400 mt-1 leading-tight">{subValue}</p>}
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1.5">
            {trendUp   && <TrendingUp   size={11} className="text-green-600" />}
            {trendDown && <TrendingDown size={11} className="text-red-500" />}
            {trendFlat && <Minus        size={11} className="text-slate-400" />}
            <span className={clsx(
              'text-[11px] font-semibold',
              trendUp   && 'text-green-600',
              trendDown && 'text-red-500',
              trendFlat && 'text-slate-400',
            )}>
              {trendUp ? '+' : ''}{trend.toFixed(1)}%
            </span>
            {trendLabel && <span className="text-[10px] text-slate-400">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'green' | 'red' | 'yellow' | 'gray' | 'blue' | 'purple' | 'orange'
  children: ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ variant = 'gray', children, className, dot }: BadgeProps) {
  const variants = {
    green:  'bg-green-50 text-green-700 ring-1 ring-green-600/20',
    red:    'bg-red-50 text-red-700 ring-1 ring-red-600/20',
    yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20',
    gray:   'bg-slate-50 text-slate-600 ring-1 ring-slate-500/20',
    blue:   'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
    orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
  }
  const dots = {
    green: 't-bg', red: 'bg-red-500', yellow: 'bg-yellow-500',
    gray: 'bg-slate-400', blue: 'bg-blue-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
  }
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant], className
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dots[variant])} />}
      {children}
    </span>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number   // 0–100
  color?: string
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, color = 'bg-green-500', label, showValue, size = 'sm' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-slate-500">{label}</span>}
          {showValue && <span className="text-xs font-medium text-slate-700">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={clsx('w-full bg-slate-100 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Loader2
      size={size}
      className={clsx('animate-spin t-text', className)}
      aria-label="Cargando"
      role="status"
    />
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

interface SkeletonProps { className?: string; lines?: number }

export function Skeleton({ className, lines }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={clsx('h-4 skeleton-shimmer rounded', i === lines - 1 && 'w-3/4', className)} />
        ))}
      </div>
    )
  }
  return <div className={clsx('skeleton-shimmer rounded', className)} aria-hidden="true" />
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="bg-slate-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-4 py-3 border-t border-slate-100 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={clsx('h-4 flex-1', c === 0 && 'w-1/4 flex-none max-w-[120px]')} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && (
        <div className="mb-4 p-4 bg-slate-100 rounded-2xl text-slate-300">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-slate-500">{title}</p>
      {description && <p className="text-sm mt-1.5 text-slate-400 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── PageHeader ──────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  back?: boolean
}

export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
            aria-label="Volver"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2 items-center flex-wrap">{actions}</div>}
    </div>
  )
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

export function SectionHeader({ title, icon, actions }: { title: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-500">{icon}</span>}
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Ref para onClose → el handler de Escape siempre usa la versión más reciente
  // sin necesitar onClose como dependencia del useEffect de apertura.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    const FOCUSABLE = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
      'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }

      // Focus trap — Tab / Shift+Tab cicla dentro del panel
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!focusable.length) { e.preventDefault(); return }
        const first = focusable[0]!
        const last  = focusable[focusable.length - 1]!
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last || document.activeElement === panelRef.current) {
            e.preventDefault(); first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      prev?.focus()
    }
  }, [open]) // ← solo cuando el modal abre/cierra, NO en cada re-render

  if (!open) return null

  const sizes = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
      {/* Backdrop — fixed propio para cubrir siempre el 100% del viewport */}
      <div className="fixed inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />
      {/* Panel — z-index relativo para estar encima del backdrop */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          'relative z-10 bg-white w-full focus:outline-none animate-slide-up',
          'rounded-2xl shadow-2xl flex flex-col',
          'max-h-[90vh]',
          sizes[size],
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 id={titleId} className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/60 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmDialog({
  open, onConfirm, onCancel, title, message, confirmLabel = 'Confirmar', danger, loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  )
}

// ─── Table ───────────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('w-full overflow-x-auto', className)}>
      <table className="min-w-full text-sm text-left border-collapse">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={clsx(
      'px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 whitespace-nowrap border-b border-slate-100',
      className
    )}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td className={clsx('px-4 py-3 border-t border-slate-50 text-slate-700 align-middle', className)}>
      {children}
    </td>
  )
}

// ─── Pagination ──────────────────────────────────────────────────────────────

interface PaginationProps { page: number; total: number; pageSize?: number; onChange: (page: number) => void }

/** Genera la secuencia de botones de página con ellipsis */
function pageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export function Pagination({ page, total, pageSize = 50, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, total)

  const btnBase  = 'min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-all border select-none'
  const btnIdle  = 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
  const btnActive = 'border-transparent text-white shadow-sm t-bg'
  const btnDisabled = 'border-slate-100 text-slate-300 pointer-events-none'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
      {/* Info */}
      <p className="text-xs text-slate-500 order-2 sm:order-1">
        Mostrando{' '}
        <span className="font-semibold text-slate-700 tabular-nums">{start}–{end}</span>
        {' '}de{' '}
        <span className="font-semibold text-slate-700 tabular-nums">{total}</span>
        {' '}resultados
      </p>

      {/* Controles */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Anterior */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
          className={clsx(btnBase, page === 1 ? btnDisabled : btnIdle, 'flex items-center gap-1 px-2.5')}
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">Ant.</span>
        </button>

        {/* Números */}
        <div className="flex items-center gap-0.5">
          {pageRange(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-slate-400 select-none">···</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={clsx(btnBase, p === page ? btnActive : btnIdle)}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Siguiente */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Página siguiente"
          className={clsx(btnBase, page === totalPages ? btnDisabled : btnIdle, 'flex items-center gap-1 px-2.5')}
        >
          <span className="hidden sm:inline">Sig.</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-slate-100 my-4" />
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
      <div className="relative flex justify-center">
        <span className="bg-white px-2 text-xs text-slate-400">{label}</span>
      </div>
    </div>
  )
}

// ─── TabBar ──────────────────────────────────────────────────────────────────

interface TabBarProps<T extends string> {
  tabs: { key: T; label: string; count?: number; dot?: 'red' | 'yellow' | 'green' }[]
  active: T
  onChange: (key: T) => void
  className?: string
}

export function TabBar<T extends string>({ tabs, active, onChange, className }: TabBarProps<T>) {
  const dotCls: Record<'red' | 'yellow' | 'green', string> = {
    red:    'bg-red-500',
    yellow: 'bg-yellow-400',
    green:  'bg-emerald-500',
  }
  return (
    <div className={clsx('flex gap-0.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0',
            active === t.key
              ? 'bg-white text-slate-800 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {t.dot && (
            <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotCls[t.dot])} />
          )}
          {t.label}
          {t.count !== undefined && (
            <span className={clsx(
              'text-[11px] font-bold tabular-nums',
              active === t.key ? 't-text' : 'text-slate-400'
            )}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── DateRangeBar ─────────────────────────────────────────────────────────────

type DatePreset = 'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'custom'

interface DateRangeBarProps {
  desde: string
  hasta: string
  onDesde: (v: string) => void
  onHasta: (v: string) => void
  presets?: DatePreset[]
  className?: string
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',     label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week',      label: 'Esta semana' },
  { key: 'lastWeek',  label: 'Sem. pasada' },
  { key: 'month',     label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
]

function getPresetDates(preset: DatePreset): { desde: string; hasta: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = fmt(now)
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1)
  const endOfWeek   = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6)

  switch (preset) {
    case 'today':     return { desde: today, hasta: today }
    case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); return { desde: fmt(d), hasta: fmt(d) } }
    case 'week':      return { desde: fmt(startOfWeek), hasta: today }
    case 'lastWeek':  { const ls = new Date(startOfWeek); ls.setDate(ls.getDate() - 7); const le = new Date(ls); le.setDate(ls.getDate() + 6); return { desde: fmt(ls), hasta: fmt(le) } }
    case 'month':     { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { desde: fmt(d), hasta: today } }
    case 'lastMonth': { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { desde: fmt(d), hasta: fmt(e) } }
    default:          return { desde: '', hasta: '' }
  }
}

export function DateRangeBar({ desde, hasta, onDesde, onHasta, presets = ['today', 'week', 'month', 'lastMonth'], className }: DateRangeBarProps) {
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null)

  const applyPreset = (p: DatePreset) => {
    const { desde: d, hasta: h } = getPresetDates(p)
    onDesde(d); onHasta(h); setActivePreset(p)
  }

  const handleCustom = () => setActivePreset('custom')

  return (
    <div className={clsx('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {/* Preset buttons */}
      <div className="flex gap-1 flex-wrap">
        {PRESETS.filter((p) => presets.includes(p.key)).map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className={clsx(
              'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
              activePreset === p.key
                ? 't-bg text-white t-border'
                : 'bg-white text-slate-600 border-slate-200 hover:t-border hover:t-text-dk'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-1.5">
        <Calendar size={13} className="text-slate-400 shrink-0" />
        <input
          type="date"
          value={desde}
          onChange={(e) => { onDesde(e.target.value); handleCustom() }}
          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
        />
        <span className="text-slate-400 text-xs">→</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => { onHasta(e.target.value); handleCustom() }}
          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
        />
      </div>
    </div>
  )
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white placeholder:text-slate-400 transition-all"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

// ─── InfoBanner ──────────────────────────────────────────────────────────────

export function InfoBanner({ icon, children, variant = 'info' }: { icon?: ReactNode; children: ReactNode; variant?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info:    'bg-blue-50 border-blue-100 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    success: 'bg-green-50 border-green-100 text-green-700',
  }
  return (
    <div className={clsx('flex items-start gap-2.5 p-3.5 rounded-xl border text-sm leading-relaxed', styles[variant])}>
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

// ─── FileDropZone ─────────────────────────────────────────────────────────────

interface FileDropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  className?: string
  compact?: boolean
}

export function FileDropZone({ onFiles, accept = '*', className, compact }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        'border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200',
        'hover:t-border hover:t-bg-xlt',
        isDragging ? 't-border t-bg-xlt' : 'border-slate-200',
        compact ? 'py-4 px-4' : 'py-8 px-6',
        className
      )}
    >
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={handleChange} />
      <div className={clsx('flex items-center gap-3', compact ? 'justify-start' : 'flex-col justify-center text-center')}>
        <div className={clsx('rounded-xl bg-slate-100 text-slate-400', compact ? 'p-2' : 'p-3')}>
          <svg width={compact ? 18 : 24} height={compact ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <p className={clsx('font-medium text-slate-700', compact ? 'text-sm' : 'text-base')}>
            {compact ? 'Subir archivo' : 'Arrastra tu archivo aquí'}
          </p>
          {!compact && <p className="text-xs text-slate-400 mt-1">PDF, Excel, CSV, Word — o haz clic para seleccionar</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Tooltip (simple) ─────────────────────────────────────────────────────────

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap">
        <span className="px-2 py-1 bg-slate-800 text-white text-xs rounded-lg shadow-lg">{content}</span>
      </span>
    </span>
  )
}
