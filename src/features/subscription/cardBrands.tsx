/**
 * Detección de marca de tarjeta y logos (estilo Stripe/checkout profesional).
 *
 * Detecta la marca a partir de los primeros dígitos del número, igual que las
 * pasarelas serias: el usuario escribe y al instante aparece el logo de
 * Visa / Mastercard / Amex / Diners / Discover. Sin dependencias externas:
 * los logos son SVG inline.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | 'discover' | 'unknown'

/** Reglas de prefijo (IIN) de cada red. */
export function detectBrand(rawNumber: string): CardBrand {
  const n = rawNumber.replace(/\D/g, '')
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6][0-9]|7[01]|720))/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^3(0[0-5]|[68])/.test(n)) return 'diners'
  if (/^6(011|5|4[4-9]|22)/.test(n)) return 'discover'
  return 'unknown'
}

/** Mapea el nombre de marca guardado (de la pasarela: "VISA", "MASTERCARD"…) a CardBrand. */
export function brandFromName(name: string | null | undefined): CardBrand {
  const n = (name ?? '').toLowerCase()
  if (n.includes('visa')) return 'visa'
  if (n.includes('master')) return 'mastercard'
  if (n.includes('amex') || n.includes('american')) return 'amex'
  if (n.includes('diners')) return 'diners'
  if (n.includes('discover')) return 'discover'
  return 'unknown'
}

/** Largo del número y del CVC según la marca (Amex usa 15 dígitos y CVC de 4). */
export function brandSpec(brand: CardBrand): { maxDigits: number; cvcDigits: number; groups: number[] } {
  if (brand === 'amex') return { maxDigits: 15, cvcDigits: 4, groups: [4, 6, 5] }
  if (brand === 'diners') return { maxDigits: 14, cvcDigits: 3, groups: [4, 6, 4] }
  return { maxDigits: 16, cvcDigits: 3, groups: [4, 4, 4, 4] }
}

/** Agrupa el número con espacios según la marca (4-4-4-4, o 4-6-5 en Amex). */
export function formatCardNumber(rawNumber: string, brand: CardBrand): string {
  const digits = rawNumber.replace(/\D/g, '').slice(0, brandSpec(brand).maxDigits)
  const groups = brandSpec(brand).groups
  const out: string[] = []
  let idx = 0
  for (const g of groups) {
    if (idx >= digits.length) break
    out.push(digits.slice(idx, idx + g))
    idx += g
  }
  return out.join(' ')
}

/** Validación Luhn (checksum estándar de tarjetas). */
export function luhnValid(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, '')
  if (digits.length < 12) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

// ─── Logos SVG inline ─────────────────────────────────────────────────────────

export function BrandLogo({ brand, className = 'h-5 w-auto' }: { brand: CardBrand; className?: string }) {
  switch (brand) {
    case 'visa':
      return (
        <svg viewBox="0 0 48 32" className={className} role="img" aria-label="Visa">
          <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" />
          <text x="24" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fontStyle="italic" fill="#1A1F71" fontFamily="Arial, sans-serif">VISA</text>
        </svg>
      )
    case 'mastercard':
      return (
        <svg viewBox="0 0 48 32" className={className} role="img" aria-label="Mastercard">
          <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" />
          <circle cx="20" cy="16" r="8" fill="#EB001B" />
          <circle cx="28" cy="16" r="8" fill="#F79E1B" fillOpacity="0.9" />
          <path d="M24 10.2a8 8 0 0 0 0 11.6 8 8 0 0 0 0-11.6Z" fill="#FF5F00" />
        </svg>
      )
    case 'amex':
      return (
        <svg viewBox="0 0 48 32" className={className} role="img" aria-label="American Express">
          <rect width="48" height="32" rx="4" fill="#2E77BC" />
          <text x="24" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">AMEX</text>
        </svg>
      )
    case 'diners':
      return (
        <svg viewBox="0 0 48 32" className={className} role="img" aria-label="Diners Club">
          <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" />
          <circle cx="24" cy="16" r="8" fill="none" stroke="#0079BE" strokeWidth="2" />
          <circle cx="24" cy="16" r="3.5" fill="#0079BE" />
        </svg>
      )
    case 'discover':
      return (
        <svg viewBox="0 0 48 32" className={className} role="img" aria-label="Discover">
          <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb" />
          <circle cx="33" cy="16" r="7" fill="#F76E11" />
          <text x="20" y="20" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1a1a1a" fontFamily="Arial, sans-serif">DISC</text>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 48 32" className={className} role="img" aria-label="Tarjeta">
          <rect width="48" height="32" rx="4" fill="#f3f4f6" stroke="#e5e7eb" />
          <rect x="6" y="12" width="36" height="3.5" rx="1" fill="#cbd5e1" />
          <rect x="6" y="19" width="14" height="3" rx="1" fill="#cbd5e1" />
        </svg>
      )
  }
}

/**
 * Marca "plana" para mostrar DIRECTO sobre la tarjeta (degradado). Sin recuadro
 * blanco: el logo va en blanco/colores de marca, como en una tarjeta real.
 */
export function BrandMark({ brand, className = 'h-7 w-auto' }: { brand: CardBrand; className?: string }) {
  const shadow = { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }
  switch (brand) {
    case 'visa':
      return (
        <svg viewBox="0 0 70 24" className={className} style={shadow} role="img" aria-label="Visa">
          <text x="35" y="20" textAnchor="middle" fontSize="24" fontWeight="800" fontStyle="italic" fill="#fff" fontFamily="Arial, sans-serif" letterSpacing="1">VISA</text>
        </svg>
      )
    case 'mastercard':
      return (
        <svg viewBox="0 0 56 34" className={className} style={shadow} role="img" aria-label="Mastercard">
          <circle cx="22" cy="17" r="13" fill="#EB001B" />
          <circle cx="34" cy="17" r="13" fill="#F79E1B" fillOpacity="0.9" />
          <path d="M28 7.4a13 13 0 0 0 0 19.2 13 13 0 0 0 0-19.2Z" fill="#FF5F00" />
        </svg>
      )
    case 'amex':
      return (
        <svg viewBox="0 0 80 22" className={className} style={shadow} role="img" aria-label="American Express">
          <text x="40" y="18" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif" letterSpacing="1.5">AMEX</text>
        </svg>
      )
    case 'diners':
      return (
        <svg viewBox="0 0 40 34" className={className} style={shadow} role="img" aria-label="Diners Club">
          <circle cx="20" cy="17" r="13" fill="none" stroke="#fff" strokeWidth="3" />
          <circle cx="20" cy="17" r="5.5" fill="#fff" />
        </svg>
      )
    case 'discover':
      return (
        <svg viewBox="0 0 116 22" className={className} style={shadow} role="img" aria-label="Discover">
          <text x="2" y="17" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif" letterSpacing="0.3">DISC<tspan fill="#F76E11">O</tspan>VER</text>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 48 32" className={className} style={shadow} role="img" aria-label="Tarjeta">
          <rect x="1.5" y="1.5" width="45" height="29" rx="4" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.7" />
          <rect x="7" y="12" width="34" height="3.2" rx="1" fill="#fff" fillOpacity="0.7" />
          <rect x="7" y="19" width="14" height="3" rx="1" fill="#fff" fillOpacity="0.7" />
        </svg>
      )
  }
}

/** Fila de marcas aceptadas (se muestra encima del formulario). */
export function AcceptedBrands({ active }: { active?: CardBrand }) {
  const brands: CardBrand[] = ['visa', 'mastercard', 'amex', 'diners']
  return (
    <div className="flex items-center gap-1.5">
      {brands.map((b) => (
        <span
          key={b}
          className={`transition-opacity ${active && active !== 'unknown' && active !== b ? 'opacity-30' : 'opacity-100'}`}
        >
          <BrandLogo brand={b} className="h-6 w-auto" />
        </span>
      ))}
    </div>
  )
}
