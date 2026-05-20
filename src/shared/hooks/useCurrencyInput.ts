/**
 * useCurrencyInput — hook para inputs monetarios en formato colombiano.
 *
 * Almacena el valor como número entero internamente.
 * Muestra con separadores de miles (es-CO): 1.500.000
 * Acepta sólo dígitos — ignora puntos, comas, espacios al tipear.
 *
 * Uso:
 *   const monto = useCurrencyInput(50000)
 *   <input {...monto.inputProps} />
 *   const valor = monto.numericValue()   // → 50000
 */
import { useState } from 'react'

const fmt = (n: number) => (n > 0 ? n.toLocaleString('es-CO') : '')

export function useCurrencyInput(initialValue = 0) {
  const [display, setDisplay] = useState(fmt(initialValue))

  const inputProps = {
    type: 'text' as const,
    inputMode: 'numeric' as const,
    value: display,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '')
      setDisplay(raw ? parseInt(raw, 10).toLocaleString('es-CO') : '')
    },
  }

  const numericValue = () => {
    const raw = display.replace(/[^0-9]/g, '')
    return raw ? parseInt(raw, 10) : 0
  }

  const setFromNumber = (n: number) => setDisplay(fmt(n))

  return { inputProps, numericValue, setFromNumber, display, setDisplay }
}
