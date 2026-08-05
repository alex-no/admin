/**
 * Вибір видимих колонок таблиці (react-admin: DatagridConfigurable) на
 * localStorage. Ховати можна лише колонки з hideable !== false; решта видима
 * завжди. Колонка, додана в конфіг після того, як адмін зберіг вибір,
 * показується — у збереженому списку лежать саме приховані ключі, а не видимі.
 */

export function columnPrefsStorageKey(namespace: string): string {
  return `admin.columnPrefs:${namespace}`
}

// null означає «адмін ще нічого не налаштовував» — тільки в цьому випадку
// застосовуються defaultHidden з конфіга.
export function readColumnPrefs(namespace: string): string[] | null {
  try {
    const raw = localStorage.getItem(columnPrefsStorageKey(namespace))
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return Array.isArray(parsed.hidden)
      ? parsed.hidden.filter((k: unknown): k is string => typeof k === 'string')
      : []
  } catch {
    return null
  }
}

export function writeColumnPrefs(namespace: string, hidden: string[]): void {
  // order пишемо завжди, але порожнім: реордера колонок у цій версії немає,
  // поле зарезервоване, щоб додати його потім без міграції localStorage.
  localStorage.setItem(columnPrefsStorageKey(namespace), JSON.stringify({ hidden, order: [] }))
}

export function clearColumnPrefs(namespace: string): void {
  localStorage.removeItem(columnPrefsStorageKey(namespace))
}

export interface HideableColumnLike {
  key: string
  hideable?: boolean
  defaultHidden?: boolean
}

export function hideableKeysOf(columns: HideableColumnLike[]): string[] {
  return columns.filter((c) => c.hideable !== false).map((c) => c.key)
}

export function defaultHiddenOf(columns: HideableColumnLike[]): string[] {
  return columns.filter((c) => c.hideable !== false && c.defaultHidden === true).map((c) => c.key)
}

// Ключі, що зникли з конфіга, відкидаємо — інакше стара конфігурація тримала б
// у localStorage сміття назавжди.
export function initialHiddenColumns(stored: string[] | null, hideableKeys: string[], defaults: string[]): string[] {
  return stored ? stored.filter((k) => hideableKeys.includes(k)) : [...defaults]
}

export function toggleHiddenColumn(hidden: string[], key: string, hideableKeys: string[]): string[] {
  if (!hideableKeys.includes(key)) return hidden
  return hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]
}
