import { useRemoteOptions } from '../hooks/useRemoteOptions'
import type { CellProps } from '../types'

export default function SelectCell({ field, value, readonly, onChange }: CellProps) {
  const remote = useRemoteOptions(field.optionsUrl, {
    valueKey: field.optionsValueKey,
    labelKey: field.optionsLabelKey,
  })

  const options = field.optionsUrl ? remote.options : (field.options ?? [])
  const loading = field.optionsUrl ? remote.loading : false

  if (readonly) {
    const found = options.find((o) => String(o.value) === String(value))
    return <span>{found ? found.label : (value ?? field.emptyLabel ?? '—')}</span>
  }

  return (
    <select
      value={value ?? ''}
      className="form-select form-select-sm"
      style={{ width: 'auto' }}
      disabled={loading}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
