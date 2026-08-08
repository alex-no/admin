// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { useAuth } from '@/composables/useAuth'
import { i18n } from '@/i18n'

/**
 * Перехоплює 401 з будь-якого fetch-запиту — чистить токен і перекидає на
 * сторінку логіну, замість того щоб сторінка показувала сирий "Unauthorized"
 * з тіла відповіді бекенду.
 *
 * Потрібен тому, що router.beforeEach перевіряє лише *наявність* токена в
 * localStorage, а не його дійсність: після протермінування адмін лишається на
 * сторінці, кожен запит валиться в 401, і жоден редирект не спрацьовує.
 *
 * Два виключення, обидва обовʼязкові:
 * - сам запит логіну — інакше невірний пароль давав би редирект на логін
 *   замість повідомлення про помилку;
 * - публічні сторінки (`meta.public`: Login, FirstLogin, ForgotPassword,
 *   SetPassword) — вони працюють без токена й самі звертаються до
 *   /api/admin/auth/*, тому 401 там очікуваний і не має нікуди перекидати.
 */
export function installAuthRedirect(router) {
  const auth = useAuth()
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const response = await originalFetch(...args)

    if (response.status === 401) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '')
      const isLoginRequest = url.includes('/api/admin/auth/login')

      if (!isLoginRequest && !router.currentRoute.value.meta?.public) {
        auth.logout()
        router.push({ name: 'Login', query: { message: i18n.global.t('auth.sessionExpiredMessage') } })
      }
    }

    return response
  }
}
