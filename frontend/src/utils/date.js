/**
 * Форматування дати в українському форматі
 * @param {string|Date} date - Дата для форматування
 * @param {boolean} withSeconds - Показувати секунди (за замовчуванням false)
 * @returns {string} - Відформатована дата в форматі "дд.мм.рррр гг:хх" або "дд.мм.рррр гг:хх:сс"
 */
export function formatDate(date, withSeconds = false) {
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

/**
 * Форматування дати в короткому форматі (тільки дата)
 * @param {string|Date} date - Дата для форматування
 * @returns {string} - Відформатована дата в форматі "дд.мм.рррр"
 */
export function formatDateShort(date) {
  if (!date) return '—'

  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return '—'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  return `${day}.${month}.${year}`
}
