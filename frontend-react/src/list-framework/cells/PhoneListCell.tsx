import PhoneListInput from '@/components/PhoneListInput'
import type { CellProps } from '../types'

export default function PhoneListCell({ value, readonly, onChange }: CellProps) {
  return (
    <PhoneListInput
      value={value ?? []}
      readonly={readonly}
      onChange={onChange}
    />
  )
}
