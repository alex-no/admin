import { beforeEach, describe, expect, it } from 'vitest'
import {
  readSavedFilters,
  removeSavedFilter,
  savedFiltersStorageKey,
  upsertSavedFilter,
  writeSavedFilters,
} from './savedFilters'

beforeEach(() => {
  localStorage.clear()
})

describe('readSavedFilters / writeSavedFilters', () => {
  it('returns an empty array when nothing was saved', () => {
    expect(readSavedFilters('sto')).toEqual([])
  })

  it('round-trips saved presets', () => {
    writeSavedFilters('sto', [{ name: 'Active only', filters: { status: 'active' } }])
    expect(readSavedFilters('sto')).toEqual([{ name: 'Active only', filters: { status: 'active' } }])
  })

  it('treats corrupted JSON as empty, not a crash', () => {
    localStorage.setItem(savedFiltersStorageKey('sto'), '{broken')
    expect(readSavedFilters('sto')).toEqual([])
  })

  it('treats a non-array payload as empty', () => {
    localStorage.setItem(savedFiltersStorageKey('sto'), JSON.stringify({ not: 'an array' }))
    expect(readSavedFilters('sto')).toEqual([])
  })
})

describe('upsertSavedFilter', () => {
  it('appends a new preset', () => {
    const result = upsertSavedFilter([], 'My view', { filters: { a: 1 } })
    expect(result).toEqual([{ name: 'My view', filters: { a: 1 } }])
  })

  it('replaces an existing preset with the same name, keeping its position irrelevant (moved to end)', () => {
    const existing = [{ name: 'A', filters: {} }, { name: 'B', filters: {} }]
    const result = upsertSavedFilter(existing, 'A', { filters: { updated: true } })
    expect(result).toEqual([{ name: 'B', filters: {} }, { name: 'A', filters: { updated: true } }])
  })
})

describe('removeSavedFilter', () => {
  it('removes the preset with the matching name', () => {
    const existing = [{ name: 'A' }, { name: 'B' }]
    expect(removeSavedFilter(existing, 'A')).toEqual([{ name: 'B' }])
  })

  it('is a no-op if the name is not present', () => {
    const existing = [{ name: 'A' }]
    expect(removeSavedFilter(existing, 'missing')).toEqual([{ name: 'A' }])
  })
})
