import '@testing-library/jest-dom'

// localStorage mock para jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// ─── Browser APIs que jsdom no implementa (necesarias para render de páginas) ──
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub
;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  ResizeObserverStub

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// scrollTo / scrollIntoView usados por algunos componentes (jsdom no los implementa)
window.scrollTo = window.scrollTo ?? (() => {})
Element.prototype.scrollIntoView = function () {}
HTMLElement.prototype.scrollIntoView = function () {}
