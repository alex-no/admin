/** Бейджі HTTP-методів і статусів — спільні для списку та картки деталей */

export function methodBadge(method: string): string {
  return {
    GET: 'badge bg-primary',
    POST: 'badge bg-success',
    PUT: 'badge bg-warning text-dark',
    DELETE: 'badge bg-danger',
  }[method] ?? 'badge bg-secondary'
}

export function statusBadge(code: number): string {
  if (code >= 200 && code < 300) return 'badge bg-success'
  if (code >= 300 && code < 400) return 'badge bg-info'
  if (code >= 400 && code < 500) return 'badge bg-warning text-dark'
  if (code >= 500) return 'badge bg-danger'
  return 'badge bg-secondary'
}

export function rowClass(statusCode: number): string {
  if (statusCode >= 500) return 'table-danger'
  if (statusCode >= 400) return 'table-warning'
  return ''
}

/** Тип клієнта + пристрій/ім'я бота одним підписом */
export function smartClientLabel(row: any): string {
  if (row.client_type === 'human') {
    if (row.device_type === 'desktop') return '👤 🖥️ Desktop'
    if (row.device_type === 'mobile') return '👤 📱 Mobile'
    if (row.device_type === 'tablet') return '👤 📲 Tablet'
    return '👤 Людина'
  }

  if (row.client_type === 'bot') {
    if (row.bot_category === 'search_engine') {
      const name: string = row.bot_name ?? ''
      if (name.includes('Google')) return '🔍 Google'
      if (name.includes('Yandex')) return '🔍 Yandex'
      if (name.includes('bing')) return '🔍 Bing'
      if (name.includes('DuckDuck')) return '🔍 DuckDuckGo'
      if (name.includes('Baidu')) return '🔍 Baidu'
      if (name.includes('facebook')) return '🔍 Facebook'
      return '🔍 ' + (row.bot_name || 'Пошукова система')
    }
    if (row.bot_category === 'seo_tool') return '📊 ' + (row.bot_name || 'SEO')
    if (row.bot_category === 'monitoring') return '🔔 ' + (row.bot_name || 'Моніторинг')
    if (row.bot_category === 'scraper') return '🤖 Scraper'
    if (row.bot_category === 'malicious') return '🚫 ' + (row.bot_name || 'Malicious')
    return '🤖 Бот'
  }

  if (row.client_type === 'suspicious') return '⚠️ Підозрілий'
  if (row.client_type === 'unknown') return '❓ Невідомий'
  return '⏳ Не класифіковано'
}

/** Повний referer → лише домен */
export function shortReferer(ref?: string | null): string {
  if (!ref) return '—'
  try {
    return new URL(ref).hostname
  } catch {
    return ref.slice(0, 30)
  }
}
