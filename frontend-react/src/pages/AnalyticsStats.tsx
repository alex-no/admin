import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TrendChart from '@/components/charts/TrendChart'
import { apiGet } from '@/utils/api'
import {
  BOT_CATEGORY_BADGE,
  BOT_CATEGORY_LABELS,
  BOT_CATEGORY_PROGRESS,
  CLIENT_TYPE_BADGE,
  CLIENT_TYPE_PROGRESS,
  DEVICE_ICON,
  DEVICE_NAME,
  buildTrafficTrend,
  clientTypeLabel,
  responseTimeClass,
  shortUrl,
} from './analyticsLabels'

export default function AnalyticsStats() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [days, setDays] = useState(7)
  const [section, setSection] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const params = new URLSearchParams({ days: String(days) })
    if (section) params.set('section', section)

    try {
      const res = await apiGet(`/admin/analytics/stats?${params}`)
      setStats(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analytics.loadError'))
    } finally {
      setLoading(false)
    }
  }, [days, section, t])

  useEffect(() => { load() }, [load])

  const botsCount = (stats?.bots_vs_real ?? []).find((i: any) => i.is_bot === 1)?.count ?? 0
  const botsPercent = stats?.total ? Math.round((botsCount / stats.total) * 100) : 0
  const trend = buildTrafficTrend(stats?.trend)

  const pctOfTotal = (count: number) => (stats?.total ? Math.round((count / stats.total) * 100) : 0)
  const pctOfBots = (count: number) => (botsCount ? Math.round((count / botsCount) * 100) : 0)

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/analytics" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left" /> {t('analytics.back')}
          </Link>
          <h5 className="mb-0">{t('analytics.statsTitle')}</h5>
        </div>
        <div className="d-flex gap-2">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">{t('analytics.filters.allSections')}</option>
            <option value="frontend">{t('analytics.filters.sectionFrontend')}</option>
            <option value="admin">{t('analytics.filters.sectionAdmin')}</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value={1}>{t('analytics.period24hFull')}</option>
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{t('analytics.periodDaysFull', { days: d })}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && stats && (
        <div className="row g-3">
          {/* Зведення */}
          <div className="col-md-3">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6 className="text-muted mb-2">{t('analytics.totalViews')}</h6>
                <h2 className="mb-0">{stats.total}</h2>
                <small className="text-muted">{t('analytics.periodDaysSuffix', { days: stats.period_days })}</small>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6 className="text-muted mb-2">{t('analytics.uniqueVisitors')}</h6>
                <h2 className="mb-0">{stats.unique_visitors}</h2>
                <small className="text-muted">{t('analytics.byIpNoBots')}</small>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6 className="text-muted mb-2">{t('analytics.avgResponseTime')}</h6>
                <h2 className={`mb-0 ${responseTimeClass(stats.response_time?.avg_time)}`}>
                  {Math.round(stats.response_time?.avg_time || 0)}ms
                </h2>
                <small className="text-muted">{t('analytics.maxTime', { value: stats.response_time?.max_time })}</small>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6 className="text-muted mb-2">{t('analytics.bots')}</h6>
                <h2 className="mb-0">{botsCount}</h2>
                <small className="text-muted">{t('analytics.botsTraffic', { percent: botsPercent })}</small>
              </div>
            </div>
          </div>

          {/* Топ сторінок */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.topPages')}</strong></div>
              <div className="card-body">
                <table className="table table-sm table-hover mb-0">
                  <thead><tr><th>URL</th><th className="text-end">{t('analytics.views')}</th></tr></thead>
                  <tbody>
                    {(stats.top_pages ?? []).map((item: any) => (
                      <tr key={item.path}>
                        <td><code className="small">{item.path}</code></td>
                        <td className="text-end"><strong>{item.views}</strong></td>
                      </tr>
                    ))}
                    {!stats.top_pages?.length && (
                      <tr><td colSpan={2} className="text-center text-muted py-3">{t('common.noData')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Топ джерел */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.topReferers')}</strong></div>
              <div className="card-body">
                <table className="table table-sm table-hover mb-0">
                  <thead><tr><th>Referer</th><th className="text-end">{t('analytics.countLabel')}</th></tr></thead>
                  <tbody>
                    {(stats.top_referers ?? []).map((item: any) => (
                      <tr key={item.referer}>
                        <td className="small text-truncate" style={{ maxWidth: '300px' }}>{shortUrl(item.referer)}</td>
                        <td className="text-end"><strong>{item.count}</strong></td>
                      </tr>
                    ))}
                    {!stats.top_referers?.length && (
                      <tr><td colSpan={2} className="text-center text-muted py-3">{t('common.noData')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Пристрої */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byDevice')}</strong></div>
              <div className="card-body">
                {(stats.by_device ?? []).map((item: any) => (
                  <div key={item.device_type} className="d-flex justify-content-between align-items-center mb-2">
                    <span>
                      <i className={`bi ${DEVICE_ICON[item.device_type] ?? 'bi-question'}`} />{' '}
                      {DEVICE_NAME[item.device_type] ?? item.device_type}
                    </span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
                {!stats.by_device?.length && <div className="text-center text-muted py-3">{t('common.noData')}</div>}
              </div>
            </div>
          </div>

          {/* Браузери */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byBrowser')}</strong></div>
              <div className="card-body">
                {(stats.by_browser ?? []).map((item: any) => (
                  <div key={item.browser} className="d-flex justify-content-between align-items-center mb-2">
                    <span>{item.browser}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
                {!stats.by_browser?.length && <div className="text-center text-muted py-3">{t('common.noData')}</div>}
              </div>
            </div>
          </div>

          {/* ОС */}
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byOs')}</strong></div>
              <div className="card-body">
                {(stats.by_os ?? []).map((item: any) => (
                  <div key={item.os} className="d-flex justify-content-between align-items-center mb-2">
                    <span>{item.os}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
                {!stats.by_os?.length && <div className="text-center text-muted py-3">{t('common.noData')}</div>}
              </div>
            </div>
          </div>

          {/* Типи клієнтів */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byClientType')}</strong></div>
              <div className="card-body">
                {(stats.by_client_type ?? []).map((item: any) => (
                  <div key={item.client_type} className="d-flex justify-content-between align-items-center mb-2">
                    <span
                      className={CLIENT_TYPE_BADGE[item.client_type] ?? 'badge bg-light text-dark'}
                      style={{ minWidth: '140px' }}
                    >
                      {clientTypeLabel(item.client_type)}
                    </span>
                    <div className="flex-grow-1 mx-3">
                      <div className="progress" style={{ height: '20px' }}>
                        <div
                          className={`progress-bar ${CLIENT_TYPE_PROGRESS[item.client_type] ?? 'bg-light'}`}
                          style={{ width: `${pctOfTotal(item.count)}%` }}
                        >
                          {pctOfTotal(item.count)}%
                        </div>
                      </div>
                    </div>
                    <strong style={{ minWidth: '60px', textAlign: 'right' }}>{item.count}</strong>
                  </div>
                ))}
                {!stats.by_client_type?.length && <div className="text-center text-muted py-3">{t('common.noData')}</div>}
              </div>
            </div>
          </div>

          {/* Категорії ботів */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byBotCategoryTitle')}</strong></div>
              <div className="card-body">
                {(stats.bot_categories ?? []).map((item: any) => (
                  <div key={item.bot_category} className="d-flex justify-content-between align-items-center mb-2">
                    <span
                      className={BOT_CATEGORY_BADGE[item.bot_category] ?? 'badge bg-secondary'}
                      style={{ minWidth: '180px' }}
                    >
                      {BOT_CATEGORY_LABELS[item.bot_category] ?? item.bot_category}
                    </span>
                    <div className="flex-grow-1 mx-3">
                      <div className="progress" style={{ height: '20px' }}>
                        <div
                          className={`progress-bar ${BOT_CATEGORY_PROGRESS[item.bot_category] ?? 'bg-secondary'}`}
                          style={{ width: `${pctOfBots(item.count)}%` }}
                        >
                          {pctOfBots(item.count)}%
                        </div>
                      </div>
                    </div>
                    <strong style={{ minWidth: '60px', textAlign: 'right' }}>{item.count}</strong>
                  </div>
                ))}
                {!stats.bot_categories?.length && <div className="text-center text-muted py-3">{t('common.noData')}</div>}
              </div>
            </div>
          </div>

          {/* Топ ботів */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.topBots')}</strong></div>
              <div className="card-body">
                <table className="table table-sm table-hover mb-0">
                  <thead><tr><th>{t('analytics.clientTypePlain.bot')}</th><th className="text-end">{t('analytics.requests')}</th></tr></thead>
                  <tbody>
                    {(stats.top_bots ?? []).map((item: any) => (
                      <tr key={item.bot_name}>
                        <td><i className="bi bi-robot" /> {item.bot_name}</td>
                        <td className="text-end"><strong>{item.count}</strong></td>
                      </tr>
                    ))}
                    {!stats.top_bots?.length && (
                      <tr><td colSpan={2} className="text-center text-muted py-3">{t('common.noData')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Динаміка */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.trendByDays')}</strong></div>
              <div className="card-body">
                {trend.labels.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowX: 'auto' }}>
                    <TrendChart labels={trend.labels} datasets={trend.datasets} />
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">{t('common.noData')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
