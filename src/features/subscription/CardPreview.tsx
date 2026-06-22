/**
 * Tarjeta visual realista (estilo Apple Pay / Stripe): muestra en vivo el número,
 * titular, vencimiento y el logo de la marca (Visa/Mastercard/Amex). El fondo
 * cambia de color según la marca detectada. Es solo presentación.
 */
import { BrandMark, brandFromName, brandSpec, detectBrand, type CardBrand } from './cardBrands'

const onlyDigits = (s: string) => s.replace(/\D/g, '')

const GRADIENTS: Record<CardBrand, string> = {
  visa: 'linear-gradient(135deg, #1a1f71 0%, #3b4bb5 100%)',
  mastercard: 'linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)',
  amex: 'linear-gradient(135deg, #1d6fb8 0%, #2aa3c0 100%)',
  diners: 'linear-gradient(135deg, #0a4b78 0%, #1379be 100%)',
  discover: 'linear-gradient(135deg, #2b2b2b 0%, #4a4a4a 100%)',
  unknown: 'linear-gradient(135deg, #334155 0%, #64748b 100%)',
}

/** Número enmascarado: dígitos escritos + • para los que faltan, agrupado por marca. */
function maskedNumber(digits: string, brand: CardBrand): string {
  const { maxDigits, groups } = brandSpec(brand)
  const padded = (digits + '•'.repeat(maxDigits)).slice(0, maxDigits)
  const out: string[] = []
  let i = 0
  for (const g of groups) {
    out.push(padded.slice(i, i + g))
    i += g
  }
  return out.join('  ')
}

/**
 * Tarjeta GUARDADA (método de pago en archivo): muestra una tarjeta realista con
 * la marca y los últimos 4 dígitos. No se guarda el número completo (PCI), por eso
 * solo se ven los últimos 4.
 */
export function SavedCard({
  brandName,
  last4,
  holder,
  exp,
  badge = 'Cobro automático activo',
}: {
  brandName: string | null
  last4: string | null
  holder?: string | null
  exp?: string | null
  badge?: string
}) {
  const brand = brandFromName(brandName)
  return (
    <div
      className="relative w-full rounded-2xl text-white shadow-lg"
      style={{ aspectRatio: '1.586', background: GRADIENTS[brand], maxWidth: 320 }}
    >
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <svg width="38" height="29" viewBox="0 0 42 32" aria-hidden>
            <rect x="1" y="1" width="40" height="30" rx="5" fill="#e9d8a6" />
            <path d="M14 1v30M28 1v30M1 11h40M1 21h40" stroke="#b8860b" strokeWidth="1" opacity="0.5" />
          </svg>
          <BrandMark brand={brand} className="h-8 w-auto" />
        </div>
        <p
          className="font-mono tracking-wider tabular-nums"
          style={{ fontSize: 'clamp(15px, 5vw, 21px)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          ••••  ••••  ••••  {last4 ?? '••••'}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-widest text-white/60">Titular</p>
            <p className="text-sm font-medium truncate uppercase">{holder?.trim() || 'TARJETA EN ARCHIVO'}</p>
            <span className="inline-flex items-center gap-1 text-[9px] text-white/70 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {badge}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[8px] uppercase tracking-widest text-white/60">Vence</p>
            <p className="text-sm font-medium tabular-nums">{exp || '••/••'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CardPreview({
  number,
  holder,
  exp,
  focusCvc = false,
  cvc = '',
}: {
  number: string
  holder: string
  exp: string
  focusCvc?: boolean
  cvc?: string
}) {
  const brand = detectBrand(number)
  const digits = onlyDigits(number)
  const expFmt = (() => {
    const d = onlyDigits(exp).slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d.length ? d : 'MM/AA'
  })()

  return (
    <div className="relative w-full" style={{ perspective: '1000px' }}>
      <div
        className="relative w-full rounded-2xl text-white shadow-lg transition-transform duration-500"
        style={{
          aspectRatio: '1.586',
          background: GRADIENTS[brand],
          transformStyle: 'preserve-3d',
          transform: focusCvc ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ── Frente ── */}
        <div
          className="absolute inset-0 p-5 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-start justify-between">
            {/* Chip */}
            <svg width="42" height="32" viewBox="0 0 42 32" aria-hidden>
              <rect x="1" y="1" width="40" height="30" rx="5" fill="#e9d8a6" />
              <rect x="1" y="1" width="40" height="30" rx="5" fill="url(#chip)" fillOpacity="0.3" />
              <path d="M14 1v30M28 1v30M1 11h40M1 21h40" stroke="#b8860b" strokeWidth="1" opacity="0.5" />
              <defs>
                <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff" />
                  <stop offset="1" stopColor="#000" />
                </linearGradient>
              </defs>
            </svg>
            {/* Logo de la marca */}
            <BrandMark brand={brand} className="h-8 w-auto" />
          </div>

          {/* Número */}
          <p
            className="font-mono tracking-wider tabular-nums"
            style={{ fontSize: 'clamp(15px, 5vw, 22px)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {maskedNumber(digits, brand)}
          </p>

          {/* Titular + vencimiento */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-widest text-white/60">Titular</p>
              <p className="text-sm font-medium truncate uppercase">
                {holder.trim() || 'NOMBRE APELLIDO'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] uppercase tracking-widest text-white/60">Vence</p>
              <p className="text-sm font-medium tabular-nums">{expFmt}</p>
            </div>
          </div>
        </div>

        {/* ── Reverso (banda magnética + CVC) ── */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="h-9 bg-black/80 mt-5" />
          <div className="px-5 mt-4">
            <div className="bg-white/90 rounded h-8 flex items-center justify-end px-3">
              <span className="text-gray-800 font-mono tracking-widest text-sm">
                {onlyDigits(cvc) || 'CVC'}
              </span>
            </div>
            <p className="text-[9px] text-white/50 mt-2 text-right">
              Código de seguridad de 3 o 4 dígitos
            </p>
          </div>
          <div className="mt-auto p-4 flex justify-end">
            <div>
              <BrandMark brand={brand} className="h-6 w-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
