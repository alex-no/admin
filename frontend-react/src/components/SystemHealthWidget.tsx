import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet } from '@/utils/api'

interface Metrics {
  server?: {
    disk_usage_percent?: number
    load_average?: number[]
    memory?: { usage_percent?: number }
  }
  database?: {
    connections?: number
    slow_queries?: number
    size_mb?: number
  }
  storage?: {
    reachable?: boolean
    file_count?: number
    total_mb?: number
  }
  errors?: {
    last_hour?: number
    last_24h?: number
  }
}

function fmtPercent(v?: number | null): string {
  return v != null ? `${v}%` : '—'
}

function pctClass(v?: number | null): string {
  if (v == null) return ''
  if (v >= 90) return 'text-danger fw-semibold'
  if (v >= 75) return 'text-warning fw-semibold'
  return 'text-success'
}

function countClass(v?: number | null): string {
  if (v == null) return ''
  return v > 0 ? 'text-danger fw-semibold' : 'text-success'
}

/** Рядок "підпис — значення" всередині картки метрики */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="d-flex justify-content-between">
      <span>{label}</span>
      {children}
    </div>
  )
}

export default function SystemHealthWidget() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Metrics | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/admin/system/metrics')
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('systemHealth.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="mb-0">
          <i className="bi bi-hdd-network me-1" />
          {t('systemHealth.title')}
        </h6>
        <button className="btn btn-sm btn-outline-secondary" disabled={loading} onClick={load}>
          {loading
            ? <span className="spinner-border spinner-border-sm" />
            : <i className="bi bi-arrow-clockwise" />}
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger py-2 small mb-0">{error}</div>
      ) : (
        <div className="row g-3">
          {/* Сервер */}
          <div className="col-sm-6 col-lg-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-2"><i className="bi bi-cpu me-1" />{t('systemHealth.server')}</div>
                <div className="small">
                  <Row label={t('systemHealth.disk')}>
                    <span className={pctClass(data?.server?.disk_usage_percent)}>
                      {fmtPercent(data?.server?.disk_usage_percent)}
                    </span>
                  </Row>
                  <Row label={t('systemHealth.loadAvg')}>
                    <span>{data?.server?.load_average?.join(' / ') ?? '—'}</span>
                  </Row>
                  <Row label={t('systemHealth.memory')}>
                    <span className={pctClass(data?.server?.memory?.usage_percent)}>
                      {fmtPercent(data?.server?.memory?.usage_percent)}
                    </span>
                  </Row>
                </div>
              </div>
            </div>
          </div>

          {/* База даних */}
          <div className="col-sm-6 col-lg-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-2"><i className="bi bi-database me-1" />{t('systemHealth.database')}</div>
                <div className="small">
                  <Row label={t('systemHealth.connections')}>
                    <span>{data?.database?.connections ?? '—'}</span>
                  </Row>
                  <Row label={t('systemHealth.slowQueries')}>
                    <span>{data?.database?.slow_queries ?? '—'}</span>
                  </Row>
                  <Row label={t('systemHealth.size')}>
                    <span>{data?.database?.size_mb != null ? t('systemHealth.megabytes', { value: data.database.size_mb }) : '—'}</span>
                  </Row>
                </div>
              </div>
            </div>
          </div>

          {/* Сховище */}
          <div className="col-sm-6 col-lg-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-2"><i className="bi bi-hdd-rack me-1" />{t('systemHealth.storage')}</div>
                <div className="small">
                  <Row label={t('table.status')}>
                    <span className={data?.storage?.reachable ? 'text-success' : 'text-danger'}>
                      {data?.storage?.reachable ? t('systemHealth.reachable') : t('systemHealth.unreachable')}
                    </span>
                  </Row>
                  <Row label={t('systemHealth.files')}>
                    <span>{data?.storage?.file_count ?? '—'}</span>
                  </Row>
                  <Row label={t('systemHealth.volume')}>
                    <span>{data?.storage?.total_mb != null ? t('systemHealth.megabytes', { value: data.storage.total_mb }) : '—'}</span>
                  </Row>
                </div>
              </div>
            </div>
          </div>

          {/* Помилки API */}
          <div className="col-sm-6 col-lg-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-2">
                  <i className="bi bi-exclamation-triangle me-1" />{t('systemHealth.apiErrors')}
                </div>
                <div className="small">
                  <Row label={t('systemHealth.lastHour')}>
                    <span className={countClass(data?.errors?.last_hour)}>
                      {data?.errors?.last_hour ?? '—'}
                    </span>
                  </Row>
                  <Row label={t('systemHealth.lastDay')}>
                    <span className={countClass(data?.errors?.last_24h)}>
                      {data?.errors?.last_24h ?? '—'}
                    </span>
                  </Row>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
