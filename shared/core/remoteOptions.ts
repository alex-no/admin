/**
 * Дрібні чисті хелпери довкола довідників select-фільтрів/комірок. Сам кеш
 * запитів лишається за фронтендом — Vue кешує реактивні refs, React кешує
 * проміси; це вже не "той самий код", а різні стратегії, тому не уніфіковано.
 */

/** "{utc_offset} ({count})" -> "+03:00 (12)" */
export function formatOptionLabel(template: string, row: any): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => row[key] ?? '')
}

/** Додає per_page, якщо URL ще не має цього параметра. */
export function withDefaultPerPage(url: string, perPage = 500): string {
  if (url.includes('per_page')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}per_page=${perPage}`
}
