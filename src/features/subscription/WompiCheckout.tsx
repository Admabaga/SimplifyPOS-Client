import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SubscriptionConfig } from './types'
import { CardFields, cardLista } from './CardFields'
import { tokenizeCard, cardMeta, type CardInput, type CardMeta } from './tokenize'

interface Props {
  config: SubscriptionConfig
  /** Se invoca con el card_token de un solo uso + metadata de display (marca, últimos 4…). */
  onToken: (cardToken: string, meta: CardMeta) => Promise<void>
  submitting?: boolean
  cta?: string
}

const EMPTY: CardInput = { number: '', holder: '', exp: '', cvc: '' }

/**
 * Formulario de tarjeta débito/crédito con detección automática de marca
 * (Visa, Mastercard, Amex, Diners) — el MISMO `CardFields` que usa el signup.
 * En `wompi` tokeniza contra Wompi; en `mock` genera un token de prueba.
 */
export default function WompiCheckout({ config, onToken, submitting, cta = 'Guardar tarjeta' }: Props) {
  const [card, setCard] = useState<CardInput>(EMPTY)
  const [tokenizing, setTokenizing] = useState(false)
  const busy = tokenizing || submitting
  const requireLuhn = config.provider === 'wompi'
  const lista = cardLista(card, requireLuhn)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!lista) {
      toast.error('Completa los datos de la tarjeta')
      return
    }
    setTokenizing(true)
    try {
      const token = await tokenizeCard(config, card)
      await onToken(token, cardMeta(card))
    } catch (err) {
      const { apiError } = await import('@/shared/lib/apiError')
      toast.error(apiError(err, err instanceof Error ? err.message : 'No se pudo procesar la tarjeta'))
    } finally {
      setTokenizing(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <CardFields
        card={card}
        setCard={setCard}
        showTestHint={config.provider === 'mock'}
        requireLuhn={requireLuhn}
      />

      <button
        type="submit"
        disabled={busy || !lista}
        className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
        {busy ? 'Procesando…' : cta}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
        <Lock size={11} /> Pago seguro cifrado · procesado por{' '}
        {config.provider === 'wompi' ? 'Wompi (Bancolombia)' : 'la pasarela'}
      </p>
    </form>
  )
}
