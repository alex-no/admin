import { createI18n } from 'vue-i18n'
import { messages } from '@locales'

function getInitialLocale() {
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

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'uk',
  messages,
  globalInjection: true, // Make $t available globally
})
