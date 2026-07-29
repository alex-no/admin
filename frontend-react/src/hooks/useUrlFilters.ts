import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface SortState {
  sortKey: string
  sortDir: string
}

export interface MultiSortItem {
  key: string
  dir: string
}

interface UseUrlFiltersOptions {
  filters?: Record<string, string | number | boolean | null | undefined>
  /** Сортування по одній колонці → ?sort_by=&sort_dir= */
  sorting?: SortState | null
  /** Сортування по кількох колонках → ?sort=key:dir,key2:dir2 */
  multiSort?: MultiSortItem[] | null
  /** Відкрита картка деталей → ?id= */
  detailId?: number | null
}

/**
 * Синхронізація фільтрів, сортування та відкритої картки з адресним рядком.
 *
 * У Vue-версії композабл мутує рефи напряму; у React стан належить компоненту,
 * тому це розділено на два кроки:
 *   1. read*FromUrl() — початкові значення, для useState(() => ...)
 *   2. useUrlFilters() — пише поточні значення назад в URL
 */

function parseMultiSort(raw: string | null): MultiSortItem[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(part => {
      const [key, dir] = part.split(':')
      if (!key) return null
      return { key, dir: String(dir ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC' }
    })
    .filter((x): x is MultiSortItem => x !== null)
}

function currentParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

/** Початкові значення фільтрів з URL. Типи виводяться з defaults. */
export function readFiltersFromUrl<T extends Record<string, any>>(defaults: T): T {
  const params = currentParams()
  const result = { ...defaults }

  for (const key of Object.keys(defaults)) {
    const raw = params.get(key)
    if (raw === null || raw === '') continue

    const def = defaults[key]
    if (typeof def === 'number') {
      (result as any)[key] = Number(raw) || def
    } else if (typeof def === 'boolean') {
      (result as any)[key] = raw === 'true' || raw === '1'
    } else {
      (result as any)[key] = raw
    }
  }

  return result
}

export function readSortFromUrl(defaults: SortState): SortState {
  const params = currentParams()
  return {
    sortKey: params.get('sort_by') || defaults.sortKey,
    sortDir: (params.get('sort_dir') || defaults.sortDir).toUpperCase(),
  }
}

export function readMultiSortFromUrl(): MultiSortItem[] {
  return parseMultiSort(currentParams().get('sort'))
}

export function readDetailIdFromUrl(): number | null {
  const id = Number(currentParams().get('id'))
  return id > 0 ? id : null
}

/** Рядок запиту, який має відповідати поточному стану */
function buildQuery({ filters = {}, sorting, multiSort, detailId }: UseUrlFiltersOptions): string {
  const params = currentParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value === '' || value === null || value === undefined) params.delete(key)
    else params.set(key, String(value))
  }

  if (sorting) {
    if (sorting.sortKey) params.set('sort_by', sorting.sortKey)
    else params.delete('sort_by')

    if (sorting.sortDir) params.set('sort_dir', sorting.sortDir)
    else params.delete('sort_dir')
  }

  if (multiSort) {
    const serialized = multiSort.map(s => `${s.key}:${s.dir}`).join(',')
    if (serialized) params.set('sort', serialized)
    else params.delete('sort')
  }

  if (detailId) params.set('id', String(detailId))
  else params.delete('id')

  return params.toString()
}

export function useUrlFilters(options: UseUrlFiltersOptions) {
  const [, setSearchParams] = useSearchParams()

  // buildQuery повертає рядок — тому в залежностях ефекту примітив, а не об'єкт,
  // що перестворюється щорендеру (інакше — нескінченний цикл оновлень).
  const target = buildQuery(options)
  const lastWritten = useRef<string | null>(null)

  useEffect(() => {
    if (lastWritten.current === target) return
    lastWritten.current = target

    if (window.location.search.replace(/^\?/, '') !== target) {
      // replace, а не push — щоб кнопка "Назад" не гортала кожну зміну фільтра
      setSearchParams(new URLSearchParams(target), { replace: true })
    }
  }, [target, setSearchParams])
}
