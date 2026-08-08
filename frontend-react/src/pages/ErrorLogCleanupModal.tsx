import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiDelete } from '@/utils/api'

interface ErrorLogCleanupModalProps {
  onClose: () => void
  onCleaned: () => void
}

export default function ErrorLogCleanupModal({ onClose, onCleaned }: ErrorLogCleanupModalProps) {
  const { t } = useTranslation()
  const [days, setDays] = useState(90)
  const [cleaning, setCleaning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const doCleanup = async () => {
    setCleaning(true)
    setError('')
    setSuccess('')
    try {
      const res = await apiDelete('/admin/error-logs/cleanup', { days })
      setSuccess(res.message ?? t('errorLogs.cleanedDefault'))
      setTimeout(() => {
        onCleaned()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLogs.cleanupError'))
    } finally {
      setCleaning(false)
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '500px',
          width: '90vw',
          zIndex: 1050,
        }}
      >
        <div className="card shadow">
          <div className="card-header d-flex justify-content-between align-items-center px-4 py-3">
            <h6 className="mb-0">{t('errorLogs.cleanupTitle')}</h6>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
          </div>

          <div className="card-body px-4 py-3">
            <p className="mb-3">{t('errorLogs.deleteOlderThan')}</p>
            <div className="input-group">
              <input
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                type="number"
                className="form-control"
                min={1}
                max={365}
              />
              <span className="input-group-text">{t('errorLogs.daysUnit')}</span>
            </div>
            {error && <div className="alert alert-danger small mt-3 mb-0">{error}</div>}
            {success && <div className="alert alert-success small mt-3 mb-0">{success}</div>}
          </div>

          <div className="card-footer px-4 py-3 text-end bg-light">
            <button type="button" className="btn btn-sm btn-secondary me-2" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-sm btn-danger" disabled={cleaning} onClick={doCleanup}>
              {cleaning && <span className="spinner-border spinner-border-sm me-1" />}
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
