import type { SortItem } from './types'

/**
 * Компактне мультисортування в URL: `?sort=name:asc,type:desc` — окремий
 * механізм від query-параметрів запиту (`sort_by`/`sort_dir` у listQuery.ts):
 * тут одна URL-адреса, там тіло HTTP-запиту.
 */
export function parseMultiSort(raw: string | null | undefined): SortItem[] {
  if (!raw) return []
  return String(raw)
    .split(',')
    .map((part) => {
      const [key, dir] = part.split(':')
      if (!key) return null
      return { key, dir: String(dir ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc' } as SortItem
    })
    .filter((x): x is SortItem => x !== null)
}

export function serializeMultiSort(items: SortItem[] | null | undefined): string {
  return (items ?? []).map((s) => `${s.key}:${s.dir}`).join(',')
}

/**
 * Значення фільтра з URL, приведене до типу за замовчуванням (number/boolean/
 * string). Порожнє/відсутнє значення в URL — повертає defaultValue як є.
 */
export function coerceUrlValue(raw: string | null | undefined, defaultValue: any): any {
  if (raw === undefined || raw === null || raw === '') return defaultValue
  if (typeof defaultValue === 'number') return Number(raw) || defaultValue
  if (typeof defaultValue === 'boolean') return raw === 'true' || raw === '1'
  return raw
}

export function isEmptyUrlValue(value: any): boolean {
  return value === '' || value === null || value === undefined
}
