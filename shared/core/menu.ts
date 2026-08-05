export interface MenuItem {
  label: string
  to: string
  icon?: string
  permission?: string
  roles?: string[]
  note?: string
}

export interface MenuSection {
  id: string
  label: string
  icon?: string
  permission?: string
  roles?: string[]
  items: MenuItem[]
}

/**
 * Пункт меню за поточним шляхом — по **найдовшому** співпадінню префікса.
 *
 * У меню є вкладені шляхи (`/analytics` і `/analytics/stats`, `/error-logs` і
 * `/error-logs/stats`), тож перший-ліпший збіг дав би батьківський пункт
 * замість дочірнього.
 *
 * Умова саме `path === to || path.startsWith(to + '/')`, а не голий
 * `startsWith(to)`: інакше `/sto-managers` збігся б із `/sto` (це різні
 * розділи меню) і підсвітився б чужий розділ.
 *
 * `menu` передається параметром, а не імпортується тут — Vue і React наразі
 * тримають окремі копії `config/menu.json`, які вже розійшлися (різний
 * `note` в демо-пункті); об'єднати їх в один спільний файл — окреме рішення,
 * не зроблене автоматично цим рефакторингом.
 */
export function findMenuLocation(
  menu: MenuSection[],
  path: string
): { section: MenuSection; item: MenuItem } | null {
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
