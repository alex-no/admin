import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { apiGet, apiPost } from '@/utils/api'
import type { User, LoginResponse } from '@/types'
import { hasPermission } from '@core/permissions'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'))
  // Поки тягнемо профіль — застосунок не рендериться, інакше на мить блимне
  // меню з пунктами, на які прав немає.
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(localStorage.getItem('admin_token')))

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setUser(null)
  }, [])

  // Профіль із правами при старті (сторінку могли перезавантажити з валідним токеном)
  useEffect(() => {
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }
    if (user) return // вже маємо — після login()

    let alive = true
    setIsLoading(true)

    apiGet('/admin/auth/me')
      .then(res => { if (alive) setUser(res.user) })
      .catch(() => { if (alive) logout() })
      .finally(() => { if (alive) setIsLoading(false) })

    return () => { alive = false }
  }, [token, user, logout])

  // Install 401 interceptor
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        // args[0] — RequestInfo | URL: рядок, URL або Request, у кожного свій спосіб дістати адресу
        const input = args[0]
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        const isLoginRequest = url.includes('/api/admin/auth/login')

        if (!isLoginRequest) {
          logout()
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [logout])

  const login = async (username: string, password: string) => {
    const response = await apiPost<LoginResponse>('/admin/auth/login', { username, password })

    if (response.status === 'success' && response.token) {
      localStorage.setItem('admin_token', response.token)
      setToken(response.token)
      if (response.user) setUser(response.user)
    } else {
      throw new Error(response.message || 'Login failed')
    }
  }

  const can = useCallback((permission: string): boolean => {
    return hasPermission(user?.permissions, permission)
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
