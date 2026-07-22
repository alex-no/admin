// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import FilterText from './filters/FilterText.vue'
import FilterSelect from './filters/FilterSelect.vue'
import FilterCheckbox from './filters/FilterCheckbox.vue'

// Реєстр компонентів фільтра за їх "type" з JSON-конфігу.
// Кастомні типи реєструються сторінкою через registerFilterType()
// або передаються локально в DataListPage через prop customFilterTypes.
const registry = new Map([
  ['text', FilterText],
  ['select', FilterSelect],
  ['checkbox', FilterCheckbox],
])

export function registerFilterType(type, component) {
  registry.set(type, component)
}

export function resolveFilterType(type) {
  return registry.get(type) ?? null
}
