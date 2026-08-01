interface DateFilterProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

/**
 * Одна межа діапазону. Дві межі — це два фільтри з різними key
 * (напр. date_from / date_to), бо в запит вони йдуть окремими параметрами.
 * Дзеркало Vue: filters/FilterDate.vue.
 */
export default function DateFilter({ value, onChange, label }: DateFilterProps) {
  return (
    <input
      type="date"
      className="form-control form-control-sm"
      style={{ width: 'auto' }}
      title={label ?? ''}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
