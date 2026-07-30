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
  /**
   * Права на редагування саме цієї колонки — доповнення до `editable`.
   * Відсутнє поле = достатньо `editable`. Порожній масив = не редагує ніхто.
   * Сервер перевіряє те саме окремо; тут лише UI.
   */
  editPermissions?: string[]
  /** false = колонку не можна приховати через ColumnSelector (id, назва, дії) */
  hideable?: boolean
  /** Прихована при першому відкритті — лише якщо адмін ще нічого не налаштовував */
  defaultHidden?: boolean
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
  /** 'text' — канонічна назва зі спільного конфіга; 'search' — псевдонім для сумісності */
  type: 'text' | 'search' | 'select' | 'date-range' | 'checkbox'
  placeholder?: string
  label?: string
  /** Статичні варіанти — **без** порожнього елемента, його додає рендерер */
  options?: Option[]
  /** select: варіанти з API. Повний шлях, разом із /api */
  optionsUrl?: string
  optionsValueKey?: string
  optionsLabelKey?: string
  /** Порожня опція "Всі …"; якщо не задана — { value: '', label: label ?? 'Всі' } */
  placeholderOption?: Option
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
  /** Вкладка картки деталей, яку відкриває дія (кілька дій можуть мати type: 'detail') */
  tab?: string
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
