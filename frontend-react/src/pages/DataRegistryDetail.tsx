import { useState, useEffect } from 'react'
import BaseModal from '@/components/BaseModal'
import PhoneListInput from '@/components/PhoneListInput'
import DataRegistryPhotos from './DataRegistryPhotos'
import { useRemoteOptions, RecordNavigator } from '@/list-framework'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { apiPatch } from '@/utils/api'
import { normalizePhoneE164 } from '@/utils/phone'

interface DataRegistryDetailProps {
  /** Рядок таблиці — джерело даних картки, щоб список і картка не розходились */
  row: any
  initialTab?: string
  onClose: () => void
  /** Викликається після успішного збереження, щоб сторінка перезавантажила список */
  onSaved?: () => void
  /** Викликається при зміні вкладки, щоб синхронізувати з URL */
  onTabChange?: (tab: string) => void
  /** Навігація по записах */
  recordNav?: {
    position: number | null
    totalCount: number
    hasPrev: boolean
    hasNext: boolean
    busy: boolean
    goPrev: () => void
    goNext: () => void
  }
}

const STO_TYPES = [
  { value: 'service', label: 'СТО' },
  { value: 'tire', label: 'Шиномонтаж' },
  { value: 'wash', label: 'Автомийка' },
]

// Які поля належать якій вкладці — визначає, що саме відправляти при "Зберегти"
// (тільки поточна вкладка) проти "Зберегти та закрити" (усі вкладки одразу).
// Порожній масив = вкладка тільки для перегляду, кнопки збереження на ній сховані.
const TAB_FIELDS: Record<string, string[]> = {
  general: ['name_uk', 'sto_type', 'is_active'],
  contacts: ['address', 'phones'],
  description: ['description'],
  rating: ['rating'],
  country: ['country_id'],
  photos: [],
}

const TABS = [
  { key: 'general', label: 'Основна інформація', icon: 'bi-info-circle' },
  { key: 'contacts', label: 'Контактні дані', icon: 'bi-telephone' },
  { key: 'description', label: 'Опис та деталі', icon: 'bi-card-text' },
  { key: 'rating', label: 'Рейтинг та відгуки', icon: 'bi-star' },
  { key: 'country', label: 'Країна реєстрації', icon: 'bi-flag' },
  { key: 'photos', label: 'Фото', icon: 'bi-images' },
]

function formFromRow(row: any) {
  return {
    name_uk: row.name_uk ?? '',
    sto_type: row.sto_type ?? 'service',
    is_active: !!row.is_active,
    address: row.address ?? '',
    phones: row.phones ?? [],
    description: row.description ?? '',
    rating: row.rating ?? null,
    country_id: row.country_id ?? null,
  }
}

export default function DataRegistryDetail({
  row,
  initialTab = 'general',
  onClose,
  onSaved,
  onTabChange,
  recordNav,
}: DataRegistryDetailProps) {
  const [activeTab, setActiveTab] = useState(initialTab)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState(() => formFromRow(row))
  const [savedForm, setSavedForm] = useState(() => formFromRow(row))

  // Незбережені зміни: попередження і при закритті картки, і при закритті вкладки
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm)
  const { confirmClose } = useUnsavedChanges(isDirty)

  const handleClose = () => {
    if (confirmClose()) onClose()
  }

  // Той самий довідник, що й у фільтрі "Країна" — useRemoteOptions кешує за URL,
  // тому другого запиту до бекенду не буде.
  const { options: countryOptions } = useRemoteOptions('/admin/geography/countries', {
    valueKey: 'id',
    labelKey: 'name_uk',
  })

  useEffect(() => setActiveTab(initialTab), [initialTab])

  // Рядок змінився (інший запис або список перезавантажився) — переініціалізуємо форму
  useEffect(() => {
    setForm(formFromRow(row))
    setSavedForm(formFromRow(row))
  }, [row])

  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (close: boolean) => {
    setSaving(true)
    setSaveError('')

    const fields = close ? Object.values(TAB_FIELDS).flat() : TAB_FIELDS[activeTab]
    const payload: Record<string, any> = {}
    for (const f of fields) {
      payload[f] = f === 'phones'
        ? (form.phones as string[]).map(normalizePhoneE164).filter(p => p)
        : (form as any)[f]
    }

    try {
      await apiPatch(`/admin/sto/${row.id}`, payload)

      // Оновлюємо форму з нормалізованими даними (особливо phones в E.164)
      const updatedForm = payload.phones ? { ...form, phones: payload.phones } : form
      setForm(updatedForm)
      setSavedForm(updatedForm) // збережене стало новою точкою відліку для "змінено"
      onSaved?.()
      if (close) onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const title = (
    <div className="d-flex align-items-center w-100">
      <h5 className="mb-0 flex-grow-1">
        СТО <span className="text-muted fw-normal fs-6">#{row.id}</span>
        {form.name_uk && (
          <span className="text-primary fw-normal fs-6 ms-2">{form.name_uk}</span>
        )}
      </h5>
      {recordNav && (
        <RecordNavigator
          position={recordNav.position}
          totalCount={recordNav.totalCount}
          hasPrev={recordNav.hasPrev}
          hasNext={recordNav.hasNext}
          busy={recordNav.busy}
          onPrev={recordNav.goPrev}
          onNext={recordNav.goNext}
        />
      )}
    </div>
  )

  const subheader = (
    <ul className="nav nav-tabs border-0">
      {TABS.map(tab => (
        <li key={tab.key} className="nav-item">
          <button
            className={`nav-link py-2 px-2 small text-nowrap ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <i className={`bi ${tab.icon} me-1`} />
            {tab.label}
          </button>
        </li>
      ))}
    </ul>
  )

  const footer = TAB_FIELDS[activeTab]?.length ? (
    <>
      <div></div>
      <div className="d-flex gap-2">
        <button className="btn btn-secondary btn-sm" onClick={handleClose}>Закрити</button>
        <button className="btn btn-outline-primary btn-sm" disabled={saving} onClick={() => handleSave(false)}>
          {saving && <span className="spinner-border spinner-border-sm me-1" />}Зберегти
        </button>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => handleSave(true)}>
          {saving && <span className="spinner-border spinner-border-sm me-1" />}Зберегти та закрити
        </button>
      </div>
    </>
  ) : (
    <>
      <div></div>
      <button className="btn btn-secondary btn-sm" onClick={handleClose}>Закрити</button>
    </>
  )

  return (
    <BaseModal
      visible={true}
      onClose={handleClose}
      title={title}
      subheader={subheader}
      footer={footer}
      storageKey="sto-registry-detail"
      defaultWidth={700}
      minWidth={480}
      maxWidth={1000}
      defaultHeight={520}
      minHeight={380}
      maxHeight={800}
      closeOnBackdrop={false}
    >
      {saveError && <div className="alert alert-danger py-2 small">{saveError}</div>}

      {/* ── Основна інформація ─────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <>
          <div className="row g-3">
            <div className="col-sm-8">
              <label className="form-label small mb-1">Назва</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={form.name_uk}
                onChange={(e) => updateForm('name_uk', e.target.value)}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label small mb-1">Тип</label>
              <select
                className="form-select form-select-sm"
                value={form.sto_type}
                onChange={(e) => updateForm('sto_type', e.target.value)}
              >
                {STO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <div className="form-check form-switch">
              <input
                id="sto-active-switch"
                type="checkbox"
                className="form-check-input"
                role="switch"
                checked={form.is_active}
                onChange={(e) => updateForm('is_active', e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="sto-active-switch">
                {form.is_active ? 'Активне' : 'Неактивне'}
              </label>
            </div>
          </div>
        </>
      )}

      {/* ── Контактні дані ─────────────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <>
          <div className="mb-3">
            <label className="form-label small mb-1">Адреса</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={form.address}
              onChange={(e) => updateForm('address', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small mb-1">Телефони</label>
            <PhoneListInput
              value={form.phones}
              onChange={(phones) => updateForm('phones', phones)}
            />
          </div>
        </>
      )}

      {/* ── Опис та деталі ─────────────────────────────────────────────── */}
      {activeTab === 'description' && (
        <>
          <label className="form-label small mb-1">Опис</label>
          <textarea
            className="form-control form-control-sm"
            rows={7}
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
          />
        </>
      )}

      {/* ── Рейтинг ────────────────────────────────────────────────────── */}
      {activeTab === 'rating' && (
        <>
          <div className="text-muted small mb-2">
            Зазвичай рейтинг розраховується з відгуків користувачів — тут його можна задати вручну.
          </div>
          <label className="form-label small mb-1">Рейтинг</label>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-star-fill text-warning fs-5" />
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: '100px' }}
              min={0}
              max={5}
              step={0.05}
              value={form.rating ?? ''}
              onChange={(e) => updateForm('rating', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div className="text-muted small mt-1">Від 0 до 5</div>
        </>
      )}

      {/* ── Країна реєстрації ──────────────────────────────────────────── */}
      {activeTab === 'country' && (
        <>
          <label className="form-label small mb-1">Країна реєстрації</label>
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: '300px' }}
            value={form.country_id ?? ''}
            onChange={(e) => updateForm('country_id', e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">— Оберіть країну —</option>
            {countryOptions.map(c => (
              <option key={String(c.value)} value={c.value}>{c.label}</option>
            ))}
          </select>
        </>
      )}

      {/* ── Фото ───────────────────────────────────────────────────────── */}
      {activeTab === 'photos' && <DataRegistryPhotos stoId={row.id} />}
    </BaseModal>
  )
}
