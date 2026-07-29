/**
 * Форматування дати в українському форматі: "дд.мм.рррр гг:хх"
 * (або з секундами, якщо withSeconds).
 */
export function formatDate(date?: string | Date | null, withSeconds = false): string {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  if (withSeconds) {
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
  }

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

/** Тільки дата: "дд.мм.рррр" */
export function formatDateShort(date?: string | Date | null): string {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')

  return `${day}.${month}.${d.getFullYear()}`
}
