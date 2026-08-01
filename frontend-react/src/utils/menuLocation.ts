import menuConfig from '@/config/menu.json'

export interface MenuItem {
  label: string
  to: string
  icon?: string
  permission?: string
}

export interface MenuSection {
  id: string
  label: string
  icon?: string
  permission?: string
  items: MenuItem[]
}

/**
 * Пункт меню за поточним шляхом — по **найдовшому** співпадінню префікса.
 * Дзеркало Vue: utils/menuLocation.js.
 *
 * У menu.json є вкладені шляхи (`/analytics` і `/analytics/stats`), тож
 * перший-ліпший збіг дав би батьківський пункт замість дочірнього. Умова саме
 * `path === to || path.startsWith(to + '/')`, а не голий `startsWith(to)`:
 * інакше `/sto-managers` збігся б із `/sto` — це різні розділи меню.
 */
export function findMenuLocation(
  path: string
): { section: MenuSection; item: MenuItem } | null {
  const menu = menuConfig as MenuSection[]
  let best: { section: MenuSection; item: MenuItem } | null = null

  for (const section of menu) {
    for (const item of section.items) {
      if (path === item.to || path.startsWith(item.to + '/')) {
        if (!best || item.to.length > best.item.to.length) {
          best = { section, item }
        }
      }
    }
  }

  return best
}
