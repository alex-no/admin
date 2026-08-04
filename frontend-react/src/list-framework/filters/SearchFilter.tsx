import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchFilter({ value, onChange, placeholder }: SearchFilterProps) {
  const { t } = useTranslation()
  const [localValue, setLocalValue] = useState(value)

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce - викликати onChange тільки якщо значення змінилось
  useEffect(() => {
    if (localValue === value) return // Skip if value hasn't changed

    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [localValue]) // Remove onChange from deps!

  return (
    <input
      type="text"
      className="form-control form-control-sm"
      style={{ width: '200px' }}
      placeholder={placeholder ?? t('common.search')}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  )
}
