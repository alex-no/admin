import type { SortItem } from '../types'

interface SortIconProps {
  column: string
  sortItems: SortItem[]
}

export default function SortIcon({ column, sortItems }: SortIconProps) {
  const index = sortItems.findIndex(s => s.key === column)

  if (index === -1) {
    return <i className="bi bi-arrow-down-up text-muted opacity-25 ms-1"></i>
  }

  const dir = sortItems[index].dir
  // Порядок клацань показуємо цифрою лише при мультисортуванні — дзеркало Vue: SortIcon.vue.
  const showOrder = sortItems.length > 1

  return (
    <span className="d-inline-flex align-items-center ms-1">
      <i className={`bi ${dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'} text-primary`}></i>
      {showOrder && <sup className="ms-1">{index + 1}</sup>}
    </span>
  )
}
