/**
 * Tokenización de tarjeta — compartida entre el signup y el módulo de suscripción.
 *
 * En modo `wompi` tokeniza contra Wompi con la llave pública (los datos de la
 * tarjeta nunca tocan el backend). En modo `mock` devuelve un token de prueba
 * (4111… simula rechazo). Devuelve un `card_token` de un solo uso.
 */
import type { SubscriptionConfig } from './types'
import { detectBrand } from './cardBrands'

export interface CardInput {
  number: string
  holder: string
  exp: string // MM/AA
  cvc: string
}

/** Metadata NO sensible para mostrar la tarjeta guardada (marca, últimos 4, titular, vencimiento). */
export interface CardMeta {
  brand: string
  last4: string
  holder: string
  exp: string
}

const BRAND_LABEL: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  amex: 'AMEX',
  diners: 'DINERS',
  discover: 'DISCOVER',
  unknown: 'CARD',
}

export function cardMeta(card: CardInput): CardMeta {
  const digits = card.number.replace(/\D/g, '')
  const d = card.exp.replace(/\D/g, '').slice(0, 4)
  return {
    brand: BRAND_LABEL[detectBrand(card.number)] ?? 'CARD',
    last4: digits.slice(-4),
    holder: card.holder.trim(),
    exp: d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d,
  }
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

function wompiBase(publicKey: string): string {
  return publicKey.startsWith('pub_prod_')
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1'
}

export async function tokenizeCard(config: SubscriptionConfig, card: CardInput): Promise<string> {
  if (config.provider !== 'wompi') {
    const d = onlyDigits(card.number) || '4242'
    return d.startsWith('4111') ? `tok_decline_${d.slice(-4)}` : `tok_test_${d.slice(-4)}`
  }
  const [mm, yy] = card.exp.split('/').map((s) => s.trim())
  const res = await fetch(`${wompiBase(config.public_key)}/tokens/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.public_key}`,
    },
    body: JSON.stringify({
      number: onlyDigits(card.number),
      cvc: onlyDigits(card.cvc),
      exp_month: mm,
      exp_year: yy,
      card_holder: card.holder,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data?.data?.id) {
    throw new Error(
      data?.error?.messages ? JSON.stringify(data.error.messages) : 'Tarjeta inválida',
    )
  }
  return data.data.id as string
}
