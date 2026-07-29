import type { ComponentType } from 'react'
import TextCell from './cells/TextCell'
import SelectCell from './cells/SelectCell'
import BooleanCell from './cells/BooleanCell'
import NumberCell from './cells/NumberCell'
import PhoneListCell from './cells/PhoneListCell'
import type { CellProps } from './types'

// Реєстр компонентів комірки таблиці за їх "type" з конфігу колонок.
// Один компонент відповідає і за readonly, і за editable режим
// (перемикається через prop `readonly`) — щоб не тримати дві паралельні бібліотеки.
const registry = new Map<string, ComponentType<CellProps>>([
  ['text', TextCell],
  ['select', SelectCell],
  ['boolean', BooleanCell],
  ['number', NumberCell],
  ['phone-list', PhoneListCell],
])

export function registerCellType(type: string, component: ComponentType<CellProps>) {
  registry.set(type, component)
}

export function resolveCellType(type?: string): ComponentType<CellProps> | null {
  if (!type) return null
  return registry.get(type) ?? null
}
