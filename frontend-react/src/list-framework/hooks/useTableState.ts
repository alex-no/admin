import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/utils/api'
import type { SortItem, FilterConfig, PaginatedResponse } from '../types'

interface UseTableStateOptions {
  apiList: string
  filterConfig?: FilterConfig[]
  defaultPerPage?: number
  rowKey?: string
}

export function useTableState({
  apiList,
  filterConfig = [],
  defaultPerPage = 50,
  rowKey = 'id',
}: UseTableStateOptions) {
  // Separate state for each concern
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(defaultPerPage)
  const [totalPages, setTotalPages] = useState(0)
  const [sortItems, setSortItems] = useState<SortItem[]>([])
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<(string | number)[]>([])

  // Initialize filters from config (only once)
  useEffect(() => {
    const initialFilters: Record<string, any> = {}
    for (const f of filterConfig) {
      initialFilters[f.key] = f.default ?? (f.type === 'checkbox' ? false : '')
    }
    setFilters(initialFilters)
  }, []) // Empty deps - run once

  // Load data from API
  const load = useCallback(async (pageOverride?: number) => {
    setLoading(true)
    setError('')

    // Capture current values - don't use from closure
    const params = new URLSearchParams()

    // Use ref values or pass them explicitly
    params.append('page', String(pageOverride ?? page))
    params.append('per_page', String(perPage))

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, String(value))
      }
    })

    // Add sort (Vue admin format: separate sort_by and sort_dir)
    if (sortItems.length > 0) {
      params.append('sort_by', sortItems.map(s => s.key).join(','))
      params.append('sort_dir', sortItems.map(s => s.dir).join(','))
    }

    const url = `${apiList}?${params.toString()}`

    try {
      const response = await apiGet<PaginatedResponse<any>>(url)

      setItems(response.data)
      setTotal(response.pagination.total)
      setTotalPages(response.pagination.total_pages)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
      setLoading(false)
    }
  }, [apiList]) // ONLY apiList in deps

  // Toggle sort
  const toggleSort = useCallback((key: string, ctrlKey = false) => {
    setSortItems(prev => {
      let newSortItems: SortItem[]

      if (ctrlKey) {
        const existing = prev.find(s => s.key === key)
        if (existing) {
          if (existing.dir === 'asc') {
            newSortItems = prev.map(s =>
              s.key === key ? { ...s, dir: 'desc' as const } : s
            )
          } else {
            newSortItems = prev.filter(s => s.key !== key)
          }
        } else {
          newSortItems = [...prev, { key, dir: 'asc' }]
        }
      } else {
        const existing = prev.find(s => s.key === key)
        if (existing && existing.dir === 'asc') {
          newSortItems = [{ key, dir: 'desc' }]
        } else if (existing && existing.dir === 'desc') {
          newSortItems = []
        } else {
          newSortItems = [{ key, dir: 'asc' }]
        }
      }

      return newSortItems
    })
  }, [])

  // Set filter value
  const setFilter = useCallback((key: string, value: any) => {
    setFilters(prev => {
      // Don't update if value hasn't changed
      if (prev[key] === value) {
        return prev // Return same object reference!
      }
      return { ...prev, [key]: value }
    })
    setPage(1) // Reset to first page when filter changes
  }, [])

  // Set per page
  const handleSetPerPage = useCallback((newPerPage: number) => {
    setPerPage(newPerPage)
    setPage(1)
  }, [])

  // Toggle selection
  const toggleSelect = useCallback((id: string | number) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }, [])

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    setSelected(prev => {
      const allIds = items.map(item => item[rowKey])
      const allSelected = allIds.every(id => prev.includes(id))
      return allSelected ? [] : allIds
    })
  }, [items, rowKey])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelected([])
  }, [])

  // Load on filters/sort/perPage/page change
  useEffect(() => {
    // Don't load if filters not initialized yet
    if (Object.keys(filters).length === 0) {
      return
    }

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    })

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, String(value))
      }
    })

    // Add sort (Vue admin format: separate sort_by and sort_dir)
    if (sortItems.length > 0) {
      params.append('sort_by', sortItems.map(s => s.key).join(','))
      params.append('sort_dir', sortItems.map(s => s.dir).join(','))
    }

    const url = `${apiList}?${params.toString()}`

    setLoading(true)
    setError('')

    apiGet<PaginatedResponse<any>>(url)
      .then(response => {
        setItems(response.data)
        setTotal(response.pagination.total)
        setTotalPages(response.pagination.total_pages)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Помилка завантаження')
        setLoading(false)
      })
  }, [filters, sortItems, perPage, page, apiList])

  return {
    items,
    total,
    loading,
    error,
    page,
    perPage,
    totalPages,
    sortItems,
    filters,
    selected,
    load,
    toggleSort,
    setFilter,
    setPage,
    setPerPage: handleSetPerPage,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  }
}
