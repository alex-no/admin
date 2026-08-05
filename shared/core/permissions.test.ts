import { describe, expect, it } from 'vitest'
import { hasPermission } from './permissions'

describe('hasPermission', () => {
  it('matches an exact permission', () => {
    expect(hasPermission(['sto.view'], 'sto.view')).toBe(true)
  })

  it('rejects a permission not in the list', () => {
    expect(hasPermission(['sto.view'], 'sto.edit')).toBe(false)
  })

  it('"*" grants everything', () => {
    expect(hasPermission(['*'], 'anything.at.all')).toBe(true)
  })

  it('"module.*" grants everything under that module', () => {
    expect(hasPermission(['geography.*'], 'geography.cities.edit')).toBe(true)
    // Matches by prefix + '.', so "geography.cities" itself also qualifies
    // (it starts with "geography."), same as the original duplicated algorithm.
    expect(hasPermission(['geography.*'], 'geography.cities')).toBe(true)
  })

  it('"module.*" does not leak into a differently-named module', () => {
    expect(hasPermission(['geography.*'], 'geographyother.view')).toBe(false)
  })

  it('handles missing/empty permission list', () => {
    expect(hasPermission(undefined, 'sto.view')).toBe(false)
    expect(hasPermission(null, 'sto.view')).toBe(false)
    expect(hasPermission([], 'sto.view')).toBe(false)
  })
})
