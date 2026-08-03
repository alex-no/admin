// Copyright (c) 2026 Oleksandr Nosov. MIT License.

import { useState, useCallback } from 'react'

/**
 * Розкривні рядки таблиці (react-admin: Datagrid expand). Кілька рядків можуть
 * бути розкриті одночасно.
 */
export function useRowExpand() {
  const [expanded, setExpanded] = useState<Set<number | string>>(new Set())

  const isExpanded = useCallback(
    (id: number | string) => expanded.has(id),
    [expanded]
  )

  const toggle = useCallback((id: number | string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    setExpanded(new Set())
  }, [])

  return { expanded, isExpanded, toggle, collapseAll }
}
