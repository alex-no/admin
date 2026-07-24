// Copyright (c) 2026 Oleksandr Nosov. MIT License.

/**
 * Форматує український номер телефону у вигляд "+38 (044) 123-45-67".
 * Приймає будь-який запис (з пробілами/дужками/дефісами чи без, з кодом країни
 * чи без) — бере лише цифри і сама розставляє роздільники. Якщо розпізнати
 * не вдалося (не 9/10/12 цифр) — повертає рядок як є, без форматування.
 */
export function formatPhoneUA(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')

  let normalized = digits
  if (normalized.length === 9) normalized = '380' + normalized
  else if (normalized.length === 10 && normalized.startsWith('0')) normalized = '38' + normalized

  if (normalized.length !== 12 || !normalized.startsWith('38')) {
    return String(raw).trim()
  }

  const area  = normalized.slice(2, 5)
  const part1 = normalized.slice(5, 8)
  const part2 = normalized.slice(8, 10)
  const part3 = normalized.slice(10, 12)

  return `+38 (${area}) ${part1}-${part2}-${part3}`
}

/**
 * Приводить номер до стандарту E.164 для зберігання — лише "+" і цифри
 * ("+380441234567"). Приймає той самий довільний запис, що й formatPhoneUA.
 * Порожній/нерозпізнаний ввід повертає як є (без "+"), щоб не губити дані,
 * які користувач ще редагує.
 */
export function normalizePhoneE164(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''

  let normalized = digits
  if (normalized.length === 9) normalized = '380' + normalized
  else if (normalized.length === 10 && normalized.startsWith('0')) normalized = '38' + normalized

  return '+' + normalized
}
