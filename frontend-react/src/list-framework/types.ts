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

export interface ColumnConfig {
  key: string
  label: string
  sortable?: boolean
  editable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  type?: 'text' | 'select' | 'date' | 'boolean' | 'custom'
  options?: Array<{ value: any; label: string }>
  format?: (value: any, row: any) => string | React.ReactNode
}

export interface FilterConfig {
  key: string
  type: 'search' | 'select' | 'date-range' | 'checkbox'
  placeholder?: string
  label?: string
  options?: Array<{ value: any; label: string }>
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
  handler: (row: any) => void | Promise<void>
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
}
