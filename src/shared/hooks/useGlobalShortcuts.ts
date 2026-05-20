/**
 * Atajos de teclado globales para SimplifyPOS.
 *
 * Los atajos solo actúan cuando ningún input/textarea/select tiene foco
 * (para no interferir con la escritura normal).
 *
 * F2  → /accounts        (nueva cuenta / buscar cliente)
 * F4  → /caja            (abrir/cerrar caja)
 * F5  → /products        (productos)
 * F6  → /sales           (historial de ventas)
 * F8  → /dashboard       (inicio)
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (['input', 'textarea', 'select'].includes(tag)) return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useGlobalShortcuts() {
  const navigate   = useNavigate()
  const isAuth     = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuth) return

    const handler = (e: KeyboardEvent) => {
      // No actuar si el usuario está escribiendo en un input
      if (isTypingTarget(document.activeElement)) return

      // No actuar si hay un modal abierto (dialog presente en DOM)
      if (document.querySelector('[role="dialog"]')) return

      switch (e.key) {
        case 'F2':
          e.preventDefault()
          navigate('/accounts')
          break
        case 'F4':
          e.preventDefault()
          navigate('/caja')
          break
        case 'F5':
          e.preventDefault()
          navigate('/products')
          break
        case 'F6':
          e.preventDefault()
          navigate('/sales')
          break
        case 'F8':
          e.preventDefault()
          navigate('/dashboard')
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isAuth, navigate])
}
