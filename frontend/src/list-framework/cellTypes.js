// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import TextCell from './cells/TextCell.vue'
import SelectCell from './cells/SelectCell.vue'
import BooleanCell from './cells/BooleanCell.vue'
import NumberCell from './cells/NumberCell.vue'

// Реєстр компонентів комірки таблиці за їх "type" з JSON-конфігу.
// Один компонент відповідає і за readonly, і за editable режим
// (перемикається через prop `readonly`) — щоб не тримати дві паралельні бібліотеки.
const registry = new Map([
  ['text', TextCell],
  ['select', SelectCell],
  ['boolean', BooleanCell],
  ['number', NumberCell],
])

export function registerCellType(type, component) {
  registry.set(type, component)
}

export function resolveCellType(type) {
  return registry.get(type) ?? null
}
