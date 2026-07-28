import React, { useMemo } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}

interface PageItem {
  page?: number
  ellipsis?: 'left' | 'right'
}

export default function Pagination({ currentPage, totalPages, onChange }: PaginationProps) {
  const pageItems = useMemo((): PageItem[] => {
    if (totalPages <= 1) return []

    const items: PageItem[] = []

    // Якщо сторінок мало, показуємо всі
    if (totalPages <= 8) {
      for (let i = 1; i <= totalPages; i++) {
        items.push({ page: i })
      }
      return items
    }

    // Діапазон навколо поточної сторінки
    const rangeStart = Math.max(1, currentPage - 2)
    const rangeEnd = Math.min(totalPages, currentPage + 2)

    // Додаємо перші 2 сторінки
    items.push({ page: 1 })
    if (totalPages > 1) {
      items.push({ page: 2 })
    }

    // Багатокрапка зліва
    if (rangeStart > 3) {
      items.push({ ellipsis: 'left' })
    }

    // Сторінки навколо поточної
    for (let i = Math.max(3, rangeStart); i <= Math.min(totalPages - 2, rangeEnd); i++) {
      items.push({ page: i })
    }

    // Багатокрапка справа
    if (rangeEnd < totalPages - 2) {
      items.push({ ellipsis: 'right' })
    }

    // Останні 2 сторінки
    if (totalPages > 2) {
      items.push({ page: totalPages - 1 })
    }
    items.push({ page: totalPages })

    return items
  }, [currentPage, totalPages])

  const goTo = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onChange(page)
    }
  }

  if (totalPages <= 1) return null

  return (
    <nav>
      <ul className="pagination pagination-sm mb-0">
        {/* First page */}
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => goTo(1)}
            disabled={currentPage === 1}
            title="Перша сторінка"
          >
            ‹‹
          </button>
        </li>

        {/* Previous page */}
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage === 1}
            title="Попередня"
          >
            ‹
          </button>
        </li>

        {/* Page numbers with ellipsis */}
        {pageItems.map((item, idx) =>
          item.ellipsis ? (
            <li key={`ellipsis-${item.ellipsis}-${idx}`} className="page-item disabled">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li
              key={`page-${item.page}`}
              className={`page-item ${item.page === currentPage ? 'active' : ''}`}
            >
              <button className="page-link" onClick={() => goTo(item.page!)}>
                {item.page}
              </button>
            </li>
          )
        )}

        {/* Next page */}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Наступна"
          >
            ›
          </button>
        </li>

        {/* Last page */}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => goTo(totalPages)}
            disabled={currentPage === totalPages}
            title="Остання сторінка"
          >
            ››
          </button>
        </li>
      </ul>
    </nav>
  )
}
