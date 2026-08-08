import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '@/components/BaseModal'
import { apiGet, apiPost } from '@/utils/api'
import { formatDate } from '@/utils/date'
import {
  CLIENT_TYPE_BADGE,
  DEVICE_ICON,
  clientTypeLabel,
  responseTimeClass,
} from './analyticsLabels'
import { methodBadge, statusBadge } from './analyticsBadges'

interface AnalyticsDetailsModalProps {
  id: number
  onClose: () => void
  onFilterByIp: (ip: string) => void
}

/** Приватні IP: бекенд повертає {error:true, message} — інструменти для них недоступні */
interface IpInfo {
  error?: boolean
  message?: string
  [key: string]: any
}

function formatOffset(seconds?: number): string {
  if (!seconds) return ''
  const hours = Math.floor(Math.abs(seconds) / 3600)
  const minutes = Math.floor((Math.abs(seconds) % 3600) / 60)
  const sign = seconds >= 0 ? '+' : '-'
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export default function AnalyticsDetailsModal({ id, onClose, onFilterByIp }: AnalyticsDetailsModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null)
  const [loadingIpInfo, setLoadingIpInfo] = useState(false)

  // Мережні інструменти
  const [pingResult, setPingResult] = useState('')
  const [loadingPing, setLoadingPing] = useState(false)
  const [tracerouteResult, setTracerouteResult] = useState('')
  const [loadingTraceroute, setLoadingTraceroute] = useState(false)
  const [reverseDnsResult, setReverseDnsResult] = useState<any>(null)
  const [loadingReverseDns, setLoadingReverseDns] = useState(false)
  const [blacklistResult, setBlacklistResult] = useState<any>(null)
  const [loadingBlacklist, setLoadingBlacklist] = useState(false)
  const [httpHeadersResult, setHttpHeadersResult] = useState<any>(null)
  const [loadingHttpHeaders, setLoadingHttpHeaders] = useState(false)

  // Бан IP
  const [showBanModal, setShowBanModal] = useState(false)
  const [banDuration, setBanDuration] = useState('24h')
  const [banReason, setBanReason] = useState('')
  const [deleteAnalytics, setDeleteAnalytics] = useState(true)
  const [loadingBan, setLoadingBan] = useState(false)
  const [banError, setBanError] = useState('')
  const [banSuccess, setBanSuccess] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)

  const loadIpInfo = useCallback(async (ip: string) => {
    setLoadingIpInfo(true)
    try {
      const res = await apiGet(`/admin/network-tools/ip-info/${ip}`)
      setIpInfo(res.data)
    } catch {
      setIpInfo(null)
    } finally {
      setLoadingIpInfo(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    apiGet(`/admin/analytics/pageview/${id}`)
      .then(res => {
        if (!alive) return
        setData(res.data)
        if (res.data?.ip) loadIpInfo(res.data.ip)
      })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : t('common.error')) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [id, loadIpInfo])

  // Мережний інструмент: один обробник на всі — відрізняються лише шляхом і станом
  const runTool = async (
    path: string,
    setLoadingFn: (v: boolean) => void,
    setResult: (v: any) => void,
    pick: (res: any) => any
  ) => {
    setLoadingFn(true)
    try {
      const res = await apiGet(`${path}/${data.ip}`)
      setResult(pick(res))
    } catch (err) {
      setResult(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoadingFn(false)
    }
  }

  const banIp = async () => {
    if (!banReason.trim()) {
      setBanError(t('analytics.banReasonRequired'))
      return
    }

    setLoadingBan(true)
    setBanError('')
    setBanSuccess(false)
    setDeletedCount(0)

    try {
      const res = await apiPost('/admin/analytics/ban-ip', {
        ip: data.ip,
        duration: banDuration,
        reason: banReason.trim(),
        delete_analytics: deleteAnalytics,
      })
      setBanSuccess(true)
      setDeletedCount(res.data?.deleted_count ?? 0)
      setTimeout(() => {
        setShowBanModal(false)
        setBanReason('')
        setBanSuccess(false)
        setDeleteAnalytics(true)
        setDeletedCount(0)
      }, 2000)
    } catch (err) {
      setBanError(err instanceof Error ? err.message : t('analytics.banError'))
    } finally {
      setLoadingBan(false)
    }
  }

  const toolsDisabled = Boolean(ipInfo?.error)

  const tabs = [
    { key: 'info', label: t('analytics.tabInfo'), icon: 'bi-info-circle' },
    { key: 'network', label: t('analytics.tabNetwork'), icon: 'bi-hdd-network' },
    { key: 'tools', label: t('analytics.tabTools'), icon: 'bi-tools' },
  ]

  return (
    <>
      <BaseModal
        visible={true}
        onClose={onClose}
        title={<h5 className="mb-0">{t('analytics.detailsTitle')} <span className="text-muted fw-normal fs-6">#{id}</span></h5>}
        subheader={
          <ul className="nav nav-tabs border-0">
            {tabs.map(tab => (
              <li key={tab.key} className="nav-item">
                <button
                  className={`nav-link py-2 px-2 small text-nowrap ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <i className={`bi ${tab.icon} me-1`} />{tab.label}
                </button>
              </li>
            ))}
          </ul>
        }
        footer={
          <>
            <div className="text-muted small">IP: {data?.ip || '—'}</div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>{t('common.close')}</button>
          </>
        }
        storageKey="analytics-details-modal"
        defaultWidth={700}
        minWidth={500}
        maxWidth={1200}
        defaultHeight={400}
        minHeight={300}
        maxHeight={800}
      >
        {loading && <div className="text-center py-5"><div className="spinner-border text-primary" /></div>}
        {!loading && error && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && data && (
          <>
            {/* ── Інформація ── */}
            {activeTab === 'info' && (
              <div className="row g-3">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">{t('analytics.request')}</h6>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr><th style={{ width: '140px' }}>ID:</th><td>{data.id}</td></tr>
                      <tr><th>{t('analytics.dateTime')}</th><td>{formatDate(data.created_at, true)}</td></tr>
                      <tr><th>{t('analytics.urlLabel')}</th><td className="text-break"><code className="small">{data.url}</code></td></tr>
                      <tr><th>{t('analytics.pathLabel')}</th><td><code className="small">{data.path}</code></td></tr>
                      <tr><th>{t('analytics.methodLabel')}</th><td><span className={methodBadge(data.method)}>{data.method}</span></td></tr>
                      <tr><th>{t('analytics.statusLabel')}</th><td><span className={statusBadge(data.status_code)}>{data.status_code}</span></td></tr>
                      <tr>
                        <th>{t('analytics.responseTimeLabel')}</th>
                        <td><span className={responseTimeClass(data.response_time)}>{data.response_time} ms</span></td>
                      </tr>
                      <tr><th>{t('analytics.refererLabel')}</th><td className="text-break small">{data.referer || '—'}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="col-md-6">
                  <h6 className="text-muted mb-2">{t('analytics.client')}</h6>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr>
                        <th style={{ width: '140px' }}>{t('analytics.clientTypeLabel')}</th>
                        <td>
                          <span className={CLIENT_TYPE_BADGE[data.client_type] ?? 'badge bg-light text-dark'}>
                            {clientTypeLabel(data.client_type)}
                          </span>
                          {data.detection_method && (
                            <span className="text-muted small ms-2">({data.detection_method})</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>{t('analytics.deviceLabel')}</th>
                        <td>
                          {data.is_bot ? (
                            <span className="badge bg-secondary"><i className="bi bi-robot" /> Bot: {data.bot_name}</span>
                          ) : (
                            <span className="badge bg-info">
                              <i className={`bi ${DEVICE_ICON[data.device_type] ?? 'bi-question'}`} /> {data.device_type}
                            </span>
                          )}
                        </td>
                      </tr>
                      {!data.is_bot && <tr><th>{t('analytics.browserLabel')}</th><td>{data.browser || '—'}</td></tr>}
                      {!data.is_bot && <tr><th>{t('analytics.osLabel')}</th><td>{data.os || '—'}</td></tr>}
                      <tr>
                        <th>{t('analytics.userAgentLabel')}</th>
                        <td className="text-break small"><code className="small">{data.user_agent || '—'}</code></td>
                      </tr>
                    </tbody>
                  </table>

                  <h6 className="text-muted mb-2 mt-3">{t('analytics.user')}</h6>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr><th style={{ width: '140px' }}>{t('analytics.userIdLabel')}</th><td>{data.user_id || t('analytics.guest')}</td></tr>
                      {data.username && <tr><th>{t('analytics.usernameLabel')}</th><td>{data.username}</td></tr>}
                      {data.email && <tr><th>{t('analytics.emailLabel')}</th><td>{data.email}</td></tr>}
                      <tr><th>{t('analytics.sessionIdLabel')}</th><td><code className="small">{data.session_id || '—'}</code></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Мережа ── */}
            {activeTab === 'network' && (
              <div className="row g-3">
                <div className="col-md-6">
                  <h6 className="text-muted mb-2">{t('analytics.ipAddress')}</h6>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      <tr>
                        <th style={{ width: '140px' }}>{t('analytics.ipLabel')}</th>
                        <td>
                          <strong>{data.ip}</strong>
                          <button
                            className="btn btn-sm btn-outline-secondary ms-2"
                            onClick={() => onFilterByIp(data.ip)}
                          >
                            <i className="bi bi-filter-circle" /> {t('analytics.filterButton')}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="col-md-6">
                  <h6 className="text-muted mb-2">
                    {t('analytics.geolocation')}
                    {loadingIpInfo && <span className="spinner-border spinner-border-sm ms-2" />}
                  </h6>

                  {ipInfo?.error ? (
                    <div className="alert alert-info py-2 small">
                      <i className="bi bi-info-circle me-1" />{ipInfo.message}
                    </div>
                  ) : ipInfo ? (
                    <table className="table table-sm table-bordered">
                      <tbody>
                        {ipInfo.country && (
                          <tr><th style={{ width: '140px' }}>{t('analytics.country')}</th><td>{ipInfo.country} ({ipInfo.countryCode})</td></tr>
                        )}
                        {ipInfo.regionName && <tr><th>{t('analytics.region')}</th><td>{ipInfo.regionName}</td></tr>}
                        {ipInfo.city && <tr><th>{t('analytics.city')}</th><td>{ipInfo.city}</td></tr>}
                        {ipInfo.zip && <tr><th>{t('analytics.zip')}</th><td>{ipInfo.zip}</td></tr>}
                        {ipInfo.isp && <tr><th>{t('analytics.isp')}</th><td>{ipInfo.isp}</td></tr>}
                        {ipInfo.org && <tr><th>{t('analytics.org')}</th><td>{ipInfo.org}</td></tr>}
                        {ipInfo.as && <tr><th>{t('analytics.asn')}</th><td><code className="small">{ipInfo.as}</code></td></tr>}
                        {ipInfo.asname && <tr><th>{t('analytics.asName')}</th><td>{ipInfo.asname}</td></tr>}
                        {ipInfo.reverse && (
                          <tr><th>{t('analytics.reverseDnsLabel')}</th><td><code className="small">{ipInfo.reverse}</code></td></tr>
                        )}
                        {ipInfo.timezone && (
                          <tr><th>{t('analytics.timezone')}</th><td>{ipInfo.timezone} (UTC{formatOffset(ipInfo.offset)})</td></tr>
                        )}
                        <tr>
                          <th>{t('analytics.ipType')}</th>
                          <td>
                            {ipInfo.hosting && <span className="badge bg-warning text-dark" title={t('analytics.hostingTooltip')}><i className="bi bi-server" /> {t('analytics.hostingBadge')}</span>}
                            {ipInfo.proxy && <span className="badge bg-danger" title={t('analytics.proxyTooltip')}><i className="bi bi-shield-exclamation" /> {t('analytics.proxyBadge')}</span>}
                            {ipInfo.mobile && <span className="badge bg-info" title={t('analytics.mobileTooltip')}><i className="bi bi-phone" /> {t('analytics.mobileBadge')}</span>}
                            {!ipInfo.hosting && !ipInfo.proxy && !ipInfo.mobile && (
                              <span className="badge bg-success"><i className="bi bi-house" /> {t('analytics.residentialBadge')}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    !loadingIpInfo && <div className="text-muted small">{t('common.noData')}</div>
                  )}
                </div>
              </div>
            )}

            {/* ── Діагностика ── */}
            {activeTab === 'tools' && (
              <>
                {ipInfo?.error && (
                  <div className="alert alert-warning py-2 small mb-3">
                    <i className="bi bi-exclamation-triangle me-1" />
                    {t('analytics.toolsUnavailablePrivate')}
                  </div>
                )}
                <div className="alert alert-info py-2 small mb-3">
                  <i className="bi bi-info-circle me-1" />
                  {t('analytics.httpHeadersHint')}
                </div>

                <div className="mb-3">
                  <div className="btn-group mb-2">
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={loadingPing || toolsDisabled}
                      onClick={() => runTool('/admin/network-tools/ping', setLoadingPing, setPingResult, r => r.data?.output ?? r.data)}
                    >
                      <i className="bi bi-reception-4" /> {t('analytics.ping')}
                      {loadingPing && <span className="spinner-border spinner-border-sm ms-1" />}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={loadingTraceroute || toolsDisabled}
                      onClick={() => runTool('/admin/network-tools/traceroute', setLoadingTraceroute, setTracerouteResult, r => r.data?.output ?? r.data)}
                    >
                      <i className="bi bi-diagram-3" /> {t('analytics.traceroute')}
                      {loadingTraceroute && <span className="spinner-border spinner-border-sm ms-1" />}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={loadingReverseDns || toolsDisabled}
                      onClick={() => runTool('/admin/network-tools/reverse-dns', setLoadingReverseDns, setReverseDnsResult, r => r.data)}
                    >
                      <i className="bi bi-arrow-left-right" /> {t('analytics.reverseDnsButton')}
                      {loadingReverseDns && <span className="spinner-border spinner-border-sm ms-1" />}
                    </button>
                  </div>

                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-warning"
                      disabled={loadingBlacklist || toolsDisabled}
                      onClick={() => runTool('/admin/network-tools/blacklist-check', setLoadingBlacklist, setBlacklistResult, r => r.data)}
                    >
                      <i className="bi bi-shield-exclamation" /> {t('analytics.blacklistCheck')}
                      {loadingBlacklist && <span className="spinner-border spinner-border-sm ms-1" />}
                    </button>
                    <button
                      className="btn btn-sm btn-info"
                      disabled={loadingHttpHeaders || toolsDisabled}
                      title={t('analytics.httpHeadersOnly')}
                      onClick={() => runTool('/admin/network-tools/http-headers', setLoadingHttpHeaders, setHttpHeadersResult, r => r.data)}
                    >
                      <i className="bi bi-file-earmark-code" /> {t('analytics.httpHeaders')}
                      {loadingHttpHeaders && <span className="spinner-border spinner-border-sm ms-1" />}
                    </button>
                  </div>

                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={toolsDisabled}
                      onClick={() => setShowBanModal(true)}
                    >
                      <i className="bi bi-slash-circle" /> {t('analytics.banIp')}
                    </button>
                  </div>
                </div>

                {pingResult && (
                  <div className="mb-3">
                    <h6 className="text-muted">{t('analytics.pingResultLabel')}</h6>
                    <pre className="bg-dark text-light p-3 rounded small" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {pingResult}
                    </pre>
                  </div>
                )}

                {tracerouteResult && (
                  <div className="mb-3">
                    <h6 className="text-muted">{t('analytics.tracerouteResultLabel')}</h6>
                    <pre className="bg-dark text-light p-3 rounded small" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {tracerouteResult}
                    </pre>
                  </div>
                )}

                {reverseDnsResult && (
                  <div className="mb-3">
                    <h6 className="text-muted">{t('analytics.reverseDnsResultLabel')}</h6>
                    <div className="alert alert-info">
                      <strong>IP:</strong> {reverseDnsResult.ip}<br />
                      <strong>{t('analytics.hostname')}</strong> {reverseDnsResult.hostname || t('analytics.noPtrRecord')}
                    </div>
                  </div>
                )}

                {blacklistResult && (
                  <div className="mb-3">
                    <h6 className="text-muted">{t('analytics.blacklistResultLabel')}</h6>
                    <div className={blacklistResult.is_clean ? 'alert alert-success' : 'alert alert-danger'}>
                      <strong>{t('analytics.status')}</strong>{' '}
                      {blacklistResult.is_clean ? t('analytics.cleanIp') : t('analytics.listedIp')}<br />
                      <strong>{t('analytics.checked', { count: blacklistResult.total_checks })}</strong><br />
                      <strong>{t('analytics.listedIn', { count: blacklistResult.listed_count })}</strong>
                    </div>
                    {!blacklistResult.is_clean && (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead>
                            <tr><th>{t('analytics.rblService')}</th><th>{t('analytics.status')}</th><th>{t('analytics.response')}</th></tr>
                          </thead>
                          <tbody>
                            {(blacklistResult.results ?? []).filter((r: any) => r.listed).map((rbl: any) => (
                              <tr key={rbl.server}>
                                <td>{rbl.name}</td>
                                <td><span className="badge bg-danger">{t('analytics.listed')}</span></td>
                                <td><code className="small">{rbl.response}</code></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {httpHeadersResult && (
                  <div className="mb-3">
                    <h6 className="text-muted">{t('analytics.httpHeadersResultLabel')}</h6>
                    {httpHeadersResult.error ? (
                      <div className="alert alert-warning">
                        <i className="bi bi-exclamation-triangle me-2" />
                        <strong>{t('analytics.httpHeadersError')}</strong> {httpHeadersResult.message}
                      </div>
                    ) : (
                      <>
                        <div className="alert alert-info mb-2">
                          <strong>URL:</strong> {httpHeadersResult.url}<br />
                          <strong>{t('analytics.protocol')}</strong> {String(httpHeadersResult.protocol).toUpperCase()}
                        </div>
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered">
                            <thead>
                              <tr><th style={{ width: '30%' }}>Header</th><th>Value</th></tr>
                            </thead>
                            <tbody>
                              {Object.entries(httpHeadersResult.notable_headers ?? {}).map(([key, value]) => (
                                <tr key={key}>
                                  <td><code className="small">{key}</code></td>
                                  <td className="small text-break">{String(value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <details>
                          <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                            {t('analytics.showAllHeaders', { count: Object.keys(httpHeadersResult.all_headers ?? {}).length })}
                          </summary>
                          <div className="mt-2">
                            <table className="table table-sm table-bordered">
                              <tbody>
                                {Object.entries(httpHeadersResult.all_headers ?? {}).map(([key, value]) => (
                                  <tr key={key}>
                                    <td style={{ width: '30%' }}><code className="small">{key}</code></td>
                                    <td className="small text-break">{String(value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                )}

                {!pingResult && !tracerouteResult && !reverseDnsResult && !blacklistResult && !httpHeadersResult && (
                  <div className="text-muted text-center py-4">{t('analytics.chooseTool')}</div>
                )}
              </>
            )}
          </>
        )}
      </BaseModal>

      {/* Бан IP — окреме просте вікно поверх картки */}
      {showBanModal && data && (
        <>
          <div className="modal-backdrop" style={{ zIndex: 1055 }} onClick={() => setShowBanModal(false)} />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '500px',
              width: '90vw',
              zIndex: 1056,
            }}
          >
            <div className="card shadow-lg">
              <div className="card-header bg-danger text-white">
                <h6 className="mb-0"><i className="bi bi-slash-circle" /> {t('analytics.banModalTitle', { ip: data.ip })}</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">{t('analytics.banDuration')}</label>
                  <select
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="1h">{t('analytics.duration1h')}</option>
                    <option value="24h">{t('analytics.duration24h')}</option>
                    <option value="15d">{t('analytics.duration15d')}</option>
                    <option value="30d">{t('analytics.duration30d')}</option>
                    <option value="180d">{t('analytics.duration180d')}</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('analytics.banReason')}</label>
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={t('analytics.banReasonPlaceholder')}
                  />
                </div>
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      checked={deleteAnalytics}
                      onChange={(e) => setDeleteAnalytics(e.target.checked)}
                      type="checkbox"
                      className="form-check-input"
                      id="deleteAnalyticsCheck"
                    />
                    <label className="form-check-label small" htmlFor="deleteAnalyticsCheck">
                      <i className="bi bi-trash text-danger" /> {t('analytics.deleteAnalytics')}
                      <div className="text-muted" style={{ fontSize: '0.85em' }}>{t('analytics.deleteAnalyticsHint')}</div>
                    </label>
                  </div>
                </div>
                {banError && <div className="alert alert-danger py-2 small mb-3">{banError}</div>}
                {banSuccess && (
                  <div className="alert alert-success py-2 small mb-3">
                    <i className="bi bi-check-circle me-1" /> {t('analytics.banSuccess')}
                    {deletedCount > 0 && <><br />{t('analytics.deletedRecords', { count: deletedCount })}</>}
                  </div>
                )}
              </div>
              <div className="card-footer d-flex gap-2 justify-content-end">
                <button className="btn btn-sm btn-secondary" onClick={() => setShowBanModal(false)}>{t('common.cancel')}</button>
                <button className="btn btn-sm btn-danger" onClick={banIp} disabled={loadingBan || !banReason.trim()}>
                  {loadingBan && <span className="spinner-border spinner-border-sm me-1" />}
                  {t('analytics.banButton')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
