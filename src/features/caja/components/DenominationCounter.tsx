/**
 * DenominationCounter — Conteo asistido del efectivo en caja por denominaciones COP.
 *
 * UX:
 *  - Grid responsive de denominaciones (billetes arriba, monedas abajo).
 *  - Cada tarjeta muestra valor + input de cantidad + subtotal.
 *  - Total grande y diferencia en vivo contra el esperado (verde/rojo).
 *  - Botón "Aplicar al cierre" copia el total al campo de efectivo contado.
 *  - Botón "Limpiar" resetea cantidades.
 *  - El contador es OPCIONAL: el cajero puede saltarlo y digitar directo.
 */
import { useMemo, useState, useEffect } from 'react'
import { Banknote, Coins, RotateCcw, ArrowRight, X } from 'lucide-react'
import { formatCOP } from '@/shared/lib/formatters'

// Denominaciones colombianas en circulación
const BILLETES: { valor: number; emoji?: string }[] = [
  { valor: 100_000 },
  { valor: 50_000 },
  { valor: 20_000 },
  { valor: 10_000 },
  { valor: 5_000 },
  { valor: 2_000 },
  { valor: 1_000 },
]
const MONEDAS: { valor: number }[] = [
  { valor: 1_000 },
  { valor: 500 },
  { valor: 200 },
  { valor: 100 },
  { valor: 50 },
]

type Counts = Record<number, number> // denominacion → cantidad

interface Props {
  /** Efectivo esperado por el sistema (para mostrar diferencia en vivo). */
  esperado: number
  /** Callback al pulsar "Aplicar": entrega el total contado. */
  onAplicar: (total: number) => void
  /** Estado inicial opcional. */
  defaultCounts?: Counts
  /** Si true, muestra colapsado por defecto. */
  collapsedDefault?: boolean
}

export default function DenominationCounter({
  esperado,
  onAplicar,
  defaultCounts,
  collapsedDefault = true,
}: Props) {
  const [open, setOpen] = useState(!collapsedDefault)
  const [billetes, setBilletes] = useState<Counts>(() =>
    Object.fromEntries(BILLETES.map((b) => [b.valor, defaultCounts?.[b.valor] ?? 0]))
  )
  const [monedas, setMonedas] = useState<Counts>(() =>
    Object.fromEntries(MONEDAS.map((m) => [m.valor, defaultCounts?.[m.valor] ?? 0]))
  )

  useEffect(() => {
    if (!defaultCounts) return
    setBilletes((prev) =>
      Object.fromEntries(BILLETES.map((b) => [b.valor, defaultCounts[b.valor] ?? prev[b.valor] ?? 0]))
    )
    setMonedas((prev) =>
      Object.fromEntries(MONEDAS.map((m) => [m.valor, defaultCounts[m.valor] ?? prev[m.valor] ?? 0]))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCounts])

  const total = useMemo(() => {
    let t = 0
    for (const v of Object.keys(billetes)) t += Number(v) * (billetes[Number(v)] ?? 0)
    for (const v of Object.keys(monedas)) t += Number(v) * (monedas[Number(v)] ?? 0)
    return t
  }, [billetes, monedas])

  const totalUnidades = useMemo(
    () =>
      Object.values(billetes).reduce((s, n) => s + (n || 0), 0) +
      Object.values(monedas).reduce((s, n) => s + (n || 0), 0),
    [billetes, monedas]
  )

  const diferencia = total - esperado
  const tieneConteo = totalUnidades > 0

  const update = (set: typeof setBilletes) => (valor: number, n: number) =>
    set((prev) => ({ ...prev, [valor]: Math.max(0, Math.floor(n || 0)) }))

  const limpiar = () => {
    setBilletes(Object.fromEntries(BILLETES.map((b) => [b.valor, 0])))
    setMonedas(Object.fromEntries(MONEDAS.map((m) => [m.valor, 0])))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Banknote size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Contar efectivo por denominaciones</p>
            <p className="text-[11px] text-slate-400">
              {tieneConteo
                ? `${totalUnidades} pieza${totalUnidades !== 1 ? 's' : ''} · ${formatCOP(total)}`
                : 'Opcional — ayuda a evitar errores de digitación'}
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400">{open ? 'Ocultar' : 'Mostrar'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pt-3 pb-4 space-y-4">
          {/* Billetes */}
          <Section
            icon={<Banknote size={13} className="text-emerald-600" />}
            title="Billetes"
            denominaciones={BILLETES}
            counts={billetes}
            onChange={update(setBilletes)}
          />

          {/* Monedas */}
          <Section
            icon={<Coins size={13} className="text-amber-600" />}
            title="Monedas"
            denominaciones={MONEDAS}
            counts={monedas}
            onChange={update(setMonedas)}
          />

          {/* Total + diferencia */}
          <div className="rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total contado</span>
              <span className="text-2xl font-bold text-slate-800 tabular-nums">{formatCOP(total)}</span>
            </div>
            {tieneConteo && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Esperado por sistema</span>
                <span className="tabular-nums text-slate-600">{formatCOP(esperado)}</span>
              </div>
            )}
            {tieneConteo && (
              <div
                className={`flex items-center justify-between text-sm font-semibold rounded-lg px-3 py-2 ${
                  diferencia === 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : diferencia > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <span>
                  {diferencia === 0
                    ? '✓ Cuadre exacto'
                    : diferencia > 0
                    ? '↑ Sobrante'
                    : '↓ Faltante'}
                </span>
                <span className="tabular-nums">
                  {diferencia >= 0 ? '+' : ''}
                  {formatCOP(diferencia)}
                </span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={limpiar}
              disabled={!tieneConteo}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={12} /> Limpiar
            </button>
            <button
              type="button"
              onClick={() => onAplicar(total)}
              disabled={!tieneConteo}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Aplicar al cierre <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponente: sección de denominaciones ───────────────────────────────

function Section({
  icon, title, denominaciones, counts, onChange,
}: {
  icon: React.ReactNode
  title: string
  denominaciones: { valor: number }[]
  counts: Counts
  onChange: (valor: number, n: number) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">{title}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {denominaciones.map(({ valor }) => {
          const cantidad = counts[valor] ?? 0
          const subtotal = valor * cantidad
          return (
            <DenominationCell
              key={valor}
              valor={valor}
              cantidad={cantidad}
              subtotal={subtotal}
              onChange={(n) => onChange(valor, n)}
            />
          )
        })}
      </div>
    </div>
  )
}

function DenominationCell({
  valor, cantidad, subtotal, onChange,
}: {
  valor: number
  cantidad: number
  subtotal: number
  onChange: (n: number) => void
}) {
  const activo = cantidad > 0
  return (
    <div
      className={`rounded-lg border p-2 transition-all ${
        activo ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold tabular-nums ${activo ? 'text-emerald-700' : 'text-slate-700'}`}>
          ${valor.toLocaleString('es-CO')}
        </span>
        {activo && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="text-slate-400 hover:text-red-500"
            title="Quitar"
          >
            <X size={11} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(cantidad - 1)}
          disabled={cantidad === 0}
          className="w-6 h-6 rounded border border-slate-200 text-slate-600 text-sm font-bold disabled:opacity-30 hover:bg-slate-100"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={cantidad || ''}
          onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
          placeholder="0"
          className="flex-1 min-w-0 w-full px-1 py-1 text-center text-xs tabular-nums border border-slate-200 rounded focus:outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={() => onChange(cantidad + 1)}
          className="w-6 h-6 rounded border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-100"
        >
          +
        </button>
      </div>
      {activo && (
        <p className="mt-1 text-[10px] text-emerald-700 tabular-nums text-right font-semibold">
          {formatCOP(subtotal)}
        </p>
      )}
    </div>
  )
}
