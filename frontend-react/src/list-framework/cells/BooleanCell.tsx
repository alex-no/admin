import { useTranslation } from 'react-i18next'
import type { CellProps } from '../types'

export default function BooleanCell({ field, value, readonly, onChange }: CellProps) {
  const { t } = useTranslation()

  const translateLabel = (label?: string): string => {
    if (!label) return ''
    if (label.includes('.')) {
      const translated = t(label)
      return translated !== label ? translated : label
    }
    return label
  }

  const label = value
    ? translateLabel(field.trueLabel) || t('common.yes')
    : translateLabel(field.falseLabel) || t('common.no')
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
