import menuConfig from '@/config/menu.json'
import { findMenuLocation as coreFindMenuLocation, type MenuItem, type MenuSection } from '@core/menu'

export type { MenuItem, MenuSection }

/**
 * Пункт меню за поточним шляхом. Алгоритм — в ядрі (@core/menu), спільний з
 * Vue; дані (menu.json) наразі окремі для кожного фронтенда — вже розійшлися
 * на одне поле (note у демо-пункті), об'єднати в спільний файл не зроблено
 * автоматично цим рефакторингом.
 */
export function findMenuLocation(path: string): { section: MenuSection; item: MenuItem } | null {
  return coreFindMenuLocation(menuConfig as MenuSection[], path)
}
