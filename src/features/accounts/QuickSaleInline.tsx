/**
 * QuickSaleInline — venta rápida embebida (sin modal).
 *
 * Desktop (lg+): checkout de una sola vista en 2 columnas — búsqueda + carrito a
 * la izquierda, resumen + medio de pago + cobro a la derecha (sticky). Sin pasos:
 * el cajero ve todo a la vez, patrón estándar de POS profesional.
 *
 * Mobile (<lg): flujo por pasos (carrito → pago) para no saturar la pantalla.
 *
 * Toda la lógica vive en useQuickSale; este componente solo orquesta presentación.
 * Guard de caja: el cobro solo procede si el usuario tiene su caja abierta.
 */
import { useCallback } from 'react'
import { CreditCard, CheckCircle2, ArrowLeft, ShoppingCart, Lock } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useQuickSale } from './useQuickSale'
import { StepCart, StepPayment } from './QuickSaleSteps'

interface Props {
  /** Guard de caja: devuelve false (+ toast) si no hay caja abierta. */
  guardCaja: (accion: string) => boolean
}

export default function QuickSaleInline({ guardCaja }: Props) {
  const isDesktop = useIsDesktop(1024)
  const qs = useQuickSale(() => { /* venta hecha: el hook ya resetea + invalida */ })

  const canConfirm = qs.cart.length > 0 && !!qs.selectedMedio

  const handleConfirm = useCallback(() => {
    if (!guardCaja('cobrar una venta rápida')) return
    qs.confirm()
  }, [guardCaja, qs])

  // ── Desktop: checkout de una sola vista (2 columnas) ──────────────────────────
  if (isDesktop) {
    return (
      <div
        className="grid grid-cols-[1fr_360px] gap-5"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canConfirm) { e.preventDefault(); handleConfirm() }
        }}
      >
        {/* Columna izquierda — búsqueda + carrito */}
        <div className="min-w-0">
          <StepCart
            search={qs.search}
            setSearch={qs.setSearch}
            searchRef={qs.searchRef}
            results={qs.results}
            cart={qs.cart}
            total={qs.total}
            onAdd={qs.addToCart}
            onUpdateQty={qs.updateQty}
            onSetQty={qs.setQty}
            onRemove={qs.removeItem}
          />
        </div>

        {/* Columna derecha — checkout sticky */}
        <aside className="border-l border-slate-100 pl-5 self-start sticky top-2 space-y-4">
          {qs.cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
              <ShoppingCart size={26} className="text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">Carrito vacío</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Busca productos a la izquierda para empezar a cobrar.
              </p>
            </div>
          ) : (
            <StepPayment
              cart={qs.cart}
              total={qs.total}
              medios={qs.medios}
              selectedMedio={qs.selectedMedio}
              setSelectedMedio={qs.setSelectedMedio}
              montoInput={qs.montoInput}
              compact
            />
          )}

          <Button
            className="w-full"
            size="lg"
            icon={canConfirm ? <CheckCircle2 size={16} /> : <Lock size={15} />}
            loading={qs.confirming}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {qs.cart.length === 0
              ? 'Agrega productos'
              : !qs.selectedMedio
                ? 'Elige medio de pago'
                : `Cobrar · ${formatCOP(qs.total)}`}
          </Button>
        </aside>
      </div>
    )
  }

  // ── Mobile: flujo por pasos (carrito → pago) ──────────────────────────────────
  return (
    <div
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && qs.step === 'payment' && canConfirm) {
          e.preventDefault()
          handleConfirm()
        }
      }}
    >
      {qs.step === 'cart' ? (
        <StepCart
          search={qs.search}
          setSearch={qs.setSearch}
          searchRef={qs.searchRef}
          results={qs.results}
          cart={qs.cart}
          total={qs.total}
          onAdd={qs.addToCart}
          onUpdateQty={qs.updateQty}
          onSetQty={qs.setQty}
          onRemove={qs.removeItem}
        />
      ) : (
        <StepPayment
          cart={qs.cart}
          total={qs.total}
          medios={qs.medios}
          selectedMedio={qs.selectedMedio}
          setSelectedMedio={qs.setSelectedMedio}
          montoInput={qs.montoInput}
        />
      )}

      {/* Footer de acción */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {qs.step === 'cart' ? (
          <Button
            icon={<CreditCard size={15} />}
            disabled={qs.cart.length === 0}
            onClick={() => qs.setStep('payment')}
          >
            Ir a pago · {formatCOP(qs.total)}
          </Button>
        ) : (
          <>
            <Button variant="secondary" icon={<ArrowLeft size={14} />} onClick={() => qs.setStep('cart')}>
              Volver
            </Button>
            <Button
              icon={<CheckCircle2 size={15} />}
              loading={qs.confirming}
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              Confirmar pago · {formatCOP(qs.total)}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
