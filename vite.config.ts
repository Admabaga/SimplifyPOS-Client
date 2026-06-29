import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Chunking explícito para evitar bundles >500 KB y mejorar caching.
    // recharts (~360 KB) queda en chunk separado, cargado solo en páginas
    // de gráficos (todas las páginas ya son lazy()).
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          recharts: ['recharts'],
          query: ['@tanstack/react-query'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          icons: ['lucide-react'],
        },
      },
    },
    // 600 KB para acomodar vendor chunks grandes ya splitteados
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/tests/**',
        'src/main.tsx',
        'src/routes/**',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/assets/**',
      ],
      // Gate por capa: la lógica (stores/hooks/api/lib) es donde viven los bugs
      // que cuestan dinero → umbral alto. Las páginas se cubren con smoke + e2e.
      thresholds: {
        'src/stores/**': { statements: 85, functions: 85, lines: 85 },
        'src/shared/lib/**': { statements: 85, lines: 85 },
        'src/shared/api/**': { statements: 70, lines: 70 },
        'src/shared/hooks/**': { statements: 70, lines: 70 },
      },
    },
  },
})
