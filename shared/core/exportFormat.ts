import { formatPhoneUA } from './phone'
import type { Option } from './types'

export interface ExportColumnLike {
  key: string
  type?: string
  trueLabel?: string
  falseLabel?: string
  options?: Option[]
  optionsUrl?: string
}

/**
 * Значення колонки для CSV: коди замінюються на те, що користувач бачить
 * у таблиці (підпис select-варіанту, "Так"/"Ні", відформатований телефон).
 * `resolveOptions` — джерело варіантів select-колонки (статичні `col.options`
 * або довідник з `optionsUrl`); спосіб його отримати різний у Vue й React
 * (різне кешування), тому це параметр, а не частина ядра.
 */
export function formatValueForExport(
  col: ExportColumnLike,
  row: any,
  resolveOptions: (col: ExportColumnLike) => Option[]
): any {
  const value = row[col.key]

  if (col.type === 'boolean') {
    return value ? (col.trueLabel ?? 'Так') : (col.falseLabel ?? 'Ні')
  }
  if (col.type === 'phone-list') {
    return (value ?? []).map(formatPhoneUA).join(', ')
  }
  if (col.type === 'select') {
    const options = resolveOptions(col)
    const found = options.find((o) => String(o.value) === String(value))
    return found ? found.label : (value ?? '')
  }
  return value ?? ''
}
