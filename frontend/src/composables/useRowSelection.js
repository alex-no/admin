import { ref, computed, watch } from 'vue'

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

  const allOnPageSelected = computed(() =>
    items.value.length > 0 && items.value.every((row) => selectedIds.value.has(row.id))
  )

  const selectedCount = computed(() =>
    selectAllMatching.value ? total.value : selectedIds.value.size
  )

  // Пропонувати «виділити всі N» тільки якщо за фільтром є більше, ніж на сторінці
  const canSelectAllMatching = computed(() =>
    allOnPageSelected.value && !selectAllMatching.value && total.value > items.value.length
  )

  function clear() {
    selectedIds.value = new Set()
    selectAllMatching.value = false
  }

  function toggleSelectAll() {
    if (allOnPageSelected.value) {
      selectedIds.value = new Set()
    } else {
      selectedIds.value = new Set(items.value.map((row) => row.id))
    }
    selectAllMatching.value = false
  }

  function toggleSelectRow(id) {
    const newSet = new Set(selectedIds.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedIds.value = newSet
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
