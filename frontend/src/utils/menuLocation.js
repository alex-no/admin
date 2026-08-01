// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import menu from '@/config/menu.json'

/**
 * Пункт меню за поточним шляхом — по **найдовшому** співпадінню префікса.
 *
 * У menu.json є вкладені шляхи (`/analytics` і `/analytics/stats`,
 * `/error-logs` і `/error-logs/stats`), тож перший-ліпший збіг дав би
 * батьківський пункт замість дочірнього.
 *
 * Умова саме `path === to || path.startsWith(to + '/')`, а не голий
 * `startsWith(to)`: інакше `/sto-managers` збігся б із `/sto` (це різні розділи
 * меню) і підсвітився б чужий розділ.
 *
 * @returns {{ section: object, item: object } | null}
 */
export function findMenuLocation(path) {
  let best = null

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
