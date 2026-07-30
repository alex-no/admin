import { useCallback, useMemo, useState } from 'react'
import type { ColumnConfig } from '../types'

function storageKey(namespace: string): string {
  return `admin.columnPrefs:${namespace}`
}

// Читає збережений вибір. null означає «адмін ще нічого не налаштовував» —
// тільки в цьому випадку застосовуються defaultHidden з конфіга.
function read(namespace: string): string[] | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(namespace)) ?? 'null')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((k: unknown): k is string => typeof k === 'string')
      : []
  } catch {
    return null
  }
}

function write(namespace: string, hidden: string[]): void {
  // order пишемо завжди, але порожнім: реордера колонок у цій версії немає,
  // поле зарезервоване, щоб додати його потім без міграції localStorage.
  localStorage.setItem(storageKey(namespace), JSON.stringify({ hidden, order: [] }))
}

/**
 * Вибір видимих колонок таблиці (react-admin: DatagridConfigurable) на
 * localStorage — namespace = унікальний ключ списку (як у useSavedFilters,
 * тобто apiList).
 *
 * Ховати можна лише колонки з hideable !== false; решта видима завжди.
 * Колонка, додана в конфіг після того, як адмін зберіг вибір, показується — у
 * збереженому списку лежать саме приховані ключі, а не видимі.
 *
 * Дзеркало Vue-версії: frontend/src/composables/useColumnPrefs.js
 * Ключ localStorage і семантика мусять лишатися однаковими.
 */
export function useColumnPrefs(namespace: string, columns: ColumnConfig[]) {
  const hideableKeys = useMemo(
    () => columns.filter(c => c.hideable !== false).map(c => c.key),
    [columns]
  )
  const defaults = useMemo(
    () => columns.filter(c => c.hideable !== false && c.defaultHidden === true).map(c => c.key),
    [columns]
  )

  // Ключі, що зникли з конфіга, відкидаємо — інакше стара конфігурація тримала
  // б у localStorage сміття назавжди.
  const [hidden, setHidden] = useState<string[]>(() => {
    const stored = read(namespace)
    return stored ? stored.filter(k => hideableKeys.includes(k)) : [...defaults]
  })

  const hiddenSet = useMemo(() => new Set(hidden), [hidden])

  const isVisible = useCallback((key: string) => !hiddenSet.has(key), [hiddenSet])

  // next рахуємо тут, а не в updater'і setHidden: у StrictMode updater
  // викликається двічі, і write() у ньому дав би подвійний запис у localStorage.
  const toggle = useCallback((key: string) => {
    if (!hideableKeys.includes(key)) return
    const next = hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key]
    setHidden(next)
    write(namespace, next)
  }, [hidden, hideableKeys, namespace])

  // Повернення до дефолту конфіга, а не «показати все»: поки defaultHidden ніде
  // не виставлений, фактично це і є «показати все».
  const reset = useCallback(() => {
    setHidden([...defaults])
    localStorage.removeItem(storageKey(namespace))
  }, [defaults, namespace])

  return { hidden, isVisible, toggle, reset, hasHidden: hidden.length > 0 }
}
