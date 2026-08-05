import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearColumnPrefs,
  columnPrefsStorageKey,
  defaultHiddenOf,
  hideableKeysOf,
  initialHiddenColumns,
  readColumnPrefs,
  toggleHiddenColumn,
  writeColumnPrefs,
} from './columnPrefs'

beforeEach(() => {
  localStorage.clear()
})

describe('columnPrefsStorageKey', () => {
  it('namespaces the key', () => {
    expect(columnPrefsStorageKey('sto')).toBe('admin.columnPrefs:sto')
  })
})

describe('readColumnPrefs / writeColumnPrefs / clearColumnPrefs', () => {
  it('returns null when nothing was ever saved', () => {
    expect(readColumnPrefs('sto')).toBeNull()
  })

  it('round-trips a written selection', () => {
    writeColumnPrefs('sto', ['rating', 'address'])
    expect(readColumnPrefs('sto')).toEqual(['rating', 'address'])
  })

  it('clear removes the stored value', () => {
    writeColumnPrefs('sto', ['rating'])
    clearColumnPrefs('sto')
    expect(readColumnPrefs('sto')).toBeNull()
  })

  it('treats corrupted JSON as "never configured" (null), not a crash', () => {
    localStorage.setItem(columnPrefsStorageKey('sto'), '{not json')
    expect(readColumnPrefs('sto')).toBeNull()
  })

  it('treats a non-object / array payload as null', () => {
    localStorage.setItem(columnPrefsStorageKey('sto'), '"just a string"')
    expect(readColumnPrefs('sto')).toBeNull()
    localStorage.setItem(columnPrefsStorageKey('sto'), '[1,2,3]')
    expect(readColumnPrefs('sto')).toBeNull()
  })

  it('filters non-string entries out of a malformed hidden array', () => {
    localStorage.setItem(columnPrefsStorageKey('sto'), JSON.stringify({ hidden: ['a', 5, null, 'b'] }))
    expect(readColumnPrefs('sto')).toEqual(['a', 'b'])
  })
})

const columns = [
  { key: 'id', hideable: false },
  { key: 'name', hideable: true },
  { key: 'internal_note', hideable: true, defaultHidden: true },
]

describe('hideableKeysOf / defaultHiddenOf', () => {
  it('excludes hideable: false columns', () => {
    expect(hideableKeysOf(columns)).toEqual(['name', 'internal_note'])
  })

  it('only includes hideable columns with defaultHidden: true', () => {
    expect(defaultHiddenOf(columns)).toEqual(['internal_note'])
  })
})

describe('initialHiddenColumns', () => {
  it('falls back to config defaults when nothing stored', () => {
    expect(initialHiddenColumns(null, ['name', 'internal_note'], ['internal_note'])).toEqual(['internal_note'])
  })

  it('uses stored selection, dropping keys no longer in the config', () => {
    const result = initialHiddenColumns(['internal_note', 'removed_column'], ['name', 'internal_note'], ['internal_note'])
    expect(result).toEqual(['internal_note'])
  })
})

describe('toggleHiddenColumn', () => {
  it('hides a visible hideable column', () => {
    expect(toggleHiddenColumn([], 'name', ['name'])).toEqual(['name'])
  })

  it('un-hides an already-hidden column', () => {
    expect(toggleHiddenColumn(['name'], 'name', ['name'])).toEqual([])
  })

  it('is a no-op for a column outside hideableKeys (e.g. hideable: false)', () => {
    expect(toggleHiddenColumn([], 'id', ['name'])).toEqual([])
  })
})
