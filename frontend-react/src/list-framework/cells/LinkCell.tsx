import type { CellProps } from '../types'

// Дані приходять з БД (імпорти, ручний ввід), тому схему перевіряємо: клікабельним
// робимо лише http/https/mailto/tel. Інакше рядок `javascript:...` у полі сайту
// став би робочим посиланням — це XSS через звичайний клік по таблиці.
const SAFE_SCHEME = /^(https?|mailto|tel):/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

function toHref(text: string): string | null {
  if (HAS_SCHEME.test(text)) return SAFE_SCHEME.test(text) ? text : null
  // "example.com" без схеми інакше поїхало б відносно поточного шляху адмінки
  return `https://${text}`
}

// Дзеркало Vue: cells/LinkCell.vue.
export default function LinkCell({ field, value, readonly, onChange }: CellProps) {
  if (readonly) {
    const text = String(value ?? '').trim()
    if (!text) return <span className="text-muted">{field.emptyLabel ?? '—'}</span>

    const maxWidth = field.maxWidth ?? '180px'
    const href = toHref(text)

    if (!href) {
      // Значення є, але схема не з дозволених — показуємо текстом, не посиланням
      return (
        <span className="text-truncate d-inline-block align-bottom" style={{ maxWidth }} title={text}>
          {text}
        </span>
      )
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-truncate d-inline-block align-bottom"
        style={{ maxWidth }}
        title={text}
      >
        {text}
      </a>
    )
  }

  return (
    <input
      defaultValue={value ?? ''}
      type="text"
      className="form-control form-control-sm"
      placeholder="https://..."
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
