import { useEffect, useState, useMemo } from 'react'
import {
  isAllOnPageSelected,
  computeSelectedCount,
  canSelectAllMatching as coreCanSelectAllMatching,
  toggleAllOnPage,
  toggleRowSelection,
} from '@core/rowSelection'

/**
 * Виділення рядків для масових дій (react-admin: bulk selection +
 * SelectAllButton). Два режими:
 *   - явний список id (виділення чекбоксами, працює тільки в межах сторінки);
 *   - selectAllMatching — «всі записи, що підходять під поточний фільтр»,
 *     тоді бекенд отримує фільтр, а не список id.
 * Чисті предикати/редʼюсери — в ядрі (@core/rowSelection), спільні з Vue.
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

  const allOnPageSelected = useMemo(() => isAllOnPageSelected(items, selectedIds), [items, selectedIds])
  const selectedCount = useMemo(
    () => computeSelectedCount(selectAllMatching, total, selectedIds),
    [selectAllMatching, total, selectedIds]
  )
  const canSelectAllMatching = useMemo(
    () => coreCanSelectAllMatching(allOnPageSelected, selectAllMatching, total, items.length),
    [allOnPageSelected, selectAllMatching, total, items.length]
  )

  const clear = () => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }

  const toggleSelectAll = () => {
    setSelectedIds(toggleAllOnPage(items, selectedIds))
    setSelectAllMatching(false)
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds(toggleRowSelection(selectedIds, id))
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
