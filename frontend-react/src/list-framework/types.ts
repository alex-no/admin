export interface PaginatedResponse<T> {
  status: 'success'
  data: T[]
  pagination: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

export interface Option {
  value: any
  label: string
}

export interface ColumnConfig {
  key: string
  label: string
  sortable?: boolean
  editable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  /** Тип комірки з реєстру cellTypes: text | select | boolean | number | phone-list */
  type?: string
  /** select: статичні варіанти */
  options?: Option[]
  /** select: варіанти з API (кешуються між комірками) */
  optionsUrl?: string
  optionsValueKey?: string
  optionsLabelKey?: string
  /** number: обмеження вводу */
  min?: number
  max?: number
  step?: number
  /** number: іконка перед значенням (напр. 'bi-star-fill text-warning') */
  icon?: string
  /** boolean: підписи станів */
  trueLabel?: string
  falseLabel?: string
  /** Довільний рендер (має пріоритет нижче за `type`) */
  format?: (value: any, row: any) => string | React.ReactNode
}

export interface CellProps {
  field: ColumnConfig
  value: any
  readonly: boolean
  row: any
  onChange: (value: any) => void
}

export interface FilterConfig {
  key: string
  type: 'search' | 'select' | 'date-range' | 'checkbox'
  placeholder?: string
  label?: string
  options?: Option[]
  /** select: варіанти з API */
  optionsUrl?: string
  optionsValueKey?: string
  optionsLabelKey?: string
  default?: any
}

export interface SortItem {
  key: string
  dir: 'asc' | 'desc'
}

export interface ActionConfig {
  type: string
  label: string
  icon: string
  permission?: string
  /** Не обов'язковий для type: 'delete' — таблиця видаляє сама через apiDelete */
  handler?: (row: any) => void | Promise<void>
}

export interface TableState {
  // Data
  items: any[]
  total: number
  loading: boolean
  error: string

  // Pagination
  page: number
  perPage: number
  totalPages: number

  // Sort
  sortItems: SortItem[]

  // Filters
  filters: Record<string, any>

  // Selection
  selected: (string | number)[]
}

/** Імперативний API таблиці (аналог defineExpose({ reload }) у Vue) */
export interface DataTableHandle {
  reload: () => void
}

export interface DataTableProps {
  title?: string
  apiList: string
  apiUpdate?: string
  apiDelete?: string
  filterConfig?: FilterConfig[]
  columnsConfig: ColumnConfig[]
  actions?: ActionConfig[]
  rowKey?: string
  defaultPerPage?: number
  /** Рядок успішно змінено інлайн — щоб сторінка могла оновити відкриту картку */
  onRowUpdated?: (row: any) => void
}
