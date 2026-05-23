import { useState, useCallback, useEffect } from 'react'

export const DEFAULT_PAGE_SIZE = 50

/**
 * Hook de paginación client-side.
 * Toma el array ya filtrado y devuelve la página actual + helpers.
 *
 * Uso:
 *   const pg = usePagination(filteredItems)
 *   // render pg.paginated en la tabla
 *   // <Pagination page={pg.page} total={pg.total} pageSize={pg.pageSize} onChange={pg.setPage} />
 */
export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  // Reset a página 1 cuando cambia el array (filtros aplicados)
  useEffect(() => {
    setPage(1)
  }, [items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const start      = (currentPage - 1) * pageSize
  const paginated  = items.slice(start, start + pageSize)
  const startIndex = items.length === 0 ? 0 : start + 1
  const endIndex   = Math.min(start + pageSize, items.length)

  const reset = useCallback(() => setPage(1), [])

  return {
    page: currentPage,
    setPage,
    paginated,
    total: items.length,
    totalPages,
    pageSize,
    reset,
    startIndex,
    endIndex,
  }
}
