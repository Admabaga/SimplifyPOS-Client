import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api/queryClient'
import './index.css'
import AppRoutes from './routes'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { applyTheme } from '@/stores/theme'
import type { ThemeId, FontSize } from '@/stores/theme'

// Aplicar tema guardado ANTES del primer render → evita flash de colores
;(function initTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('simplifypos-theme') ?? '{}') as { state?: { theme?: ThemeId; fontSize?: FontSize } }
    applyTheme(saved?.state?.theme ?? 'esmeralda', saved?.state?.fontSize ?? 'md')
  } catch {
    applyTheme('esmeralda', 'md')
  }
})()


const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
