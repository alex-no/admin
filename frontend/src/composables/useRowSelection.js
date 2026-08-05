import { ref, computed, watch } from 'vue'
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
 *
 * @param {Object} opts
 * @param {import('vue').Ref<Array>}  opts.items   - рядки поточної сторінки
 * @param {import('vue').Ref<number>} opts.total   - всього за фільтром
 * @param {Array<import('vue').Ref>}  opts.resetOn - рефи, зміна яких скидає виділення
 *                                                   (фільтри, пошук, сортування, per_page)
 */
export function useRowSelection({ items, total, resetOn = [] }) {
  const selectedIds = ref(new Set())
  const selectAllMatching = ref(false)

  const allOnPageSelected = computed(() => isAllOnPageSelected(items.value, selectedIds.value))
  const selectedCount = computed(() => computeSelectedCount(selectAllMatching.value, total.value, selectedIds.value))

  const canSelectAllMatching = computed(() =>
    coreCanSelectAllMatching(allOnPageSelected.value, selectAllMatching.value, total.value, items.value.length)
  )

  function clear() {
    selectedIds.value = new Set()
    selectAllMatching.value = false
  }

  function toggleSelectAll() {
    selectedIds.value = toggleAllOnPage(items.value, selectedIds.value)
    selectAllMatching.value = false
  }

  function toggleSelectRow(id) {
    selectedIds.value = toggleRowSelection(selectedIds.value, id)
    selectAllMatching.value = false
  }

  function selectAllMatchingOn() {
    selectAllMatching.value = true
  }

  // Зміна вибірки робить старе виділення безглуздим — і небезпечним, бо
  // наступна масова дія застосувалась би до id з попереднього фільтра.
  for (const r of resetOn) {
    watch(r, clear)
  }

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
