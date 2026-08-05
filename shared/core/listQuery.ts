import type { FilterConfigLike, FilterValues, SortItem } from './types'

function isSetValue(value: any): boolean {
  return value !== '' && value !== null && value !== undefined && value !== false
}

/**
 * Пише фільтри у query-параметри: спершу описані в filterConfig (з можливим
 * аліасом param — кілька фільтрів можуть писати в один параметр, виграє
 * останній непорожній у порядку конфіга), потім довільні фільтри, яких немає
 * в конфізі (задані сторінкою напряму, ключ = ім'я параметра як є).
 */
export function applyFilterParams(
  params: URLSearchParams,
  filterConfig: FilterConfigLike[],
  filters: FilterValues
): void {
  for (const f of filterConfig) {
    const v = filters[f.key]
    if (isSetValue(v)) {
      params.set(f.param ?? f.key, String(v))
    }
  }
  for (const [key, value] of Object.entries(filters)) {
    if (filterConfig.some((f) => f.key === key)) continue
    if (isSetValue(value)) {
      params.set(key, String(value))
    }
  }
}

/** Пише сортування у форматі бекенду: окремі sort_by/sort_dir через кому, у порядку sortItems. */
export function applySortParams(params: URLSearchParams, sortItems: SortItem[]): void {
  if (sortItems.length > 0) {
    params.set('sort_by', sortItems.map((s) => s.key).join(','))
    params.set('sort_dir', sortItems.map((s) => s.dir).join(','))
  }
}

export interface BuildListQueryParamsOptions {
  page?: number
  perPage?: number
  sortItems: SortItem[]
  filterConfig: FilterConfigLike[]
  filters: FilterValues
}

/**
 * Збирає query-параметри списку (page, per_page, сортування, фільтри) —
 * той самий набір, що раніше повторювався окремо для основного запиту,
 * polling-ревалідації та CSV-експорту (в обох фреймворках по 3 копії).
 * `page`/`perPage` необов'язкові — CSV-експорт ставить `page` сам у циклі
 * пагінації і використовує інший `perPage`.
 */
export function buildListQueryParams(opts: BuildListQueryParamsOptions): URLSearchParams {
  const params = new URLSearchParams()
  if (opts.page !== undefined) params.set('page', String(opts.page))
  if (opts.perPage !== undefined) params.set('per_page', String(opts.perPage))
  applySortParams(params, opts.sortItems)
  applyFilterParams(params, opts.filterConfig, opts.filters)
  return params
}
