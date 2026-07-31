import { useEffect, useRef } from 'react'
import { useRemoteOptions } from '../hooks/useRemoteOptions'
import type { Option } from '../types'

interface SelectFilterProps {
  value: string
  onChange: (value: string) => void
  options?: Option[]
  /** Варіанти з API (кешуються між фільтрами/комірками) */
  optionsUrl?: string
  optionsValueKey?: string
  optionsLabelKey?: string
  /** Порожня опція "Всі …". Дзеркало Vue-контракту, див. shared/page-configs/README.md */
  placeholderOption?: Option
  /** Підпис фільтра — fallback для порожньої опції */
  label?: string
  /**
   * Фільтр, у якого не буває стану "всі": довідник існує лише в межах обраного
   * значення. Порожньої опції немає, перший варіант підставляється сам.
   * Дзеркало Vue: FilterSelect.vue → isRequired.
   */
  required?: boolean
  /**
   * Порожній варіант лишається, але при відкритті сторінки обирається перший зі
   * списку. Дзеркало Vue: FilterSelect.vue → autoFirst.
   */
  defaultFirstOption?: boolean
  /** Ключі фільтрів-батьків; поки хоч один порожній — селект вимкнений */
  dependsOn?: string[]
  /** Значення решти фільтрів — для підстановки в optionsUrl за шаблоном {ключ} */
  filterValues?: Record<string, any>
}

export default function SelectFilter({
  value,
  onChange,
  options,
  optionsUrl,
  optionsValueKey,
  optionsLabelKey,
  placeholderOption,
  label,
  required,
  defaultFirstOption,
  dependsOn,
  filterValues = {},
}: SelectFilterProps) {
  // Залежний фільтр: поки батько порожній — довідник не запитуємо і селект
  // вимкнений; варіантів «для всіх країн» тут не буває.
  // Дзеркало Vue: FilterSelect.vue → parentsFilled / resolvedUrl.
  const parentsFilled = (dependsOn ?? []).every(k => {
    const v = filterValues[k]
    return v !== '' && v !== null && v !== undefined
  })
  const resolvedUrl = optionsUrl && parentsFilled
    ? optionsUrl.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(filterValues[key] ?? ''))
    : undefined

  const remote = useRemoteOptions(resolvedUrl, {
    valueKey: optionsValueKey,
    labelKey: optionsLabelKey,
  })

  const list = optionsUrl ? remote.options : (options ?? [])
  // Порожня опція завжди від рендерера — у конфіга її в options бути не має,
  // інакше Vue-версія покаже її двічі.
  const empty = placeholderOption ?? { value: '', label: label ?? 'Всі' }

  // Підстановка першого варіанта. Для `required` — щоразу, коли значення порожнє
  // (порожнього стану в такого фільтра не буває). Для `defaultFirstOption` — лише
  // один раз при відкритті: далі порожнє значення означає свідоме «Всі».
  // `list` — саме справжні варіанти, без опції «Всі»: вона додається нижче в JSX.
  const applied = useRef(false)
  useEffect(() => {
    if (!required && !defaultFirstOption) return
    if (value !== '' && value !== null && value !== undefined) {
      applied.current = true
      return
    }
    if (!required && applied.current) return
    if (!list.length) return
    applied.current = true
    onChange(String(list[0].value))
  }, [required, defaultFirstOption, value, list])

  return (
    <select
      className="form-select form-select-sm"
      style={{ width: 'auto' }}
      value={value}
      disabled={(optionsUrl ? remote.loading : false) || !parentsFilled}
      onChange={(e) => onChange(e.target.value)}
    >
      {!required && <option value={String(empty.value)}>{empty.label}</option>}
      {list.map(opt => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
