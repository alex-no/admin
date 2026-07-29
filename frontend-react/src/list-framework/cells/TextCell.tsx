import type { CellProps } from '../types'

export default function TextCell({ value, readonly, onChange }: CellProps) {
  if (readonly) {
    return <span>{value ?? '—'}</span>
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
