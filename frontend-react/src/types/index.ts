export interface User {
  id: number
  username: string
  email: string
  role: string
  permissions: string[]
}

export interface LoginResponse {
  status: 'success' | 'error'
  token?: string
  message?: string
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error'
  data?: T
  message?: string
}

export interface PaginatedResponse<T> {
  status: 'success'
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface STO {
  id: number
  name_uk: string
  name_ru?: string
  sto_type: string
  address?: string
  main_phone?: string
  rating?: number
  is_active: boolean
  created_at: string
  updated_at?: string
}
