// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { computed, ref } from 'vue'

function storageKey(namespace) {
  return `admin.columnPrefs:${namespace}`
}

// Читає збережений вибір. null означає «адмін ще нічого не налаштовував» —
// тільки в цьому випадку застосовуються defaultHidden з дескриптора.
function read(namespace) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(namespace)))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Array.isArray(parsed.hidden) ? parsed.hidden.filter((k) => typeof k === 'string') : []
  } catch {
    return null
  }
}

function write(namespace, hidden) {
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
 * Дзеркало React-версії: frontend-react/src/list-framework/hooks/useColumnPrefs.ts
 * Ключ localStorage і семантика мусять лишатися однаковими.
 *
 * @param {string} namespace
 * @param {Array<{key: string, label: string, hideable?: boolean, defaultHidden?: boolean}>} columns
 */
export function useColumnPrefs(namespace, columns) {
  const hideableKeys = columns.filter((c) => c.hideable !== false).map((c) => c.key)
  const defaults = columns
    .filter((c) => c.hideable !== false && c.defaultHidden === true)
    .map((c) => c.key)

  const stored = read(namespace)
  // Ключі, що зникли з конфіга, відкидаємо — інакше стара конфігурація тримала
  // б у localStorage сміття назавжди.
  const hidden = ref(stored ? stored.filter((k) => hideableKeys.includes(k)) : [...defaults])

  const hiddenSet = computed(() => new Set(hidden.value))
  const hasHidden = computed(() => hidden.value.length > 0)

  function isVisible(key) {
    return !hiddenSet.value.has(key)
  }

  function toggle(key) {
    if (!hideableKeys.includes(key)) return
    hidden.value = hiddenSet.value.has(key)
      ? hidden.value.filter((k) => k !== key)
      : [...hidden.value, key]
    write(namespace, hidden.value)
  }

  // Повернення до дефолту конфіга, а не «показати все»: поки defaultHidden ніде
  // не виставлений, фактично це і є «показати все».
  function reset() {
    hidden.value = [...defaults]
    localStorage.removeItem(storageKey(namespace))
  }

  return { hidden, isVisible, toggle, reset, hasHidden }
}
