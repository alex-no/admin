import type { CellProps } from '../types'

export default function NumberCell({ field, value, readonly, onChange }: CellProps) {
  const icon = field.icon ? <i className={`bi ${field.icon}`} style={{ fontSize: '.7rem' }} /> : null

  if (readonly) {
    return (
      <span className="d-inline-flex align-items-center gap-1">
        {value != null && icon}
        {value ?? '—'}
      </span>
    )
  }

  return (
    <span className="d-inline-flex align-items-center gap-1">
      {icon}
      <input
        defaultValue={value ?? ''}
        type="number"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        className="form-control form-control-sm"
        style={{ width: '90px' }}
        onBlur={(e) => {
          const next = e.target.value === '' ? null : Number(e.target.value)
          if (next !== value) onChange(next)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.currentTarget.value = value ?? ''
            e.currentTarget.blur()
          }
        }}
      />
    </span>
  )
}
