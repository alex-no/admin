import { useState, useMemo, useEffect } from 'react'

/**
 * Виділення рядків для масових дій (react-admin: bulk selection +
 * SelectAllButton). Два режими:
 *   - явний список id (виділення чекбоксами, працює тільки в межах сторінки);
 *   - selectAllMatching — «всі записи, що підходять під поточний фільтр»,
 *     тоді бекенд отримує фільтр, а не список id.
 */
interface UseRowSelectionOptions {
  items: any[]
  total: number
  /** Значення, зміна яких скидає виділення (фільтри, пошук, сортування, per_page) */
  resetOn?: any[]
}

export function useRowSelection({ items, total, resetOn = [] }: UseRowSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)

  const allOnPageSelected = useMemo(
    () => items.length > 0 && items.every((row) => selectedIds.has(row.id)),
    [items, selectedIds]
  )

  const selectedCount = useMemo(
    () => (selectAllMatching ? total : selectedIds.size),
    [selectAllMatching, total, selectedIds]
  )

  // Пропонувати «виділити всі N» тільки якщо за фільтром є більше, ніж на сторінці
  const canSelectAllMatching = useMemo(
    () => allOnPageSelected && !selectAllMatching && total > items.length,
    [allOnPageSelected, selectAllMatching, total, items.length]
  )

  const clear = () => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((row) => row.id)))
    }
    setSelectAllMatching(false)
  }

  const toggleSelectRow = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
    setSelectAllMatching(false)
  }

  const selectAllMatchingOn = () => {
    setSelectAllMatching(true)
  }

  // Зміна вибірки робить старе виділення безглуздим — і небезпечним, бо
  // наступна масова дія застосувалась би до id з попереднього фільтра.
  useEffect(() => {
    clear()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetOn)

  return {
    selectedIds,
    selectAllMatching,
    selectedCount,
    allOnPageSelected,
    canSelectAllMatching,
    clear,
    toggleSelectAll,
    toggleSelectRow,
    selectAllMatchingOn,
  }
}
