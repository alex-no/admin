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
  /**
   * Поле рядка, яке показувати замість `key`, коли бекенд уже віддає приєднану
   * назву (`country_id` → `country_name`). Сортування лишається по `key`.
   */
  displayKey?: string
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
  /**
   * Фільтр, у якого не буває стану "всі": рядки існують лише в межах обраного
   * значення (напр. типи населених пунктів у межах країни). Порожньої опції
   * немає, перший варіант підставляється сам, а список **не** запитується, доки
   * значення не зʼявилось — інакше перший запит показав би чужі рядки.
   */
  required?: boolean
  /**
   * Порожній варіант «Всі» лишається, але при відкритті сторінки обирається
   * перший зі списку (напр. регіони: показувати одразу всі країни немає сенсу,
   * але повернутись до «Всі країни» користувач може). Перший запит списку
   * відкладається, доки значення не підставилось.
   */
  defaultFirstOption?: boolean
  /**
   * Імʼя query-параметра, якщо воно не збігається з `key`. Кілька фільтрів можуть
   * писати в один параметр — тоді виграє останній непорожній у порядку конфіга
   * (напр. «область» і «район» обидва звужують `area_region_id`, район точніший).
   */
  param?: string
  /**
   * Залежний список: ключі фільтрів-батьків. Поки хоч один порожній — селект
   * вимкнений і довідник не запитується. У `optionsUrl` значення батьків
   * підставляються за шаблоном `{ключ}`.
   */
  dependsOn?: string[]
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
  /**
   * Додаткова умова показу кнопки — коли вона залежить від рядка, а не лише від
   * ролі (напр. запис, який користувач щойно створив, він може редагувати й без
   * права редагування). Додається сторінкою в коді, як і `handler`; у JSON її
   * бути не може.
   */
  visible?: (row: any) => boolean
}

/**
 * Іменована масова дія (activate/deactivate). Значення поля задає бекенд —
 * сюди йде лише ім'я дії, тому конфіг не може змінити довільну колонку.
 */
export interface BulkActionConfig {
  /** Що піде в тілі запиту як `action` */
  action: string
  label: string
  icon?: string
  /** Клас кнопки Bootstrap без префікса btn- (напр. 'outline-success') */
  variant?: string
  permission?: string
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
  /** Створення записів. Без apiCreate кнопки "Додати" немає взагалі. */
  apiCreate?: string
  createPermission?: string
  /**
   * Ключі колонок, які показувати у формі створення (порядок = порядок полів).
   * Поле, якого тут немає, бере значення за замовчуванням зі схеми БД.
   */
  createFields?: string[]
  /**
   * Іменовані масові дії: bulk-роут приймає { ids, action }. Без apiBulk кнопок
   * немає — видалення пачкою працює окремо, через apiDelete з undo.
   */
  apiBulk?: string
  bulkActions?: BulkActionConfig[]
  filterConfig?: FilterConfig[]
  columnsConfig: ColumnConfig[]
  actions?: ActionConfig[]
  /** Власні кнопки сторінки в шапці списку (дзеркало `<slot name="actions">` у Vue) */
  headerActions?: React.ReactNode
  rowKey?: string
  defaultPerPage?: number
  /** Рядок успішно змінено інлайн — щоб сторінка могла оновити відкриту картку */
  onRowUpdated?: (row: any) => void
}
