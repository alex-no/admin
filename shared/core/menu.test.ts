import { describe, expect, it } from 'vitest'
import { findMenuLocation, type MenuSection } from './menu'

const menu: MenuSection[] = [
  {
    id: 'analytics',
    label: 'menu.analytics',
    items: [
      { label: 'menu.visits', to: '/analytics' },
      { label: 'menu.stats', to: '/analytics/stats' },
    ],
  },
  {
    id: 'sto',
    label: 'menu.sto',
    items: [
      { label: 'menu.stoList', to: '/sto' },
      { label: 'menu.stoManagers', to: '/sto-managers' },
    ],
  },
]

describe('findMenuLocation', () => {
  it('finds an exact match', () => {
    const found = findMenuLocation(menu, '/sto')
    expect(found?.item.to).toBe('/sto')
  })

  it('prefers the longest matching prefix (child over parent)', () => {
    const found = findMenuLocation(menu, '/analytics/stats')
    expect(found?.item.to).toBe('/analytics/stats')
  })

  it('matches a child path of the parent item', () => {
    const found = findMenuLocation(menu, '/analytics/stats/detail/5')
    expect(found?.item.to).toBe('/analytics/stats')
  })

  it('does not match an unrelated path that merely shares a prefix', () => {
    const found = findMenuLocation(menu, '/sto-managers')
    expect(found?.item.to).toBe('/sto-managers')
    // and NOT '/sto', which would be wrong per the "shares a prefix" trap
  })

  it('returns null when nothing matches', () => {
    expect(findMenuLocation(menu, '/unknown-page')).toBeNull()
  })
})
