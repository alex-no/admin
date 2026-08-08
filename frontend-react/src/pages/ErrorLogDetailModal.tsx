import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '@/components/BaseModal'
import { apiGet } from '@/utils/api'
import { notify } from '@/hooks/useNotify'
import i18n from '@/i18n'
import { LEVEL_BADGE } from './errorLogLevels'

interface ErrorLogDetailModalProps {
  id: number
  onClose: () => void
}

function formatStackTrace(trace: any): string {
  if (typeof trace === 'string') return trace
  if (trace && typeof trace === 'object') {
    return trace.trace ?? JSON.stringify(trace, null, 2)
  }
  return i18n.t('common.noData')
}

export default function ErrorLogDetailModal({ id, onClose }: ErrorLogDetailModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [contextFormatted, setContextFormatted] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    apiGet(`/admin/error-logs/${id}`)
      .then(res => { if (alive) setData(res.data) })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : t('errorLogs.loadError')) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [id, t])

  const copyStackTrace = () => {
    navigator.clipboard.writeText(formatStackTrace(data?.stack_trace)).then(() => {
      notify(t('errorLogs.copiedToClipboard'), { type: 'success' })
    })
  }

  return (
    <BaseModal
      visible={true}
      onClose={onClose}
      title={<h6 className="mb-0">{t('errorLogs.modalTitle', { id })}</h6>}
      footer={<><div /><button className="btn btn-sm btn-secondary" onClick={onClose}>{t('common.close')}</button></>}
      storageKey="error-log-detail-modal"
      defaultWidth={1100}
      minWidth={700}
      maxWidth={1400}
      defaultHeight={700}
      minHeight={500}
      maxHeight={900}
    >
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" />
        </div>
      )}

      {!loading && error && <div className="alert alert-danger small">{error}</div>}

      {!loading && !error && data && (
        <div className="row g-3">
          {/* Основна інформація */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header bg-light py-2"><strong className="small">{t('errorLogs.basicInfo')}</strong></div>
              <div className="card-body p-2">
                <table className="table table-sm mb-0 small">
                  <tbody>
                    <tr><th style={{ width: '140px' }}>{t('errorLogs.idLabel')}</th><td>{data.id}</td></tr>
                    <tr>
                      <th>{t('errorLogs.levelLabel')}</th>
                      <td><span className={LEVEL_BADGE[data.level] ?? 'badge bg-secondary'}>{data.level}</span></td>
                    </tr>
                    <tr><th>{t('errorLogs.categoryLabel')}</th><td>{data.category || '—'}</td></tr>
                    <tr><th>{t('errorLogs.dateLabel')}</th><td>{data.created_at}</td></tr>
                    {data.user_id && (
                      <tr>
                        <th>{t('errorLogs.userLabel')}</th>
                        <td>
                          #{data.user_id}
                          {data.username && <span className="text-muted"> — {data.username}</span>}
                          {data.email && <span className="text-muted"> ({data.email})</span>}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* HTTP запит */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header bg-light py-2"><strong className="small">{t('errorLogs.httpRequest')}</strong></div>
              <div className="card-body p-2">
                <table className="table table-sm mb-0 small">
                  <tbody>
                    <tr><th style={{ width: '140px' }}>{t('analytics.urlLabel')}</th><td className="small">{data.url || '—'}</td></tr>
                    <tr>
                      <th>{t('errorLogs.methodLabel')}</th>
                      <td>{data.method ? <span className="badge bg-info">{data.method}</span> : '—'}</td>
                    </tr>
                    <tr><th>{t('analytics.ipLabel')}</th><td>{data.ip || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Повідомлення */}
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-light py-2"><strong className="small">{t('errorLogs.message')}</strong></div>
              <div className="card-body p-2">
                <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {data.message}
                </pre>
              </div>
            </div>
          </div>

          {/* Exception */}
          {data.exception_class && (
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-light py-2"><strong className="small">{t('errorLogs.exception')}</strong></div>
                <div className="card-body p-2">
                  <table className="table table-sm mb-0 small">
                    <tbody>
                      <tr><th style={{ width: '140px' }}>{t('errorLogs.classLabel')}</th><td><code>{data.exception_class}</code></td></tr>
                      {data.file && <tr><th>{t('errorLogs.fileLabel')}</th><td><code>{data.file}</code></td></tr>}
                      {data.line && <tr><th>{t('errorLogs.lineLabel')}</th><td><code>{data.line}</code></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Stack Trace */}
          {data.stack_trace && (
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                  <strong className="small">{t('errorLogs.stackTrace')}</strong>
                  <button className="btn btn-sm btn-outline-secondary" onClick={copyStackTrace}>
                    <i className="bi bi-clipboard" /> {t('errorLogs.copyButton')}
                  </button>
                </div>
                <div className="card-body p-2">
                  <pre
                    className="mb-0 small"
                    style={{ maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {formatStackTrace(data.stack_trace)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Контекст */}
          {data.context && (
            <div className="col-12">
              <div className="card">
                <div className="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                  <strong className="small">{t('errorLogs.contextLabel')}</strong>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setContextFormatted(v => !v)}
                  >
                    <i className="bi bi-code" /> {contextFormatted ? t('errorLogs.rawJson') : t('errorLogs.formatted')}
                  </button>
                </div>
                <div className="card-body p-2">
                  <pre
                    className="mb-0 small"
                    style={{ maxHeight: '300px', overflowY: 'auto', whiteSpace: contextFormatted ? undefined : 'pre-wrap' }}
                  >
                    {contextFormatted
                      ? JSON.stringify(data.context, null, 2)
                      : JSON.stringify(data.context)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  )
}
