import { describe, expect, it } from 'vitest'
import { computeRecordPosition, findIndexById, hasNextRecord, hasPrevRecord } from './recordNav'

describe('findIndexById', () => {
  it('finds the row index by rowKey', () => {
    expect(findIndexById([{ id: 1 }, { id: 2 }], 2)).toBe(1)
  })

  it('returns -1 when not found', () => {
    expect(findIndexById([{ id: 1 }], 99)).toBe(-1)
  })

  it('supports a custom row key', () => {
    expect(findIndexById([{ uuid: 'a' }, { uuid: 'b' }], 'b', 'uuid')).toBe(1)
  })
})

describe('computeRecordPosition', () => {
  it('returns null when not present on the page', () => {
    expect(computeRecordPosition(-1, 1, 50)).toBeNull()
  })

  it('computes the 1-based absolute position on page 1', () => {
    expect(computeRecordPosition(0, 1, 50)).toBe(1)
    expect(computeRecordPosition(4, 1, 50)).toBe(5)
  })

  it('accounts for preceding pages', () => {
    expect(computeRecordPosition(0, 3, 50)).toBe(101)
  })
})

describe('hasPrevRecord / hasNextRecord', () => {
  it('hasPrevRecord is false at position 1 or null', () => {
    expect(hasPrevRecord(1)).toBe(false)
    expect(hasPrevRecord(null)).toBe(false)
    expect(hasPrevRecord(2)).toBe(true)
  })

  it('hasNextRecord is false at the last position or null', () => {
    expect(hasNextRecord(10, 10)).toBe(false)
    expect(hasNextRecord(null, 10)).toBe(false)
    expect(hasNextRecord(9, 10)).toBe(true)
  })
})
