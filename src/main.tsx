import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
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
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2800,
              style: {
                borderRadius: '10px',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08), 0 0 0 1px rgb(0 0 0 / 0.04)',
              },
              success: {
                iconTheme: { primary: 'var(--t-primary)', secondary: '#f0fdf4' },
                style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#fef2f2' },
                style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
              },
            }}
          />
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
