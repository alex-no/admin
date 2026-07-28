interface SelectFilterProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export default function SelectFilter({ value, onChange, options, placeholder = 'Всі' }: SelectFilterProps) {
  return (
    <select
      className="form-select form-select-sm"
      style={{ width: 'auto' }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
