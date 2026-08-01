import type { CellProps } from '../types'

export default function TextCell({ field, value, readonly, onChange }: CellProps) {
  if (readonly) {
    // maxWidth: довгий текст (повідомлення, опис) обрізається, повний — у title.
    // Дзеркало Vue: cells/TextCell.vue.
    if (field.maxWidth) {
      return (
        <div className="text-truncate" style={{ maxWidth: field.maxWidth }} title={value ?? ''}>
          {value ?? field.emptyLabel ?? '—'}
        </div>
      )
    }
    return <span>{value ?? field.emptyLabel ?? '—'}</span>
  }

  return (
    <input
      defaultValue={value ?? ''}
      type="text"
      className="form-control form-control-sm"
      onBlur={(e) => {
        if (e.target.value !== (value ?? '')) onChange(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.currentTarget.value = value ?? ''
          e.currentTarget.blur()
        }
      }}
    />
  )
}
