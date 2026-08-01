import { formatDate, formatDateShort } from '@/utils/date'
import type { CellProps } from '../types'

/**
 * Дати ніде не редагуються інлайн — комірка завжди readonly (проп приймається
 * заради єдиного інтерфейсу з рештою типів). `dateOnly: true` — без часу.
 * Дзеркало Vue: cells/DateTimeCell.vue.
 */
export default function DateTimeCell({ field, value }: CellProps) {
  return (
    <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>
      {field.dateOnly ? formatDateShort(value) : formatDate(value)}
    </span>
  )
}
