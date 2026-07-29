import type { CellProps } from '../types'

export default function BooleanCell({ field, value, readonly, onChange }: CellProps) {
  const label = value ? (field.trueLabel ?? 'Так') : (field.falseLabel ?? 'Ні')
  const color = value ? 'bg-success' : 'bg-danger'

  if (readonly) {
    return <span className={`badge ${color}`}>{label}</span>
  }

  return (
    <button
      type="button"
      className={`badge border-0 btn p-1 ${color}`}
      onClick={() => onChange(!value)}
    >
      {label}
    </button>
  )
}
