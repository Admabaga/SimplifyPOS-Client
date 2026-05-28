import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCurrencyInput } from '@/shared/hooks/useCurrencyInput'

describe('useCurrencyInput', () => {
  it('valor inicial 0 → display vacío', () => {
    const { result } = renderHook(() => useCurrencyInput(0))
    expect(result.current.inputProps.value).toBe('')
  })

  it('valor inicial positivo → formateado con separadores colombianos', () => {
    const { result } = renderHook(() => useCurrencyInput(1500000))
    expect(result.current.inputProps.value).toBe('1.500.000')
  })

  it('numericValue() retorna el número sin formato', () => {
    const { result } = renderHook(() => useCurrencyInput(50000))
    expect(result.current.numericValue()).toBe(50000)
  })

  it('onChange acepta solo dígitos e ignora puntos y comas', () => {
    const { result } = renderHook(() => useCurrencyInput(0))
    act(() => {
      result.current.inputProps.onChange({
        target: { value: '25.000' },
      } as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.numericValue()).toBe(25000)
  })

  it('setFromNumber actualiza el valor correctamente', () => {
    const { result } = renderHook(() => useCurrencyInput(0))
    act(() => result.current.setFromNumber(980000))
    expect(result.current.numericValue()).toBe(980000)
    expect(result.current.inputProps.value).toBe('980.000')
  })

  it('entrada vacía → numericValue retorna 0', () => {
    const { result } = renderHook(() => useCurrencyInput(0))
    act(() => {
      result.current.inputProps.onChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.numericValue()).toBe(0)
  })
})
