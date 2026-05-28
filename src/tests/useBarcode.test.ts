import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBarcode } from '@/shared/hooks/useBarcode'

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))
import toast from 'react-hot-toast'

const products = [
  { id: 1, nombre: 'Coca Cola', codigo: '7702011035' },
  { id: 2, nombre: 'Agua Cristal', codigo: 'ABC123' },
]

function fireKeys(keys: string[], gap = 30) {
  // Simula una lectora de código de barras enviando chars rápido
  keys.forEach((key) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

function scanCode(code: string) {
  // Simula el escaneo completo: chars rápidos + Enter
  ;[...code, 'Enter'].forEach((key) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('useBarcode', () => {
  const onProductFound = vi.fn()

  beforeEach(() => {
    onProductFound.mockClear()
    vi.mocked(toast.error).mockClear()
  })

  it('llama onProductFound cuando se escanea un código válido', () => {
    renderHook(() => useBarcode({ products, onProductFound, enabled: true }))
    scanCode('7702011035')
    expect(onProductFound).toHaveBeenCalledWith(1)
  })

  it('llama onProductFound con el id correcto del segundo producto', () => {
    renderHook(() => useBarcode({ products, onProductFound, enabled: true }))
    scanCode('ABC123')
    expect(onProductFound).toHaveBeenCalledWith(2)
  })

  it('muestra toast.error si el código no existe', () => {
    renderHook(() => useBarcode({ products, onProductFound, enabled: true }))
    scanCode('NOEXISTE99')
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('NOEXISTE99'))
    expect(onProductFound).not.toHaveBeenCalled()
  })

  it('no actúa si enabled=false', () => {
    renderHook(() => useBarcode({ products, onProductFound, enabled: false }))
    scanCode('7702011035')
    expect(onProductFound).not.toHaveBeenCalled()
  })

  it('no actúa si el foco está en un input', () => {
    renderHook(() => useBarcode({ products, onProductFound, enabled: true }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    scanCode('7702011035')
    expect(onProductFound).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('es case-insensitive al comparar códigos', () => {
    renderHook(() => useBarcode({ products, onProductFound, enabled: true }))
    scanCode('abc123') // en minúsculas, código está como 'ABC123'
    expect(onProductFound).toHaveBeenCalledWith(2)
  })
})
