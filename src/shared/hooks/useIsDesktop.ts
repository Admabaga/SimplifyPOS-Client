import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport is >= 640px (Tailwind's `sm` breakpoint).
 * Used to conditionally *mount* heavy chart components on mobile,
 * preventing Recharts SVG rendering artifacts on small screens.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
