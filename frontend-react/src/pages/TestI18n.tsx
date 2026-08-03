import { useTranslation } from 'react-i18next'
import { availableLocales } from '@/locales'

export default function TestI18n() {
  const { t, i18n } = useTranslation()

  return (
    <div className="container-fluid">
      <h5 className="mb-4">{t('language.selectLanguage')} — i18n тест</h5>

      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Common translations</h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <button className="btn btn-primary w-100">{t('common.save')}</button>
            </div>
            <div className="col-md-3">
              <button className="btn btn-secondary w-100">{t('common.cancel')}</button>
            </div>
            <div className="col-md-3">
              <button className="btn btn-danger w-100">{t('common.delete')}</button>
            </div>
            <div className="col-md-3">
              <button className="btn btn-success w-100">{t('common.create')}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">{t('nav.dashboard')}</h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>{t('table.id')}</th>
                  <th>{t('table.name')}</th>
                  <th>{t('table.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Test record</td>
                  <td><span className="badge bg-success">{t('common.active')}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1">{t('common.edit')}</button>
                    <button className="btn btn-sm btn-outline-danger">{t('common.delete')}</button>
                  </td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Another record</td>
                  <td><span className="badge bg-secondary">{t('common.inactive')}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1">{t('common.edit')}</button>
                    <button className="btn btn-sm btn-outline-danger">{t('common.delete')}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">{t('filters.savedFilters')}</h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">{t('filters.filterName')}</label>
              <input type="text" className="form-control" placeholder={t('filters.filterName')} />
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-primary">{t('filters.saveFilter')}</button>
              <button className="btn btn-outline-secondary">{t('filters.resetFilters')}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Messages</h6>
        </div>
        <div className="card-body">
          <div className="alert alert-success">{t('messages.saved')}</div>
          <div className="alert alert-danger">{t('messages.error')}</div>
          <div className="alert alert-warning">{t('messages.unsavedChanges')}</div>
        </div>
      </div>

      <div className="mt-4">
        <p><strong>Current locale:</strong> {i18n.language}</p>
        <p><strong>Available locales:</strong> {availableLocales.map(l => l.name).join(', ')}</p>
      </div>
    </div>
  )
}
