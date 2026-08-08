import { useTranslation } from 'react-i18next'

export default function ApiDocsAdmin() {
  const { t } = useTranslation()
  const swaggerUrl = `${window.location.origin}/api/admin/doc`

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-book me-2" />
          {t('apiDocsAdmin.title')}
        </h5>
        <span className="badge bg-warning text-dark">{t('apiDocsAdmin.devOnly')}</span>
      </div>
      <div className="card-body p-0">
        <iframe
          src={swaggerUrl}
          style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none' }}
          title={t('apiDocsAdmin.title')}
        />
      </div>
    </div>
  )
}
