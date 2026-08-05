import { describe, expect, it } from 'vitest'
import { applyFilterParams, applySortParams, buildListQueryParams } from './listQuery'

describe('applyFilterParams', () => {
  it('writes configured filters using the key by default', () => {
    const params = new URLSearchParams()
    applyFilterParams(params, [{ key: 'status' }], { status: 'active' })
    expect(params.get('status')).toBe('active')
  })

  it('writes to the aliased param name when given', () => {
    const params = new URLSearchParams()
    applyFilterParams(params, [{ key: 'area_region_id', param: 'region' }], { area_region_id: '5' })
    expect(params.get('region')).toBe('5')
    expect(params.has('area_region_id')).toBe(false)
  })

  it('skips empty/null/undefined/false values', () => {
    const params = new URLSearchParams()
    applyFilterParams(params, [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }], {
      a: '',
      b: null,
      c: undefined,
      d: false,
    })
    expect([...params.keys()]).toEqual([])
  })

  it('later config entries win when two filters alias the same param', () => {
    const params = new URLSearchParams()
    applyFilterParams(
      params,
      [
        { key: 'area_region_id', param: 'region' },
        { key: 'district_id', param: 'region' },
      ],
      { area_region_id: '5', district_id: '9' }
    )
    expect(params.get('region')).toBe('9')
  })

  it('also writes ad-hoc filters not described in filterConfig, keyed as-is', () => {
    const params = new URLSearchParams()
    applyFilterParams(params, [{ key: 'status' }], { status: 'active', ip: '1.2.3.4' })
    expect(params.get('status')).toBe('active')
    expect(params.get('ip')).toBe('1.2.3.4')
  })
})

describe('applySortParams', () => {
  it('does nothing when there is no sort', () => {
    const params = new URLSearchParams()
    applySortParams(params, [])
    expect([...params.keys()]).toEqual([])
  })

  it('joins multiple sort keys/dirs by position', () => {
    const params = new URLSearchParams()
    applySortParams(params, [
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'desc' },
    ])
    expect(params.get('sort_by')).toBe('type,name')
    expect(params.get('sort_dir')).toBe('asc,desc')
  })
})

describe('buildListQueryParams', () => {
  it('combines page, per_page, sort and filters', () => {
    const params = buildListQueryParams({
      page: 2,
      perPage: 50,
      sortItems: [{ key: 'name', dir: 'asc' }],
      filterConfig: [{ key: 'status' }],
      filters: { status: 'active' },
    })
    expect(params.toString()).toBe('page=2&per_page=50&sort_by=name&sort_dir=asc&status=active')
  })

  it('omits page/per_page when not given (CSV export sets page itself per iteration)', () => {
    const params = buildListQueryParams({
      perPage: 500,
      sortItems: [],
      filterConfig: [],
      filters: {},
    })
    expect(params.has('page')).toBe(false)
    expect(params.get('per_page')).toBe('500')
  })
})
