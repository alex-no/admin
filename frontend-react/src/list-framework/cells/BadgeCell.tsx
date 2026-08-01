import type { CellProps } from '../types'

/**
 * Значення як кольоровий бейдж. `options` дають підпис (як у select),
 * `variants` — колір Bootstrap на значення; без збігу — `secondary`.
 * Редагування немає: це подання, а не ввід (для вибору зі списку є `select`).
 * Дзеркало Vue: cells/BadgeCell.vue.
 */
export default function BadgeCell({ field, value }: CellProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted">{field.emptyLabel ?? '—'}</span>
  }

  const found = (field.options ?? []).find(o => String(o.value) === String(value))
  const variant = field.variants?.[String(value)] ?? field.variant ?? 'secondary'

  return <span className={`badge bg-${variant}`}>{found ? found.label : String(value)}</span>
}
