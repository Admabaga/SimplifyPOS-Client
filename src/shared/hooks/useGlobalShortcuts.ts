/**
 * Atajos de teclado globales para SimplifyPOS.
 *
 * Los atajos solo actúan cuando ningún input/textarea/select tiene foco
 * (para no interferir con la escritura normal).
 *
 * F1  → /dashboard       (inicio)
 * F2  → /accounts        (nueva cuenta / buscar cliente)
 * F3  → /caja            (abrir/cerrar caja)
 * F4  → /admin/billing   (facturación)
 * F6  → /reports         (reportes)
 * F7  → /notifications   (notificaciones)
 * F8  → /sales           (historial de ventas)
 * F9  → /products        (productos)
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
  const navigate = useNavigate()
  const isAuth = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuth) return

    const handler = (e: KeyboardEvent) => {
      // No actuar si el usuario está escribiendo en un input
      if (isTypingTarget(document.activeElement)) return

      // No actuar si hay un modal abierto (dialog presente en DOM)
      if (document.querySelector('[role="dialog"]')) return

      switch (e.key) {
        case 'F1':
          e.preventDefault()
          navigate('/dashboard')
          break
        case 'F2':
          e.preventDefault()
          navigate('/accounts')
          break
        case 'F3':
          e.preventDefault()
          navigate('/caja')
          break
        case 'F4':
          e.preventDefault()
          navigate('/admin/billing')
          break
        case 'F6':
          e.preventDefault()
          navigate('/reports')
          break
        case 'F7':
          e.preventDefault()
          navigate('/notifications')
          break
        case 'F8':
          e.preventDefault()
          navigate('/sales')
          break
        case 'F9':
          e.preventDefault()
          navigate('/products')
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isAuth, navigate])
}
