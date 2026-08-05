import { describe, expect, it } from 'vitest'
import { buildBulkBody, buildBulkFilters } from './bulk'

describe('buildBulkFilters', () => {
  it('collects only non-empty configured filter values, keyed by filter key', () => {
    const result = buildBulkFilters(
      [{ key: 'status' }, { key: 'country_id' }],
      { status: 'active', country_id: '', sto_type: 'tire' } // sto_type not in config, must be ignored
    )
    expect(result).toEqual({ status: 'active' })
  })
})

describe('buildBulkBody', () => {
  const filterConfig = [{ key: 'status' }]
  const filters = { status: 'active' }

  it('builds an explicit-ids body when not selecting all matching', () => {
    const body = buildBulkBody({
      action: 'update',
      field: 'rating',
      value: 5,
      selectAllMatching: false,
      selectedIds: [1, 2, 3],
      filterConfig,
      filters,
    })
    expect(body).toEqual({ action: 'update', field: 'rating', value: 5, ids: [1, 2, 3] })
  })

  it('builds an all-matching body carrying the active filters instead of ids', () => {
    const body = buildBulkBody({
      action: 'update',
      field: 'rating',
      value: 5,
      selectAllMatching: true,
      selectedIds: [1, 2, 3], // ignored when selectAllMatching is true
      filterConfig,
      filters,
    })
    expect(body).toEqual({ action: 'update', field: 'rating', value: 5, all: true, filters: { status: 'active' } })
  })

  it('omits field/value for named actions like activate/deactivate', () => {
    const body = buildBulkBody({
      action: 'activate',
      selectAllMatching: false,
      selectedIds: [7],
      filterConfig,
      filters,
    })
    expect(body).toEqual({ action: 'activate', ids: [7] })
  })
})
