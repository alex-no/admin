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

/**
 * Тип не вказаний або невідомий — показуємо як text, а не порожню комірку.
 * Раніше повертався null, і комірка мовчки не малювала нічого: рядки в таблиці
 * є, чекбокси й кнопки дій є, а значень немає. Помилку в конфігу видно лише
 * очима, тому невідомий тип ще й пишемо в консоль.
 * Дзеркало Vue: cellTypes.js → resolveCellType.
 */
export function resolveCellType(type?: string): ComponentType<CellProps> {
  if (!type) return TextCell

  const found = registry.get(type)
  if (found) return found

  console.warn(`[list-framework] Невідомий тип комірки "${type}" — показано як text`)
  return TextCell
}
