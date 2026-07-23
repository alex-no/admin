// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { useAuth } from '@/composables/useAuth'

/**
 * Перехоплює 401 з будь-якого fetch-запиту (крім самого логіну) — чистить
 * токен і перекидає на сторінку логіну, замість того щоб сторінка показувала
 * сирий "Unauthorized" з тіла відповіді бекенду.
 *
 * Актуально й тому, що бекенд тут фейковий (SQLite скидається при кожному
 * рестарті контейнера) — старий токен у localStorage браузера переживає
 * рестарт бекенду, а сесія на бекенді вже ні.
 */
export function installAuthRedirect(router) {
  const auth = useAuth()
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (...args) => {
    const response = await originalFetch(...args)

    if (response.status === 401) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '')
      const isLoginRequest = url.includes('/api/admin/auth/login')

      if (!isLoginRequest && router.currentRoute.value.name !== 'Login') {
        auth.logout()
        router.push({ name: 'Login', query: { message: 'Сесія завершилась. Увійдіть знову.' } })
      }
    }

    return response
  }
}
