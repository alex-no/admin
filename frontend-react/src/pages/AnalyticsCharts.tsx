import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import TrendChart from '@/components/charts/TrendChart'
import PieChart from '@/components/charts/PieChart'
import BarChart from '@/components/charts/BarChart'
import HourlyChart from '@/components/charts/HourlyChart'
import { apiGet } from '@/utils/api'
import { CLIENT_TYPE_LABELS, BOT_CATEGORY_LABELS, buildTrafficTrend } from './analyticsLabels'

export default function AnalyticsCharts() {
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

  const trend = buildTrafficTrend(stats?.trend)

  const clientTypes = (stats?.by_client_type ?? []).map((item: any) => ({
    label: CLIENT_TYPE_LABELS[item.client_type] ?? item.client_type,
    count: item.count,
  }))

  const botCategories = (stats?.bot_categories ?? []).map((item: any) => ({
    label: BOT_CATEGORY_LABELS[item.bot_category] ?? item.bot_category,
    count: item.count,
  }))

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <Link to="/analytics" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left" /> {t('analytics.back')}
          </Link>
          <h5 className="mb-0">{t('analytics.chartsTitle')}</h5>
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
            <option value={1}>{t('analytics.period24h')}</option>
            <option value={7}>{t('analytics.periodDays', { days: 7 })}</option>
            <option value={14}>{t('analytics.periodDays', { days: 14 })}</option>
            <option value={30}>{t('analytics.periodDays', { days: 30 })}</option>
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
          {/* Динаміка */}
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.trendTitle')}</strong></div>
              <div className="card-body">
                {trend.labels.length > 0
                  ? <TrendChart labels={trend.labels} datasets={trend.datasets} />
                  : <div className="text-center text-muted py-5">{t('common.noData')}</div>}
              </div>
            </div>
          </div>

          {/* Розподіл по годинах — лише для доби */}
          {days === 1 && stats.hourly?.length > 0 && (
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-light"><strong>{t('analytics.hourlyTitle')}</strong></div>
                <div className="card-body">
                  <HourlyChart data={stats.hourly} />
                </div>
              </div>
            </div>
          )}

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byDeviceTitle')}</strong></div>
              <div className="card-body">
                <PieChart data={stats.by_device} labelKey="device_type" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byBrowserTitle')}</strong></div>
              <div className="card-body">
                <BarChart data={stats.by_browser} labelKey="browser" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byOsTitle')}</strong></div>
              <div className="card-body">
                <BarChart data={stats.by_os} labelKey="os" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byClientTypeTitle')}</strong></div>
              <div className="card-body">
                <PieChart data={clientTypes} labelKey="label" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>{t('analytics.byBotCategoryTitle')}</strong></div>
              <div className="card-body">
                <PieChart data={botCategories} labelKey="label" valueKey="count" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
