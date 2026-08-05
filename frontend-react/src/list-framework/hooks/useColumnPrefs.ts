import { useCallback, useMemo, useState } from 'react'
import type { ColumnConfig } from '../types'
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
 * Дзеркало Vue-версії: frontend/src/composables/useColumnPrefs.js
 * Ключ localStorage і семантика мусять лишатися однаковими — див. ядро @core/columnPrefs.
 */
export function useColumnPrefs(namespace: string, columns: ColumnConfig[]) {
  const hideableKeys = useMemo(() => hideableKeysOf(columns), [columns])
  const defaults = useMemo(() => defaultHiddenOf(columns), [columns])

  const [hidden, setHidden] = useState<string[]>(() =>
    initialHiddenColumns(readColumnPrefs(namespace), hideableKeys, defaults)
  )

  const hiddenSet = useMemo(() => new Set(hidden), [hidden])

  const isVisible = useCallback((key: string) => !hiddenSet.has(key), [hiddenSet])

  // next рахуємо тут, а не в updater'і setHidden: у StrictMode updater
  // викликається двічі, і write() у ньому дав би подвійний запис у localStorage.
  const toggle = useCallback((key: string) => {
    const next = toggleHiddenColumn(hidden, key, hideableKeys)
    if (next === hidden) return
    setHidden(next)
    writeColumnPrefs(namespace, next)
  }, [hidden, hideableKeys, namespace])

  // Повернення до дефолту конфіга, а не «показати все»: поки defaultHidden ніде
  // не виставлений, фактично це і є «показати все».
  const reset = useCallback(() => {
    setHidden([...defaults])
    clearColumnPrefs(namespace)
  }, [defaults, namespace])

  return { hidden, isVisible, toggle, reset, hasHidden: hidden.length > 0 }
}
