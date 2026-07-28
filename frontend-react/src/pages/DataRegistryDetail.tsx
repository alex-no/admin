import React, { useState, useEffect } from 'react'
import BaseModal from '@/components/BaseModal'
import { apiGet } from '@/utils/api'

interface DataRegistryDetailProps {
  id: number
  onClose: () => void
}

const STO_TYPES = [
  { value: 'service', label: 'Автосервіс' },
  { value: 'dealer', label: 'Дилер' },
  { value: 'tire', label: 'Шиномонтаж' },
  { value: 'wash', label: 'Автомийка' },
  { value: 'parts', label: 'Запчастини' },
]

export default function DataRegistryDetail({ id, onClose }: DataRegistryDetailProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    apiGet(`/admin/sto/${id}`)
      .then(response => {
        setData(response.data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [id])

  const stoType = data ? STO_TYPES.find(t => t.value === data.sto_type)?.label ?? data.sto_type : ''

  const title = (
    <h5 className="mb-0">
      Редагування СТО{' '}
      <span className="text-muted fw-normal fs-6">#{id}</span>
      {data?.name_uk && (
        <span className="text-primary fw-normal fs-6 ms-2">
          {data.name_uk}
        </span>
      )}
    </h5>
  )

  const subheader = (
    <ul className="nav nav-tabs border-0">
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <i className="bi bi-info-circle me-1" />
          Основне
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'vehicle-types' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicle-types')}
        >
          <i className="bi bi-truck me-1" />
          Типи ТС
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <i className="bi bi-wrench me-1" />
          Послуги
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'amenities' ? 'active' : ''}`}
          onClick={() => setActiveTab('amenities')}
        >
          <i className="bi bi-stars me-1" />
          Зручності
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'address' ? 'active' : ''}`}
          onClick={() => setActiveTab('address')}
        >
          <i className="bi bi-geo-alt me-1" />
          Адреса
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          <i className="bi bi-images me-1" />
          Фото
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <i className="bi bi-people me-1" />
          Співробітники
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <i className="bi bi-calendar-check me-1" />
          Записи
        </button>
      </li>
      <li className="nav-item">
        <button
          className={`nav-link py-2 px-2 small text-nowrap ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <i className="bi bi-star me-1" />
          Відгуки
        </button>
      </li>
    </ul>
  )

  const footer = (
    <>
      <div className="text-muted small">IP: {data?.ip || '—'}</div>
      <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
        Закрити
      </button>
    </>
  )

  return (
    <BaseModal
      visible={true}
      onClose={onClose}
      title={title}
      subheader={subheader}
      footer={footer}
      storageKey="sto-edit-modal"
      defaultWidth={1100}
      minWidth={800}
      maxWidth={1400}
      defaultHeight={600}
      minHeight={400}
      maxHeight={900}
      closeOnBackdrop={false}
    >
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && !data && (
        <div className="alert alert-danger">Не вдалося завантажити дані</div>
      )}

      {!loading && data && (
        <>
          {activeTab === 'general' && (
            <div>
              <div className="row g-3 mb-3">
                <div className="col-sm-4">
                  <label className="form-label small mb-1">Тип СТО</label>
                  <div className="form-control form-control-sm bg-light">{stoType}</div>
                </div>
                <div className="col-sm-2">
                  <label className="form-label small mb-1">Статус</label>
                  <div>
                    <span className={`badge ${data.is_active ? 'bg-success' : 'bg-danger'}`}>
                      {data.is_active ? 'Активне' : 'Неактивне'}
                    </span>
                  </div>
                </div>
                <div className="col-sm-2">
                  <label className="form-label small mb-1">Рейтинг</label>
                  <div className="form-control form-control-sm bg-light">
                    {data.rating ? (
                      <>
                        <i className="bi bi-star-fill text-warning me-1" style={{ fontSize: '.7rem' }} />
                        {Number(data.rating).toFixed(2)}
                      </>
                    ) : '—'}
                  </div>
                </div>
                <div className="col-sm-4">
                  <label className="form-label small mb-1">Країна</label>
                  <div className="form-control form-control-sm bg-light">ID: {data.country_id}</div>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-12">
                  <label className="form-label small mb-1">Назва (UK)</label>
                  <div className="form-control form-control-sm bg-light">{data.name_uk || '—'}</div>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">Адреса</label>
                <div className="form-control form-control-sm bg-light">{data.address || '—'}</div>
              </div>

              <div className="mb-3">
                <label className="form-label small mb-1">Опис</label>
                <div className="form-control form-control-sm bg-light" style={{ minHeight: '60px' }}>
                  {data.description || '—'}
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-sm-12">
                  <label className="form-label small mb-1">Телефони</label>
                  <div className="form-control form-control-sm bg-light">
                    {data.phones?.length > 0 ? data.phones.join(', ') : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicle-types' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Типи ТС" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'services' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Послуги" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'amenities' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Зручності" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'address' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Адреса" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Фото" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Співробітники" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Записи" буде реалізовано пізніше
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2" />
              Розділ "Відгуки" буде реалізовано пізніше
            </div>
          )}
        </>
      )}
    </BaseModal>
  )
}
