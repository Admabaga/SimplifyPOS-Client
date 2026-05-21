import { Outlet } from 'react-router-dom'
import { clsx } from 'clsx'
import { useEffect, useRef } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SessionExpiredModal from './SessionExpiredModal'
import { useUIStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, applyTheme } from '@/stores/theme'
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts'
import SetupWizard, { useSetupWizard } from '@/features/onboarding/SetupWizard'

const IDLE_TIMEOUT_MS = 60 * 60 * 1000 // 1 hora

function useIdleTimer() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    const trigger = () => window.dispatchEvent(new CustomEvent('simplifypos:session-expired'))

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(trigger, IDLE_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    reset() // arranca el timer al montar

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [isAuthenticated])
}

export default function Layout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const { theme, fontSize } = useThemeStore()
  useIdleTimer()
  useGlobalShortcuts()
  const { open: wizardOpen, dismiss: wizardDismiss } = useSetupWizard()

  // Re-aplicar tema si cambia (desde el panel, desde otra pestaña)
  useEffect(() => {
    applyTheme(theme, fontSize)
  }, [theme, fontSize])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className={clsx(
        'flex flex-col min-h-screen transition-[margin] duration-200 ease-in-out',
        'pt-14 lg:pt-0',
        collapsed ? 'lg:ml-[64px]' : 'lg:ml-60'
      )}>
        <div>
          <Topbar />
          <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      <SessionExpiredModal />
      <SetupWizard open={wizardOpen} onDismiss={wizardDismiss} />
    </div>
  )
}
