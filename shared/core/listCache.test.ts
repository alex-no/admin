import { describe, expect, it } from 'vitest'
import { createListCache } from './listCache'

describe('createListCache', () => {
  it('returns null for a missing key', () => {
    const cache = createListCache()
    expect(cache.get('missing')).toBeNull()
  })

  it('stores and retrieves a value by key', () => {
    const cache = createListCache()
    cache.set('a', { total: 5 })
    expect(cache.get('a')).toEqual({ total: 5 })
  })

  it('evicts the oldest entry once maxEntries is exceeded', () => {
    const cache = createListCache(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeNull()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('re-setting a key refreshes its insertion order (not evicted next)', () => {
    const cache = createListCache(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 10) // touch 'a' again — 'b' is now the oldest
    cache.set('c', 3)
    expect(cache.get('b')).toBeNull()
    expect(cache.get('a')).toBe(10)
    expect(cache.get('c')).toBe(3)
  })

  it('independent instances do not share state', () => {
    const cacheA = createListCache()
    const cacheB = createListCache()
    cacheA.set('x', 1)
    expect(cacheB.get('x')).toBeNull()
  })
})
