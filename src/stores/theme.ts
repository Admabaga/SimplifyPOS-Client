import { create } from 'zustand'

export type ThemeId = 'esmeralda' | 'ocean' | 'obsidiana' | 'ambar'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ThemeDef {
  id: ThemeId
  name: string
  description: string
  primary: string      // hex — para el swatch
  sidebar: string      // hex — para el swatch del sidebar
  emoji: string
}

export const THEMES: ThemeDef[] = [
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    description: 'Verde corporativo, sobrio y confiable',
    primary: '#047857',
    sidebar: '#022c22',
    emoji: '🌿',
  },
  {
    id: 'ocean',
    name: 'Océano',
    description: 'Azul ejecutivo, elegante y formal',
    primary: '#1e40af',
    sidebar: '#172554',
    emoji: '🌊',
  },
  {
    id: 'obsidiana',
    name: 'Obsidiana',
    description: 'Dark premium con acento índigo refinado',
    primary: '#4338ca',
    sidebar: '#18181b',
    emoji: '🖤',
  },
  {
    id: 'ambar',
    name: 'Ámbar',
    description: 'Cálido y comercial, transmite energía',
    primary: '#b45309',
    sidebar: '#431407',
    emoji: '✨',
  },
]

export const FONT_SIZES: { id: FontSize; label: string; px: string; description: string }[] = [
  { id: 'sm', label: 'A', px: '13px', description: 'Compacto' },
  { id: 'md', label: 'A', px: '15px', description: 'Normal' },
  { id: 'lg', label: 'A', px: '17px', description: 'Grande' },
  { id: 'xl', label: 'A', px: '19px', description: 'Extra' },
]

// ─── Storage por usuario ──────────────────────────────────────────────────────

function storageKey(userId?: number | null) {
  return userId ? `simplifypos-theme-u${userId}` : 'simplifypos-theme'
}

function loadPrefs(userId?: number | null): { theme: ThemeId; fontSize: FontSize } {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (raw) return JSON.parse(raw)
  } catch {}
  return { theme: 'esmeralda', fontSize: 'md' }
}

function savePrefs(userId: number | null | undefined, theme: ThemeId, fontSize: FontSize) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ theme, fontSize }))
  } catch {}
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ThemeState {
  theme: ThemeId
  fontSize: FontSize
  _userId: number | null
  setTheme: (t: ThemeId) => void
  setFontSize: (f: FontSize) => void
  /** Llamar al hacer login / al montar con usuario ya autenticado */
  initForUser: (userId: number) => void
  /** Llamar al hacer logout */
  resetUser: () => void
}

const defaults = loadPrefs(null)

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: defaults.theme,
  fontSize: defaults.fontSize,
  _userId: null,

  setTheme: (theme) => {
    set({ theme })
    savePrefs(get()._userId, theme, get().fontSize)
    applyTheme(theme, get().fontSize)
  },

  setFontSize: (fontSize) => {
    set({ fontSize })
    savePrefs(get()._userId, get().theme, fontSize)
    applyTheme(get().theme, fontSize)
  },

  initForUser: (userId) => {
    const prefs = loadPrefs(userId)
    set({ theme: prefs.theme, fontSize: prefs.fontSize, _userId: userId })
    applyTheme(prefs.theme, prefs.fontSize)
  },

  resetUser: () => {
    const prefs = loadPrefs(null)
    set({ theme: prefs.theme, fontSize: prefs.fontSize, _userId: null })
    applyTheme(prefs.theme, prefs.fontSize)
  },
}))

/** Aplica el tema y tamaño al <html>. */
export function applyTheme(theme: ThemeId, fontSize: FontSize): void {
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
  html.setAttribute('data-font-size', fontSize)
}
