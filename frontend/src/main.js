import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/theme.css'
import App from './App.vue'
import router from './router'
import { installAuthRedirect } from './utils/authInterceptor'
import { messages } from './locales'

installAuthRedirect(router)

// i18n setup
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

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'uk',
  messages,
})

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
