import { describe, expect, it } from 'vitest'
import { toggleSort } from './sort'
import type { SortItem } from './types'

describe('toggleSort — plain click (additive = false)', () => {
  it('starts ascending sort from an empty state', () => {
    expect(toggleSort([], 'name', false)).toEqual([{ key: 'name', dir: 'asc' }])
  })

  it('cycles asc -> desc on the single active column', () => {
    const state: SortItem[] = [{ key: 'name', dir: 'asc' }]
    expect(toggleSort(state, 'name', false)).toEqual([{ key: 'name', dir: 'desc' }])
  })

  it('cycles desc -> none on the single active column', () => {
    const state: SortItem[] = [{ key: 'name', dir: 'desc' }]
    expect(toggleSort(state, 'name', false)).toEqual([])
  })

  it('clicking a different column always resets to single-column asc', () => {
    const state: SortItem[] = [{ key: 'name', dir: 'desc' }]
    expect(toggleSort(state, 'type', false)).toEqual([{ key: 'type', dir: 'asc' }])
  })

  it('clicking any column while multi-sort is active resets to single-column asc on that column (does not clear entirely)', () => {
    const state: SortItem[] = [
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'desc' },
    ]
    expect(toggleSort(state, 'name', false)).toEqual([{ key: 'name', dir: 'asc' }])
  })
})

describe('toggleSort — ctrl/cmd click (additive = true)', () => {
  it('adds a new column to existing sort as ascending', () => {
    const state: SortItem[] = [{ key: 'type', dir: 'asc' }]
    expect(toggleSort(state, 'name', true)).toEqual([
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'asc' },
    ])
  })

  it('flips an existing ascending column to descending in place', () => {
    const state: SortItem[] = [
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'asc' },
    ]
    expect(toggleSort(state, 'name', true)).toEqual([
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'desc' },
    ])
  })

  it('removes an existing descending column entirely', () => {
    const state: SortItem[] = [
      { key: 'type', dir: 'asc' },
      { key: 'name', dir: 'desc' },
    ]
    expect(toggleSort(state, 'name', true)).toEqual([{ key: 'type', dir: 'asc' }])
  })

  it('additive click on empty state just starts ascending sort', () => {
    expect(toggleSort([], 'name', true)).toEqual([{ key: 'name', dir: 'asc' }])
  })
})
