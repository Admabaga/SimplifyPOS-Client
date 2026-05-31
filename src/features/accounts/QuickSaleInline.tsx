/**
 * QuickSaleInline — venta rápida embebida (sin modal), dentro del módulo de
 * creación de cuentas. Reutiliza useQuickSale + StepCart/StepPayment.
 *
 * Guard de caja: el cobro solo procede si el usuario tiene su caja abierta.
 */
import { useCallback } from 'react'
import { CreditCard, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { formatCOP } from '@/shared/lib/formatters'
import { useQuickSale } from './useQuickSale'
import { StepCart, StepPayment } from './QuickSaleSteps'

interface Props {
  /** Guard de caja: devuelve false (+ toast) si no hay caja abierta. */
  guardCaja: (accion: string) => boolean
}

export default function QuickSaleInline({ guardCaja }: Props) {
  const qs = useQuickSale(() => { /* venta hecha: el hook ya resetea + invalida */ })

  const handleConfirm = useCallback(() => {
    if (!guardCaja('cobrar una venta rápida')) return
    qs.confirm()
  }, [guardCaja, qs])

  return (
    <div
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && qs.step === 'payment' && qs.selectedMedio && qs.cart.length > 0) {
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
              disabled={!qs.selectedMedio || qs.cart.length === 0}
              onClick={handleConfirm}
            >
              Confirmar pago · {formatCOP(qs.total)}
            </Button>
          </>
        )}
      </div>
    </div>
  )

  function setStepPayment() {
    qs.setStep('payment')
  }
}
