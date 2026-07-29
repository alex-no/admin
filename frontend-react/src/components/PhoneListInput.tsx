import { useState, useEffect, useRef } from 'react'
import { formatPhoneUA } from '@/utils/phone'

interface PhoneListInputProps {
  value: string[]
  onChange: (phones: string[]) => void
  readonly?: boolean
}

export default function PhoneListInput({ value, onChange, readonly = false }: PhoneListInputProps) {
  const [texts, setTexts] = useState<string[]>([])
  const selfUpdateRef = useRef(false)

  // Initialize texts from value (formatted)
  useEffect(() => {
    if (selfUpdateRef.current) {
      selfUpdateRef.current = false
      return
    }
    setTexts((value || []).map(v => v ? formatPhoneUA(v) : ''))
  }, [value])

  const emitUpdate = (newTexts: string[]) => {
    selfUpdateRef.current = true
    onChange([...newTexts])
  }

  const handleInput = (index: number, newValue: string) => {
    const newTexts = [...texts]
    newTexts[index] = newValue
    setTexts(newTexts)
    emitUpdate(newTexts)
  }

  const addPhone = () => {
    const newTexts = [...texts, '']
    setTexts(newTexts)
    emitUpdate(newTexts)
  }

  const removePhone = (index: number) => {
    const newTexts = texts.filter((_, i) => i !== index)
    setTexts(newTexts)
    emitUpdate(newTexts)
  }

  // Readonly mode: показуємо перший номер + badge якщо більше
  if (readonly) {
    const phones = value || []
    if (phones.length === 0) {
      return <span className="text-muted">—</span>
    }

    return (
      <div>
        {formatPhoneUA(phones[0])}
        {phones.length > 1 && (
          <span
            className="badge bg-secondary ms-1"
            title={phones.slice(1).map(formatPhoneUA).join(', ')}
          >
            +{phones.length - 1}
          </span>
        )}
      </div>
    )
  }

  // Editable mode
  return (
    <div>
      {texts.map((text, i) => (
        <div key={i} className="d-flex align-items-center gap-1 mb-2">
          <input
            value={text}
            type="text"
            className="form-control form-control-sm"
            placeholder="+38 (0__) ___-__-__"
            onChange={(e) => handleInput(i, e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            title="Видалити номер"
            onClick={() => removePhone(i)}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addPhone}>
        <i className="bi bi-plus-lg me-1" />
        Додати номер
      </button>
    </div>
  )
}
