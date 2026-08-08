import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TrendChart from '@/components/charts/TrendChart'
import type { TrendDataset } from '@/components/charts/TrendChart'
import { apiGet } from '@/utils/api'
import { LEVEL_BADGE, LEVEL_COLOR, shortException } from './errorLogLevels'

interface Stats {
  total: number
  period_days: number
  by_level: Array<{ level: string; count: number }>
  by_category: Array<{ category: string; count: number }>
  by_exception: Array<{ exception_class: string; count: number }>
  trend: Array<{ date: string; level: string; count: number }>
}

function buildTrend(stats: Stats | null): { labels: string[]; datasets: TrendDataset[] } {
  if (!stats?.trend) return { labels: [], datasets: [] }

  const dateMap: Record<string, Record<string, number>> = {}
  for (const item of stats.trend) {
    dateMap[item.date] ??= {}
    dateMap[item.date][item.level] = item.count
  }

  const labels = Object.keys(dateMap).sort()
  const datasets: TrendDataset[] = []

  for (const level of ['error', 'critical', 'warning', 'alert', 'emergency']) {
    const data = labels.map(date => dateMap[date][level] || 0)
    if (data.reduce((s, v) => s + v, 0) > 0) {
      const fallbackColor = getComputedStyle(document.documentElement).getPropertyValue('--bs-secondary').trim() || '#6c757d'
      datasets.push({ label: level, data, color: LEVEL_COLOR[level] ?? fallbackColor })
    }
  }

  return { labels, datasets }
}

export default function ErrorLogStats() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [days, setDays] = useState(7)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet(`/admin/error-logs/stats?days=${days}`)
      setStats(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLogs.loadError'))
    } finally {
      setLoading(false)
    }
  }, [days, t])

  useEffect(() => { load() }, [load])

  const trend = buildTrend(stats)

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/error-logs" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left" /> {t('analytics.back')}
          </Link>
          <h5 className="mb-0">{t('errorLogs.statsTitle')}</h5>
        </div>
        <div className="d-flex gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            {[7, 14, 30, 60, 90].map(d => (
              <option key={d} value={d}>{t('errorLogs.periodOption', { days: d })}</option>
            ))}
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
          {/* Всього */}
          <div className="col-md-3">
            <div className="card text-center shadow-sm">
              <div className="card-body">
                <h6 className="text-muted mb-2">{t('errorLogs.totalErrors')}</h6>
                <h2 className="mb-0">{stats.total}</h2>
                <small className="text-muted">{t('analytics.periodDaysSuffix', { days: stats.period_days })}</small>
              </div>
            </div>
          </div>

          {/* По рівнях */}
          <div className="col-md-9">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('errorLogs.byLevel')}</strong></div>
              <div className="card-body">
                <div className="row g-2">
                  {stats.by_level.map(item => (
                    <div key={item.level} className="col-md-4">
                      <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                        <span className={LEVEL_BADGE[item.level] ?? 'badge bg-secondary'}>{item.level}</span>
                        <strong>{item.count}</strong>
                      </div>
                    </div>
                  ))}
                  {stats.by_level.length === 0 && (
                    <div className="col-12 text-center text-muted py-3">{t('common.noData')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Топ категорій */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('errorLogs.topCategories')}</strong></div>
              <div className="card-body">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{t('errorLogs.category')}</th>
                      <th className="text-end">{t('errorLogs.count')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_category.map(item => (
                      <tr key={item.category}>
                        <td><code className="small">{item.category}</code></td>
                        <td className="text-end"><strong>{item.count}</strong></td>
                      </tr>
                    ))}
                    {stats.by_category.length === 0 && (
                      <tr><td colSpan={2} className="text-center text-muted py-3">{t('common.noData')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Топ exceptions */}
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('errorLogs.topExceptions')}</strong></div>
              <div className="card-body">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>{t('errorLogs.exception')}</th>
                      <th className="text-end">{t('errorLogs.count')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_exception.map(item => (
                      <tr key={item.exception_class}>
                        <td>
                          <code className="small" title={item.exception_class}>
                            {shortException(item.exception_class)}
                          </code>
                        </td>
                        <td className="text-end"><strong>{item.count}</strong></td>
                      </tr>
                    ))}
                    {stats.by_exception.length === 0 && (
                      <tr><td colSpan={2} className="text-center text-muted py-3">{t('common.noData')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Динаміка */}
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('errorLogs.trendTitle')}</strong></div>
              <div className="card-body">
                {trend.labels.length > 0 ? (
                  <div style={{ maxHeight: '400px', overflowX: 'auto' }}>
                    <TrendChart labels={trend.labels} datasets={trend.datasets} />
                  </div>
                ) : (
                  <div className="text-center text-muted py-5">{t('errorLogs.noChartData')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
