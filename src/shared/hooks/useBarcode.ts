/**
 * Hook para lectoras de código de barras USB HID.
 * Las lectoras emiten caracteres muy rápido (< 80ms entre chars) seguidos de Enter.
 * El hook distingue scan de escritura humana por el timing entre keystrokes.
 */
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

interface UseBarcodeOptions {
  products: { id: number; nombre: string; codigo?: string | null }[]
  onProductFound: (productId: number) => void
  enabled?: boolean
}

export function useBarcode({ products, onProductFound, enabled = true }: UseBarcodeOptions) {
  const bufferRef    = useRef<string>('')
  const lastKeyRef   = useRef<number>(0)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input/textarea
      const tag = (document.activeElement?.tagName ?? '').toLowerCase()
      if (['input', 'textarea', 'select'].includes(tag)) return

      const now = Date.now()
      const gap = now - lastKeyRef.current
      lastKeyRef.current = now

      // Gap grande → resetear buffer (escritura humana entre medias)
      if (gap > 300 && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter' && bufferRef.current.length > 2) {
        // Tenemos un código escaneado
        const code = bufferRef.current.trim()
        bufferRef.current = ''
        e.preventDefault()

        const found = products.find(
          (p) => p.codigo && p.codigo.toLowerCase() === code.toLowerCase()
        )
        if (found) {
          onProductFound(found.id)
        } else {
          toast.error(`Código no encontrado: ${code}`)
        }
        return
      }

      // Solo acumular si el gap es < 80ms (velocidad de scanner) O si el buffer ya tiene contenido reciente
      if (e.key.length === 1 && (gap < 80 || bufferRef.current.length > 0)) {
        bufferRef.current += e.key

        // Timer de limpieza por si el Enter nunca llega
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { bufferRef.current = '' }, 500)
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [products, onProductFound, enabled])
}
