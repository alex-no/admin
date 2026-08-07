import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { messages } from '@locales'

function getInitialLocale(): string {
  try {
    const stored = localStorage.getItem('admin.locale')
    if (stored && ['uk', 'en', 'ru'].includes(stored)) {
      return stored
    }
  } catch {
    // ignore
  }
  return 'uk'
}

// react-i18next expects resources in format: { lang: { translation: {...} } }
const resources = {
  uk: { translation: messages.uk },
  en: { translation: messages.en },
  ru: { translation: messages.ru },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: 'uk',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  })

export default i18n
