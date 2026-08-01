// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import FilterText from './filters/FilterText.vue'
import FilterSelect from './filters/FilterSelect.vue'
import FilterCheckbox from './filters/FilterCheckbox.vue'
import FilterDate from './filters/FilterDate.vue'

// Реєстр компонентів фільтра за їх "type" з JSON-конфігу.
// Кастомні типи реєструються сторінкою через registerFilterType()
// або передаються локально в DataListPage через prop customFilterTypes.
const registry = new Map([
  ['text', FilterText],
  ['select', FilterSelect],
  ['checkbox', FilterCheckbox],
  ['date', FilterDate],
])

export function registerFilterType(type, component) {
  registry.set(type, component)
}

/**
 * Тут fallback на text був би шкідливий: одруківка в `select` тихо перетворила б
 * список на текстове поле, і фільтр слав би не те значення. Тому лишається null
 * (фільтр не показується), але помилка пишеться в консоль, а не зникає мовчки.
 */
export function resolveFilterType(type) {
  const found = registry.get(type)
  if (found) return found

  console.warn(`[list-framework] Невідомий тип фільтра "${type}" — фільтр не показано`)
  return null
}
