import { useEffect, useRef } from 'react'
import { X, Palette, Type, Check } from 'lucide-react'
import { useThemeStore, THEMES, FONT_SIZES, applyTheme } from '@/stores/theme'
import type { ThemeId, FontSize } from '@/stores/theme'

interface ThemePanelProps {
  open: boolean
  onClose: () => void
}

export default function ThemePanel({ open, onClose }: ThemePanelProps) {
  const { theme, fontSize, setTheme, setFontSize } = useThemeStore()
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Cerrar con click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    // delay para no capturar el mismo click que abre
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [open, onClose])

  const handleTheme = (t: ThemeId) => {
    setTheme(t)
    applyTheme(t, fontSize)
  }

  const handleFontSize = (f: FontSize) => {
    setFontSize(f)
    applyTheme(theme, f)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay sutil */}
      <div className="fixed inset-0 z-40 bg-black/15" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-4 top-14 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden animate-scale-in"
        role="dialog"
        aria-label="Personalizar interfaz"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--t-primary-light)' }}
            >
              <Palette size={15} style={{ color: 'var(--t-primary)' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">Personalizar</p>
              <p className="text-[10px] text-slate-400 leading-tight">Tema y tipografía</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-6">

          {/* ─── Tema de color ─────────────────────────────────────── */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-slate-400 mb-3">
              Color de la interfaz
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((t) => {
                const isActive = theme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTheme(t.id)}
                    className={`group relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-[var(--t-primary)] bg-[var(--t-primary-xlight)]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Swatch */}
                    <div className="relative shrink-0">
                      <div
                        className="w-8 h-8 rounded-lg shadow-sm"
                        style={{ background: t.sidebar }}
                      >
                        {/* dot de color primario */}
                        <div
                          className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white"
                          style={{ background: t.primary }}
                        />
                      </div>
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: 'var(--t-primary)' }}>
                          <Check size={9} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-[var(--t-primary-dark)]' : 'text-slate-700'}`}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-snug truncate">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── Tamaño de letra ───────────────────────────────────── */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              <Type size={10} />
              Tamaño de letra
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {FONT_SIZES.map((f, i) => {
                const isActive = fontSize === f.id
                const labelSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl']
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFontSize(f.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-[var(--t-primary)] bg-[var(--t-primary-xlight)]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`font-bold leading-none ${labelSizes[i]} ${
                        isActive ? 'text-[var(--t-primary)]' : 'text-slate-600'
                      }`}
                    >
                      A
                    </span>
                    <span className={`text-[9px] font-medium leading-tight text-center ${isActive ? 'text-[var(--t-primary-dark)]' : 'text-slate-400'}`}>
                      {f.description}
                    </span>
                    {isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--t-primary)' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── Preview live ──────────────────────────────────────── */}
          <div
            className="rounded-xl p-3.5 border"
            style={{
              background: 'var(--t-primary-xlight)',
              borderColor: 'var(--t-primary-light)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'var(--t-primary)' }}
              >
                S
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--t-primary-dark)' }}>
                  Vista previa en vivo
                </p>
                <p className="text-[10px]" style={{ color: 'var(--t-primary)' }}>
                  Los cambios se aplican al instante
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 pt-0">
          <p className="text-[10px] text-slate-400 text-center">
            Tu preferencia se guarda automáticamente
          </p>
        </div>
      </div>
    </>
  )
}
