import { describe, expect, it } from 'vitest'
import { coerceUrlValue, isEmptyUrlValue, parseMultiSort, serializeMultiSort } from './urlState'

describe('parseMultiSort', () => {
  it('parses a single key:dir pair', () => {
    expect(parseMultiSort('name:asc')).toEqual([{ key: 'name', dir: 'asc' }])
  })

  it('parses multiple pairs in order', () => {
    expect(parseMultiSort('type:asc,name:desc')).toEqual([
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'desc' },
    ])
  })

  it('normalizes direction case, defaulting to asc for anything but desc', () => {
    expect(parseMultiSort('name:DESC')).toEqual([{ key: 'name', dir: 'desc' }])
    expect(parseMultiSort('name:garbage')).toEqual([{ key: 'name', dir: 'asc' }])
  })

  it('defaults to asc when dir is missing', () => {
    expect(parseMultiSort('name')).toEqual([{ key: 'name', dir: 'asc' }])
  })

  it('returns an empty array for empty/missing input', () => {
    expect(parseMultiSort('')).toEqual([])
    expect(parseMultiSort(null)).toEqual([])
    expect(parseMultiSort(undefined)).toEqual([])
  })
})

describe('serializeMultiSort', () => {
  it('joins items as key:dir pairs', () => {
    expect(
      serializeMultiSort([
        { key: 'type', dir: 'asc' },
        { key: 'name', dir: 'desc' },
      ])
    ).toBe('type:asc,name:desc')
  })

  it('round-trips through parseMultiSort', () => {
    const items = [{ key: 'a', dir: 'desc' as const }]
    expect(parseMultiSort(serializeMultiSort(items))).toEqual(items)
  })

  it('returns an empty string for empty/missing input', () => {
    expect(serializeMultiSort([])).toBe('')
    expect(serializeMultiSort(null)).toBe('')
  })
})

describe('coerceUrlValue', () => {
  it('coerces to number when the default is a number', () => {
    expect(coerceUrlValue('42', 0)).toBe(42)
  })

  it('falls back to default when a numeric value fails to parse', () => {
    expect(coerceUrlValue('not-a-number', 10)).toBe(10)
  })

  it('coerces "true"/"1" to boolean true, anything else to false', () => {
    expect(coerceUrlValue('true', false)).toBe(true)
    expect(coerceUrlValue('1', false)).toBe(true)
    expect(coerceUrlValue('false', true)).toBe(false)
  })

  it('passes strings through unchanged when the default is a string', () => {
    expect(coerceUrlValue('active', '')).toBe('active')
  })

  it('returns defaultValue for empty/null/undefined raw input', () => {
    expect(coerceUrlValue('', 'fallback')).toBe('fallback')
    expect(coerceUrlValue(null, 'fallback')).toBe('fallback')
    expect(coerceUrlValue(undefined, 'fallback')).toBe('fallback')
  })
})

describe('isEmptyUrlValue', () => {
  it('treats "", null and undefined as empty', () => {
    expect(isEmptyUrlValue('')).toBe(true)
    expect(isEmptyUrlValue(null)).toBe(true)
    expect(isEmptyUrlValue(undefined)).toBe(true)
  })

  it('treats 0 and false as non-empty', () => {
    expect(isEmptyUrlValue(0)).toBe(false)
    expect(isEmptyUrlValue(false)).toBe(false)
  })
})
