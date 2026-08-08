/** Спільні підписи/кольори аналітики — для списку, статистики та графіків */
import i18n from '../i18n'

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  get human() { return i18n.t('analytics.clientTypePlural.human') },
  get bot() { return i18n.t('analytics.clientTypePlural.bot') },
  get suspicious() { return i18n.t('analytics.clientTypePlural.suspicious') },
  get unknown() { return i18n.t('analytics.clientTypePlural.unknown') },
}

export const CLIENT_TYPE_BADGE: Record<string, string> = {
  human: 'badge bg-success',
  bot: 'badge bg-secondary',
  suspicious: 'badge bg-warning text-dark',
  unknown: 'badge bg-info',
}

export const CLIENT_TYPE_PROGRESS: Record<string, string> = {
  human: 'bg-success',
  bot: 'bg-secondary',
  suspicious: 'bg-warning',
  unknown: 'bg-info',
}

export const BOT_CATEGORY_LABELS: Record<string, string> = {
  get search_engine() { return i18n.t('analytics.filters.groupSearchEngines') },
  get seo_tool() { return i18n.t('analytics.filters.groupSeoTools') },
  get monitoring() { return i18n.t('analytics.filters.groupMonitoring') },
  get scraper() { return i18n.t('analytics.filters.scrapers') },
  get malicious() { return i18n.t('analytics.botCategoryMalicious') },
}

export const BOT_CATEGORY_BADGE: Record<string, string> = {
  search_engine: 'badge bg-primary',
  seo_tool: 'badge bg-info',
  monitoring: 'badge bg-success',
  scraper: 'badge bg-warning text-dark',
  malicious: 'badge bg-danger',
}

export const BOT_CATEGORY_PROGRESS: Record<string, string> = {
  search_engine: 'bg-primary',
  seo_tool: 'bg-info',
  monitoring: 'bg-success',
  scraper: 'bg-warning',
  malicious: 'bg-danger',
}

export const DEVICE_ICON: Record<string, string> = {
  mobile: 'bi-phone',
  tablet: 'bi-tablet',
  desktop: 'bi-display',
}

export const DEVICE_NAME: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
}

export function clientTypeLabel(type: string): string {
  return CLIENT_TYPE_LABELS[type] ?? i18n.t('analytics.clientType.unclassified')
}

export function responseTimeClass(time?: number | null): string {
  if (!time) return ''
  if (time < 100) return 'text-success'
  if (time < 500) return 'text-warning'
  return 'text-danger'
}

/** Повний URL реферера → лише домен */
export function shortUrl(url?: string | null): string {
  if (!url) return '—'
  try {
    return new URL(url).hostname
  } catch {
    return url.slice(0, 50)
  }
}

/** Тренд по днях: розділення на людей і ботів */
export function buildTrafficTrend(trend?: Array<{ date: string; is_bot: number; count: number }>) {
  if (!trend) return { labels: [] as string[], datasets: [] }

  const dateMap: Record<string, { real: number; bots: number }> = {}
  for (const item of trend) {
    dateMap[item.date] ??= { real: 0, bots: 0 }
    if (item.is_bot === 0) dateMap[item.date].real = item.count
    else dateMap[item.date].bots = item.count
  }

  const labels = Object.keys(dateMap).sort()
  return {
    labels,
    datasets: [
      { label: i18n.t('analytics.legendUsers'), data: labels.map(d => dateMap[d].real), color: '#0d6efd' },
      { label: i18n.t('analytics.legendBots'), data: labels.map(d => dateMap[d].bots), color: '#6c757d' },
    ],
  }
}
