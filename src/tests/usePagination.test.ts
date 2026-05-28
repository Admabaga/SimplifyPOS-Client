import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination, DEFAULT_PAGE_SIZE } from '@/shared/hooks/usePagination'

const makeItems = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagination', () => {
  it('devuelve todos los items si hay menos de pageSize', () => {
    const { result } = renderHook(() => usePagination(makeItems(10)))
    expect(result.current.paginated).toHaveLength(10)
    expect(result.current.total).toBe(10)
    expect(result.current.totalPages).toBe(1)
  })

  it('pagina correctamente — DEFAULT_PAGE_SIZE items por página', () => {
    const items = makeItems(DEFAULT_PAGE_SIZE + 5)
    const { result } = renderHook(() => usePagination(items))
    expect(result.current.paginated).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(result.current.totalPages).toBe(2)
  })

  it('setPage cambia la página y devuelve los items correctos', () => {
    const items = makeItems(DEFAULT_PAGE_SIZE + 3)
    const { result } = renderHook(() => usePagination(items))
    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)
    expect(result.current.paginated).toHaveLength(3)
  })

  it('no va más allá de totalPages', () => {
    const items = makeItems(10)
    const { result } = renderHook(() => usePagination(items))
    act(() => result.current.setPage(99))
    expect(result.current.page).toBe(1)
  })

  it('reset() vuelve a página 1', () => {
    const items = makeItems(DEFAULT_PAGE_SIZE * 3)
    const { result } = renderHook(() => usePagination(items))
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    act(() => result.current.reset())
    expect(result.current.page).toBe(1)
  })

  it('startIndex y endIndex son correctos en página 1', () => {
    const { result } = renderHook(() => usePagination(makeItems(10)))
    expect(result.current.startIndex).toBe(1)
    expect(result.current.endIndex).toBe(10)
  })

  it('pageSize personalizado funciona', () => {
    const { result } = renderHook(() => usePagination(makeItems(25), 10))
    expect(result.current.paginated).toHaveLength(10)
    expect(result.current.totalPages).toBe(3)
  })

  it('array vacío → totalPages 1, paginated vacío', () => {
    const { result } = renderHook(() => usePagination([]))
    expect(result.current.paginated).toHaveLength(0)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.startIndex).toBe(0)
  })
})
