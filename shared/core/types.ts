/**
 * Мінімальні структурні типи, спільні для всіх модулів ядра. Навмисно не
 * імпортують типи фронтендів (`frontend/`, `frontend-react/`) — ядро не має
 * залежати від жодного з них, лише навпаки.
 */

export interface SortItem {
  key: string
  dir: 'asc' | 'desc'
}

/** Поля filterConfig, які реально використовує ядро — решта (label, options, …) рендереру. */
export interface FilterConfigLike {
  key: string
  /** Ім'я query-параметра, якщо відрізняється від key. */
  param?: string
}

export type FilterValues = Record<string, any>

export interface Option {
  value: any
  label: string
}
