function escapeCsvField(value: any): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/["\n\r,;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Будує CSV-рядок з заголовків і масиву рядків (кожен рядок — масив значень
 * у тому ж порядку, що й headers). Додає UTF-8 BOM на початку, щоб Excel
 * правильно розпізнав кирилицю без ручного вибору кодування.
 */
export function rowsToCsv(headers: string[], rows: any[][]): string {
  const lines = [headers.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','))
  }
  return '﻿' + lines.join('\r\n')
}

/**
 * Ініціює завантаження CSV у браузері. Використовує vanilla DOM API
 * (Blob + <a download>), не залежить від Vue/React — портується на будь-який
 * фронтенд без змін.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * Роздільник визначається по першому рядку (поза лапками): що трапляється
 * частіше — те й роздільник. Потрібно тому, що Excel з укр./рос. локаллю
 * експортує CSV через ";" (у "," там десятковий роздільник), а rowsToCsv
 * вище пише через ",". Імпорт мусить приймати обидва варіанти.
 */
function detectDelimiter(firstLine: string): ',' | ';' {
  let commas = 0
  let semicolons = 0
  let inQuotes = false
  for (const ch of firstLine) {
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (inQuotes) continue
    if (ch === ',') commas++
    else if (ch === ';') semicolons++
  }
  return semicolons > commas ? ';' : ','
}

/**
 * Парсер CSV, зворотний до rowsToCsv: лапки з екрануванням "" усередині,
 * значення з комами/переносами рядків у лапках, CRLF і LF, BOM на початку
 * файлу. Порожні рядки (увесь рядок складається з порожніх полів) відкидаються.
 * Перший непорожній рядок — заголовки, решта — дані.
 */
export function parseCsv(text: string): ParsedCsv {
  let src = text
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1)

  const firstLineEnd = src.search(/\r\n|\r|\n/)
  const delimiter = detectDelimiter(firstLineEnd === -1 ? src : src.slice(0, firstLineEnd))

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\r') {
      // ignored — обробляється разом із наступним \n, або самотній \r теж кінець рядка
      if (src[i + 1] !== '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const nonEmptyRows = rows.filter((r) => r.some((c) => c.trim() !== ''))
  const [headerRow, ...dataRows] = nonEmptyRows

  return {
    headers: (headerRow ?? []).map((h) => h.trim()),
    rows: dataRows,
  }
}

/** Мінімум, потрібний з конфіга колонки, щоб приводити/мапити значення імпорту. */
export interface ImportColumnLike {
  key: string
  label?: string
  type?: string
}

/**
 * Приводить сире текстове значення CSV-клітинки до типу, якого чекає бекенд —
 * те саме приведення, яке вже роблять інлайн-комірки (number: '' → null,
 * boolean: рядок → bool, phone-list: рядок → масив). Невідомі/текстові типи —
 * як є, лише обрізка пробілів.
 */
export function coerceImportValue(col: ImportColumnLike, raw: string): any {
  const value = raw.trim()
  switch (col.type) {
    case 'number':
      return value === '' ? null : Number(value)
    case 'boolean':
      return ['1', 'true', 'yes', 'так', 'да'].includes(value.toLowerCase())
    case 'phone-list':
      return value === '' ? [] : value.split(/[;,]/).map((p) => p.trim()).filter(Boolean)
    default:
      return value
  }
}

/**
 * Початкове зіставлення "колонка CSV → поле сутності" для майстра імпорту:
 * заголовок мапиться на колонку з таким самим key, а якщо не знайдено — на
 * колонку з таким самим (перекладеним) label. `labelFor` — функція перекладу
 * з боку фронтенду (Vue/React мають різні i18n-інстанси), тут її нема.
 * Кожна колонка використовується не більше одного разу.
 */
export function autoMapImportColumns(
  headers: string[],
  columns: ImportColumnLike[],
  labelFor?: (col: ImportColumnLike) => string,
): Record<number, string | null> {
  const mapping: Record<number, string | null> = {}
  const used = new Set<string>()

  headers.forEach((header, idx) => {
    const norm = header.trim().toLowerCase()
    const match = columns.find((c) => {
      if (used.has(c.key)) return false
      if (c.key.toLowerCase() === norm) return true
      const label = labelFor?.(c)
      return !!label && label.trim().toLowerCase() === norm
    })
    mapping[idx] = match ? match.key : null
    if (match) used.add(match.key)
  })

  return mapping
}

/**
 * Зшиває розпарсені рядки CSV у записи `{ поле: значення }` за зіставленням
 * колонок, з приведенням типів (coerceImportValue). Немапований CSV-стовпець
 * (mapping[idx] === null) у результат не потрапляє.
 */
export function buildImportRows(
  rows: string[][],
  mapping: Record<number, string | null>,
  columns: ImportColumnLike[],
): Record<string, any>[] {
  const colByKey = new Map(columns.map((c) => [c.key, c]))

  return rows.map((row) => {
    const record: Record<string, any> = {}
    for (const [idxStr, targetKey] of Object.entries(mapping)) {
      if (!targetKey) continue
      const col = colByKey.get(targetKey)
      if (!col) continue
      record[targetKey] = coerceImportValue(col, row[Number(idxStr)] ?? '')
    }
    return record
  })
}
