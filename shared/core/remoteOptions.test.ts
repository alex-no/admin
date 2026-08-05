import { describe, expect, it } from 'vitest'
import { formatOptionLabel, withDefaultPerPage } from './remoteOptions'

describe('formatOptionLabel', () => {
  it('substitutes {key} placeholders from the row', () => {
    expect(formatOptionLabel('{utc_offset} ({count})', { utc_offset: '+03:00', count: 12 })).toBe('+03:00 (12)')
  })

  it('renders missing keys as empty string, not "undefined"', () => {
    expect(formatOptionLabel('{missing}', {})).toBe('')
  })
})

describe('withDefaultPerPage', () => {
  it('appends per_page with "?" when the URL has no query string', () => {
    expect(withDefaultPerPage('/api/admin/geography/countries')).toBe('/api/admin/geography/countries?per_page=500')
  })

  it('appends per_page with "&" when the URL already has a query string', () => {
    expect(withDefaultPerPage('/api/admin/sto?status=active')).toBe('/api/admin/sto?status=active&per_page=500')
  })

  it('leaves the URL untouched if per_page is already present', () => {
    expect(withDefaultPerPage('/api/admin/sto?per_page=100')).toBe('/api/admin/sto?per_page=100')
  })

  it('supports a custom default', () => {
    expect(withDefaultPerPage('/api/x', 50)).toBe('/api/x?per_page=50')
  })
})
