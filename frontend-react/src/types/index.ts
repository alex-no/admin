/** Те, що реально віддає /api/admin/auth/login і /api/admin/auth/me */
export interface User {
  id: number
  username: string
  name: string
  group: string
  permissions: string[]
}

export interface LoginResponse {
  status: 'success' | 'error'
  token?: string
  user?: User
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
