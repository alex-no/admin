// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import TextCell from './cells/TextCell.vue'
import SelectCell from './cells/SelectCell.vue'
import BooleanCell from './cells/BooleanCell.vue'
import NumberCell from './cells/NumberCell.vue'
import PhoneListCell from './cells/PhoneListCell.vue'
import DateTimeCell from './cells/DateTimeCell.vue'
import BadgeCell from './cells/BadgeCell.vue'
import LinkCell from './cells/LinkCell.vue'
import ImageCell from './cells/ImageCell.vue'

// Реєстр компонентів комірки таблиці за їх "type" з JSON-конфігу.
// Один компонент відповідає і за readonly, і за editable режим
// (перемикається через prop `readonly`) — щоб не тримати дві паралельні бібліотеки.
const registry = new Map([
  ['text', TextCell],
  ['select', SelectCell],
  ['boolean', BooleanCell],
  ['number', NumberCell],
  ['phone-list', PhoneListCell],
  ['datetime', DateTimeCell],
  ['badge', BadgeCell],
  ['link', LinkCell],
  ['image', ImageCell],
])

export function registerCellType(type, component) {
  registry.set(type, component)
}

/**
 * Тип не вказаний або невідомий — показуємо як text, а не порожню комірку.
 * Раніше повертався null, і `<component :is="null">` мовчки малював нічого:
 * рядки в таблиці є, чекбокси й кнопки дій є, а значень немає. Помилку в
 * конфігу видно лише очима, тому невідомий тип ще й пишемо в консоль.
 */
export function resolveCellType(type) {
  if (!type) return TextCell

  const found = registry.get(type)
  if (found) return found

  console.warn(`[list-framework] Невідомий тип комірки "${type}" — показано як text`)
  return TextCell
}
