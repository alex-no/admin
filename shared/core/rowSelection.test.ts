import { describe, expect, it } from 'vitest'
import {
  canSelectAllMatching,
  computeSelectedCount,
  isAllOnPageSelected,
  toggleAllOnPage,
  toggleRowSelection,
} from './rowSelection'

const items = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe('isAllOnPageSelected', () => {
  it('false for an empty page', () => {
    expect(isAllOnPageSelected([], new Set())).toBe(false)
  })

  it('false when some rows are not selected', () => {
    expect(isAllOnPageSelected(items, new Set([1, 2]))).toBe(false)
  })

  it('true when every row on the page is selected', () => {
    expect(isAllOnPageSelected(items, new Set([1, 2, 3]))).toBe(true)
  })
})

describe('computeSelectedCount', () => {
  it('uses total when selectAllMatching is on', () => {
    expect(computeSelectedCount(true, 500, new Set([1]))).toBe(500)
  })

  it('uses the explicit set size otherwise', () => {
    expect(computeSelectedCount(false, 500, new Set([1, 2]))).toBe(2)
  })
})

describe('canSelectAllMatching', () => {
  it('offered only when the whole page is selected, not already all-matching, and more rows exist beyond the page', () => {
    expect(canSelectAllMatching(true, false, 100, 20)).toBe(true)
  })

  it('not offered if not all of the page is selected', () => {
    expect(canSelectAllMatching(false, false, 100, 20)).toBe(false)
  })

  it('not offered if already selecting all matching', () => {
    expect(canSelectAllMatching(true, true, 100, 20)).toBe(false)
  })

  it('not offered if the page already contains everything', () => {
    expect(canSelectAllMatching(true, false, 20, 20)).toBe(false)
  })
})

describe('toggleAllOnPage', () => {
  it('selects every row on the page when not fully selected', () => {
    const next = toggleAllOnPage(items, new Set([1]))
    expect(next).toEqual(new Set([1, 2, 3]))
  })

  it('clears selection when the page is already fully selected', () => {
    const next = toggleAllOnPage(items, new Set([1, 2, 3]))
    expect(next).toEqual(new Set())
  })
})

describe('toggleRowSelection', () => {
  it('adds an id not yet selected', () => {
    expect(toggleRowSelection(new Set([1]), 2)).toEqual(new Set([1, 2]))
  })

  it('removes an id already selected', () => {
    expect(toggleRowSelection(new Set([1, 2]), 1)).toEqual(new Set([2]))
  })

  it('does not mutate the original set', () => {
    const original = new Set([1])
    toggleRowSelection(original, 2)
    expect(original).toEqual(new Set([1]))
  })
})
