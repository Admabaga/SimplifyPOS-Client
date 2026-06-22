import { useMemo, useState } from 'react'
import {
  AcceptedBrands,
  BrandLogo,
  brandSpec,
  detectBrand,
  formatCardNumber,
  luhnValid,
} from './cardBrands'
import { CardPreview } from './CardPreview'
import type { CardInput } from './tokenize'

const onlyDigits = (s: string) => s.replace(/\D/g, '')

/**
 * Campos de tarjeta con vista previa realista + detección automática de marca
 * (Visa/Mastercard/Amex…), formato y CVC por marca, y validación Luhn. Controlado
 * por el padre para que el signup y el módulo de suscripción usen el MISMO formato.
 */
export function CardFields({
  card,
  setCard,
  showTestHint = false,
  requireLuhn = true,
}: {
  card: CardInput
  setCard: (c: CardInput) => void
  showTestHint?: boolean
  /** En producción (Wompi) se exige Luhn; en modo prueba basta con completar dígitos. */
  requireLuhn?: boolean
}) {
  const [cvcFocus, setCvcFocus] = useState(false)
  const brand = useMemo(() => detectBrand(card.number), [card.number])
  const spec = brandSpec(brand)
  const digits = onlyDigits(card.number)
  const numeroCompleto = digits.length >= spec.maxDigits
  const numeroInvalido = numeroCompleto && requireLuhn && !luhnValid(card.number)

  const inputBase =
    'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40'

  const fmtExp = (v: string) => {
    const d = onlyDigits(v).slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  return (
    <div className="space-y-3">
      {/* Tarjeta visual en vivo */}
      <div className="max-w-[340px] mx-auto">
        <CardPreview
          number={card.number}
          holder={card.holder}
          exp={card.exp}
          cvc={card.cvc}
          focusCvc={cvcFocus}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Tarjeta débito o crédito</span>
        <AcceptedBrands active={brand} />
      </div>

      {showTestHint && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Modo de prueba — escribe cualquier número de 16 dígitos para ver el flujo.
          Usa <b>4242 4242 4242 4242</b> para aprobar o <b>4111 1111 1111 1111</b> para
          simular un rechazo.
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Número de tarjeta</label>
        <div className="relative">
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            value={formatCardNumber(card.number, brand)}
            onChange={(e) => setCard({ ...card, number: e.target.value })}
            placeholder="1234 5678 9012 3456"
            className={`${inputBase} pr-14 ${numeroInvalido ? 'border-red-300 focus:ring-red-500/40' : 'border-gray-300'}`}
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <BrandLogo brand={brand} className="h-6 w-auto" />
          </span>
        </div>
        {numeroInvalido && <p className="text-[11px] text-red-500 mt-1">Revisa el número de tu tarjeta.</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titular</label>
        <input
          value={card.holder}
          autoComplete="cc-name"
          onChange={(e) => setCard({ ...card, holder: e.target.value })}
          placeholder="Titular como aparece en la tarjeta"
          className={`${inputBase} border-gray-300`}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento</label>
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            value={fmtExp(card.exp)}
            onChange={(e) => setCard({ ...card, exp: e.target.value })}
            placeholder="MM/AA"
            className={`${inputBase} border-gray-300`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            CVC {brand === 'amex' ? '(4 dígitos)' : ''}
          </label>
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            value={onlyDigits(card.cvc).slice(0, spec.cvcDigits)}
            onChange={(e) => setCard({ ...card, cvc: e.target.value })}
            onFocus={() => setCvcFocus(true)}
            onBlur={() => setCvcFocus(false)}
            placeholder={spec.cvcDigits === 4 ? '1234' : '123'}
            className={`${inputBase} border-gray-300`}
            required
          />
        </div>
      </div>
    </div>
  )
}

/** ¿La tarjeta tiene datos suficientes y válidos para tokenizar? */
export function cardLista(card: CardInput, requireLuhn = true): boolean {
  const spec = brandSpec(detectBrand(card.number))
  const digits = onlyDigits(card.number)
  const numeroOk = requireLuhn ? luhnValid(card.number) : digits.length >= spec.maxDigits
  return (
    numeroOk &&
    card.holder.trim().length >= 2 &&
    onlyDigits(card.exp).length >= 4 &&
    onlyDigits(card.cvc).length >= spec.cvcDigits
  )
}
