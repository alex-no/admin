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
  placeholder?: string
}

export default function SelectFilter({
  value,
  onChange,
  options,
  optionsUrl,
  optionsValueKey,
  optionsLabelKey,
  placeholder = 'Всі',
}: SelectFilterProps) {
  const remote = useRemoteOptions(optionsUrl, {
    valueKey: optionsValueKey,
    labelKey: optionsLabelKey,
  })

  const list = optionsUrl ? remote.options : (options ?? [])

  return (
    <select
      className="form-select form-select-sm"
      style={{ width: 'auto' }}
      value={value}
      disabled={optionsUrl ? remote.loading : false}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {list.map(opt => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
