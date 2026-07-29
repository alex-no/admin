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

export function downloadCsv(filename: string, csvContent: string) {
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
