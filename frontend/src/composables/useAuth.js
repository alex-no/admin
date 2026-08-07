import { ref } from 'vue'
import { hasPermission } from '@core/permissions'

const TOKEN_KEY = 'admin_token'
const user = ref(null)

// No backend yet: accept any credentials and skip server-side session checks.
// Set VITE_MOCK_AUTH=false once a real /api/admin/auth backend is wired up.
const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH !== 'false'

export function useAuth() {
  function getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  function isAuthenticated() {
    return !!getToken()
  }

  async function login(username, password) {
    if (MOCK_AUTH) {
      localStorage.setItem(TOKEN_KEY, 'mock-token')
      user.value = { username, name: username, permissions: ['*'] }
      return user.value
    }
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const json = await res.json()

    // Handle password setup required (first login)
    if (json.status === 'password_setup_required') {
      return { needsPasswordSetup: true, userId: json.user_id, message: json.message }
    }

    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message ?? 'Login failed')
    }
    localStorage.setItem(TOKEN_KEY, json.token)
    user.value = json.user
    return json.user
  }

  async function fetchMe() {
    const token = getToken()
    if (!token) return null
    if (MOCK_AUTH) {
      if (!user.value) {
        user.value = { username: 'admin', name: 'admin', permissions: ['*'] }
      }
      return user.value
    }
    try {
      const res  = await fetch('/api/admin/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.status === 'success') {
        user.value = json.user
        return json.user
      }
    } catch {}
    logout()
    return null
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    user.value = null
  }

  function can(permission) {
    return hasPermission(user.value?.permissions, permission)
  }

  function authHeaders() {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return { user, getToken, isAuthenticated, login, fetchMe, logout, authHeaders, can }
}
