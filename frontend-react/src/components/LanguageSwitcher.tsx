import { useTranslation } from 'react-i18next'
import { availableLocales } from '@/locales'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  const currentLocaleName = availableLocales.find(l => l.code === i18n.language)?.name || 'UK'

  function changeLocale(newLocale: string) {
    i18n.changeLanguage(newLocale)
    localStorage.setItem('admin.locale', newLocale)
    document.documentElement.lang = newLocale
  }

  return (
    <div className="dropdown">
      <button
        className="btn btn-sm btn-link text-decoration-none dropdown-toggle"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title={t('language.selectLanguage')}
      >
        <i className="bi bi-translate me-1"></i>
        {currentLocaleName}
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        {availableLocales.map(loc => (
          <li key={loc.code}>
            <a
              className={`dropdown-item ${i18n.language === loc.code ? 'active' : ''}`}
              href="#"
              onClick={(e) => {
                e.preventDefault()
                changeLocale(loc.code)
              }}
            >
              {loc.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
