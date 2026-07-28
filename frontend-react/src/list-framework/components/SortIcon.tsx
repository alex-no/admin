import type { SortItem } from '../types'

interface SortIconProps {
  column: string
  sortItems: SortItem[]
}

export default function SortIcon({ column, sortItems }: SortIconProps) {
  const sortItem = sortItems.find(s => s.key === column)

  if (!sortItem) {
    return <i className="bi bi-arrow-down-up text-muted opacity-25 ms-1"></i>
  }

  if (sortItem.dir === 'asc') {
    return <i className="bi bi-arrow-up text-primary ms-1"></i>
  }

  return <i className="bi bi-arrow-down text-primary ms-1"></i>
}
