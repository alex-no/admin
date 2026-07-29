import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TrendChart from '@/components/charts/TrendChart'
import PieChart from '@/components/charts/PieChart'
import BarChart from '@/components/charts/BarChart'
import HourlyChart from '@/components/charts/HourlyChart'
import { apiGet } from '@/utils/api'
import { CLIENT_TYPE_LABELS, BOT_CATEGORY_LABELS, buildTrafficTrend } from './analyticsLabels'

export default function AnalyticsCharts() {
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
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [days, section])

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
            <i className="bi bi-arrow-left" /> Назад
          </Link>
          <h5 className="mb-0">Графіки та візуалізації</h5>
        </div>
        <div className="d-flex gap-2">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">Всі розділи</option>
            <option value="frontend">Frontend</option>
            <option value="admin">Адмінка</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value={1}>24 години</option>
            <option value={7}>7 днів</option>
            <option value={14}>14 днів</option>
            <option value={30}>30 днів</option>
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
              <div className="card-header bg-light"><strong>Динаміка відвідувань по днях</strong></div>
              <div className="card-body">
                {trend.labels.length > 0
                  ? <TrendChart labels={trend.labels} datasets={trend.datasets} />
                  : <div className="text-center text-muted py-5">Немає даних</div>}
              </div>
            </div>
          </div>

          {/* Розподіл по годинах — лише для доби */}
          {days === 1 && stats.hourly?.length > 0 && (
            <div className="col-md-6">
              <div className="card shadow-sm">
                <div className="card-header bg-light"><strong>Розподіл по годинах (24h)</strong></div>
                <div className="card-body">
                  <HourlyChart data={stats.hourly} />
                </div>
              </div>
            </div>
          )}

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>По типах пристроїв</strong></div>
              <div className="card-body">
                <PieChart data={stats.by_device} labelKey="device_type" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>По браузерах</strong></div>
              <div className="card-body">
                <BarChart data={stats.by_browser} labelKey="browser" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>По операційних системах</strong></div>
              <div className="card-body">
                <BarChart data={stats.by_os} labelKey="os" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>Типи клієнтів</strong></div>
              <div className="card-body">
                <PieChart data={clientTypes} labelKey="label" valueKey="count" />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-light"><strong>Категорії ботів</strong></div>
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
