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
}: SelectFilterProps) {
  const remote = useRemoteOptions(optionsUrl, {
    valueKey: optionsValueKey,
    labelKey: optionsLabelKey,
  })

  const list = optionsUrl ? remote.options : (options ?? [])
  // Порожня опція завжди від рендерера — у конфіга її в options бути не має,
  // інакше Vue-версія покаже її двічі.
  const empty = placeholderOption ?? { value: '', label: label ?? 'Всі' }

  return (
    <select
      className="form-select form-select-sm"
      style={{ width: 'auto' }}
      value={value}
      disabled={optionsUrl ? remote.loading : false}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value={String(empty.value)}>{empty.label}</option>
      {list.map(opt => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
