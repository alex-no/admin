import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/theme.css'
import App from './App.vue'
import router from './router'
import { installAuthRedirect } from './utils/authInterceptor'
import { i18n } from './i18n'

installAuthRedirect(router)

// Set initial document language
document.documentElement.lang = i18n.global.locale.value

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
