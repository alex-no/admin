// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import menu from '@/config/menu.json'
import { findMenuLocation as coreFindMenuLocation } from '@core/menu'

/**
 * Пункт меню за поточним шляхом. Алгоритм — в ядрі (@core/menu), спільний з
 * React; дані (menu.json) наразі окремі для кожного фронтенда — вже розійшлися
 * на одне поле (note у демо-пункті), об'єднати в спільний файл не зроблено
 * автоматично цим рефакторингом.
 */
export function findMenuLocation(path) {
  return coreFindMenuLocation(menu, path)
}
