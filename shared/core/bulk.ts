import type { FilterConfigLike, FilterValues } from './types'

function isSetValue(value: any): boolean {
  return value !== '' && value !== null && value !== undefined && value !== false
}

/** Фільтри для bulk "усі за фільтром" — той самий набір, що йде у список. */
export function buildBulkFilters(filterConfig: FilterConfigLike[], filters: FilterValues): Record<string, any> {
  const result: Record<string, any> = {}
  for (const f of filterConfig) {
    const v = filters[f.key]
    if (isSetValue(v)) {
      result[f.key] = v
    }
  }
  return result
}

export interface BulkBody {
  action: string
  field?: string
  value?: any
  all?: true
  filters?: Record<string, any>
  ids?: Array<string | number>
}

export interface BuildBulkBodyOptions {
  action: string
  /** Лише для "змінити поле…"; іменовані дії (activate/deactivate) поля не мають. */
  field?: string
  value?: any
  selectAllMatching: boolean
  selectedIds: Iterable<string | number>
  filterConfig: FilterConfigLike[]
  filters: FilterValues
}

/**
 * Тіло bulk-запиту: `{ action, ids }` для явно вибраних рядків або
 * `{ action, all: true, filters }` у режимі "усі за фільтром" — яке поле
 * й на яке значення міняти, вирішує бекенд, конфіг лише передає намір.
 */
export function buildBulkBody(opts: BuildBulkBodyOptions): BulkBody {
  const body: BulkBody = { action: opts.action }
  if (opts.field !== undefined) body.field = opts.field
  if (opts.value !== undefined) body.value = opts.value

  if (opts.selectAllMatching) {
    body.all = true
    body.filters = buildBulkFilters(opts.filterConfig, opts.filters)
  } else {
    body.ids = Array.from(opts.selectedIds)
  }
  return body
}
