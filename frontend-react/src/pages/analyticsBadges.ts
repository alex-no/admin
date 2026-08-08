/** Бейджі HTTP-методів і статусів — спільні для списку та картки деталей */
import i18n from '../i18n'

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
    if (row.device_type === 'desktop') return i18n.t('analytics.smart.humanDesktop')
    if (row.device_type === 'mobile') return i18n.t('analytics.smart.humanMobile')
    if (row.device_type === 'tablet') return i18n.t('analytics.smart.humanTablet')
    return i18n.t('analytics.clientType.human')
  }

  if (row.client_type === 'bot') {
    if (row.bot_category === 'search_engine') {
      const name: string = row.bot_name ?? ''
      if (name.includes('Google')) return i18n.t('analytics.smart.google')
      if (name.includes('Yandex')) return i18n.t('analytics.smart.yandex')
      if (name.includes('bing')) return i18n.t('analytics.smart.bing')
      if (name.includes('DuckDuck')) return i18n.t('analytics.smart.duckduckgo')
      if (name.includes('Baidu')) return i18n.t('analytics.smart.baidu')
      if (name.includes('facebook')) return i18n.t('analytics.smart.facebook')
      return '🔍 ' + (row.bot_name || i18n.t('analytics.smart.searchEngineFallback'))
    }
    if (row.bot_category === 'seo_tool') return '📊 ' + (row.bot_name || 'SEO')
    if (row.bot_category === 'monitoring') return '🔔 ' + (row.bot_name || i18n.t('analytics.smart.monitoringFallback'))
    if (row.bot_category === 'scraper') return i18n.t('analytics.smart.scraper')
    if (row.bot_category === 'malicious') return '🚫 ' + (row.bot_name || 'Malicious')
    return i18n.t('analytics.clientType.bot')
  }

  if (row.client_type === 'suspicious') return i18n.t('analytics.clientType.suspicious')
  if (row.client_type === 'unknown') return i18n.t('analytics.clientType.unknown')
  return i18n.t('analytics.clientType.unclassified')
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
