import { describe, it, expect, beforeEach } from 'vitest'
import { useThemeStore, applyTheme, THEMES, FONT_SIZES } from '@/stores/theme'

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-font-size')
    useThemeStore.setState({ theme: 'esmeralda', fontSize: 'md', _userId: null })
  })

  it('expone 4 temas y 4 tamaños de fuente', () => {
    expect(THEMES).toHaveLength(4)
    expect(FONT_SIZES).toHaveLength(4)
    expect(THEMES.map((t) => t.id)).toContain('ocean')
  })

  it('applyTheme escribe data-theme y data-font-size en <html>', () => {
    applyTheme('ocean', 'lg')
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean')
    expect(document.documentElement.getAttribute('data-font-size')).toBe('lg')
  })

  it('setTheme persiste y aplica el tema', () => {
    useThemeStore.getState().setTheme('ambar')
    expect(useThemeStore.getState().theme).toBe('ambar')
    expect(document.documentElement.getAttribute('data-theme')).toBe('ambar')
  })

  it('setFontSize persiste y aplica el tamaño', () => {
    useThemeStore.getState().setFontSize('xl')
    expect(useThemeStore.getState().fontSize).toBe('xl')
    expect(document.documentElement.getAttribute('data-font-size')).toBe('xl')
  })

  it('initForUser carga prefs del usuario y resetUser vuelve al default', () => {
    // Usuario 42 guardó tema obsidiana
    localStorage.setItem('simplifypos-theme-u42', JSON.stringify({ theme: 'obsidiana', fontSize: 'sm' }))
    useThemeStore.getState().initForUser(42)
    expect(useThemeStore.getState().theme).toBe('obsidiana')
    expect(useThemeStore.getState()._userId).toBe(42)

    useThemeStore.getState().resetUser()
    expect(useThemeStore.getState()._userId).toBeNull()
    expect(useThemeStore.getState().theme).toBe('esmeralda')
  })

  it('initForUser cae a default si el JSON guardado es inválido', () => {
    localStorage.setItem('simplifypos-theme-u7', '{no-json')
    useThemeStore.getState().initForUser(7)
    expect(useThemeStore.getState().theme).toBe('esmeralda')
  })

  it('guarda prefs por usuario de forma aislada', () => {
    useThemeStore.getState().initForUser(1)
    useThemeStore.getState().setTheme('ocean')
    expect(JSON.parse(localStorage.getItem('simplifypos-theme-u1')!).theme).toBe('ocean')
  })
})
