import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '@/utils/api'
import type { User, LoginResponse } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read token synchronously on init
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token')
  })
  const [isLoading, setIsLoading] = useState(false)

  // No useEffect needed for initial token read anymore

  // Install 401 interceptor
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url ?? '')
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
  }, [])

  const login = async (username: string, password: string) => {
    const response = await apiPost<LoginResponse>('/admin/auth/login', {
      username,
      password,
    })

    if (response.status === 'success' && response.token) {
      localStorage.setItem('admin_token', response.token)
      setToken(response.token)
      // TODO: fetch user data
    } else {
      throw new Error(response.message || 'Login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isLoading,
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
