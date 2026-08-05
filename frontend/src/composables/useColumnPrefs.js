// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { computed, ref } from 'vue'
import {
  hideableKeysOf,
  defaultHiddenOf,
  initialHiddenColumns,
  toggleHiddenColumn,
  readColumnPrefs,
  writeColumnPrefs,
  clearColumnPrefs,
} from '@core/columnPrefs'

/**
 * Вибір видимих колонок таблиці (react-admin: DatagridConfigurable) на
 * localStorage — namespace = унікальний ключ списку (як у useSavedFilters,
 * тобто apiList).
 *
 * Дзеркало React-версії: frontend-react/src/list-framework/hooks/useColumnPrefs.ts
 * Ключ localStorage і семантика мусять лишатися однаковими — див. ядро @core/columnPrefs.
 *
 * @param {string} namespace
 * @param {Array<{key: string, label: string, hideable?: boolean, defaultHidden?: boolean}>} columns
 */
export function useColumnPrefs(namespace, columns) {
  const hideableKeys = hideableKeysOf(columns)
  const defaults = defaultHiddenOf(columns)

  const hidden = ref(initialHiddenColumns(readColumnPrefs(namespace), hideableKeys, defaults))

  const hiddenSet = computed(() => new Set(hidden.value))
  const hasHidden = computed(() => hidden.value.length > 0)

  function isVisible(key) {
    return !hiddenSet.value.has(key)
  }

  function toggle(key) {
    const next = toggleHiddenColumn(hidden.value, key, hideableKeys)
    if (next === hidden.value) return
    hidden.value = next
    writeColumnPrefs(namespace, next)
  }

  // Повернення до дефолту конфіга, а не «показати все»: поки defaultHidden ніде
  // не виставлений, фактично це і є «показати все».
  function reset() {
    hidden.value = [...defaults]
    clearColumnPrefs(namespace)
  }

  return { hidden, isVisible, toggle, reset, hasHidden }
}
