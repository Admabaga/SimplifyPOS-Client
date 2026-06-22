import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport is >= `minWidth` px.
 *
 * Default breakpoint is 640px (Tailwind's `sm`) — used to conditionally *mount*
 * heavy chart components on mobile, preventing Recharts SVG rendering artifacts.
 *
 * Pass a custom breakpoint (e.g. 1024 for `lg`) to drive app-shell layouts that
 * must branch their DOM between mobile and desktop.
 */
export function useIsDesktop(minWidth = 640): boolean {
  const query = `(min-width: ${minWidth}px)`

  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return isDesktop
}
