import { ref } from 'vue'

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
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()

      console.log('Auth response:', json) // DEBUG
      console.log('Response status:', json.status) // DEBUG

      // Handle password setup required (first login)
      if (json.status === 'password_setup_required') {
        console.log('Password setup needed! Returning object with needsPasswordSetup=true') // DEBUG
        return { needsPasswordSetup: true, userId: json.user_id, message: json.message }
      }

      if (!res.ok || json.status !== 'success') {
        console.log('Login failed, throwing error') // DEBUG
        throw new Error(json.message ?? 'Login failed')
      }
      localStorage.setItem(TOKEN_KEY, json.token)
      user.value = json.user
      return json.user
    } catch (err) {
      console.error('Login exception:', err) // DEBUG
      throw err
    }
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
    const perms = user.value?.permissions ?? []
    for (const p of perms) {
      if (p === '*' || p === permission) return true
      if (p.endsWith('.*') && permission.startsWith(p.slice(0, -2) + '.')) return true
    }
    return false
  }

  function authHeaders() {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return { user, getToken, isAuthenticated, login, fetchMe, logout, authHeaders, can }
}
