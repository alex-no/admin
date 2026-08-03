import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, apiPatch, apiPost, apiDelete as apiDeleteRequest } from '@/utils/api'
import { notify } from '@/hooks/useNotify'
import { useUndoableMutation } from '@/hooks/useUndoableMutation'
import { useListPolling } from '@/hooks/useListPolling'
import { getCached, setCached } from './useListCache'
import { fetchOptions } from './useRemoteOptions'
import { useRowSelection } from './useRowSelection'
import { rowsToCsv, downloadCsv } from '@/utils/csv'
import { formatPhoneUA, normalizePhoneE164 } from '@/utils/phone'
import {
  useUrlFilters,
  readFiltersFromUrl,
  readMultiSortFromUrl,
} from '@/hooks/useUrlFilters'
import type { SortItem, FilterConfig, ColumnConfig, Option, PaginatedResponse } from '../types'

const EXPORT_PAGE_SIZE = 500
const EXPORT_MAX_ROWS = 20000

/**
 * Значення для CSV: коди замінюємо на те, що користувач бачить у таблиці.
 * remoteOptions — довідники select-колонок з optionsUrl, підвантажені заздалегідь.
 */
function formatForExport(
  col: ColumnConfig,
  row: any,
  remoteOptions: Map<string, Option[]>
): any {
  const value = row[col.key]

  if (col.type === 'boolean') {
    return value ? (col.trueLabel ?? 'Так') : (col.falseLabel ?? 'Ні')
  }
  if (col.type === 'phone-list') {
    return (value ?? []).map(formatPhoneUA).join(', ')
  }
  if (col.type === 'select') {
    const options = col.optionsUrl ? (remoteOptions.get(col.key) ?? []) : (col.options ?? [])
    const found = options.find(o => String(o.value) === String(value))
    return found ? found.label : (value ?? '')
  }
  return value ?? ''
}

interface UseTableStateOptions {
  apiList: string
  apiUpdate?: string
  apiDelete?: string
  /** Роут іменованих масових дій: POST { ids, action } */
  apiBulk?: string
  filterConfig?: FilterConfig[]
  defaultPerPage?: number
  defaultSort?: SortItem[]
  rowKey?: string
  /** Рядок успішно змінено інлайн — щоб сторінка могла оновити відкриту картку */
  onRowUpdated?: (row: any) => void
}

export function useTableState({
  apiList,
  apiUpdate,
  apiDelete,
  apiBulk,
  filterConfig = [],
  defaultPerPage = 50,
  defaultSort = [],
  rowKey = 'id',
  onRowUpdated,
}: UseTableStateOptions) {
  const { deleteWithUndo, deleteManyWithUndo, updateWithUndo } = useUndoableMutation()

  // Separate state for each concern
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Сторінка, сортування та фільтри піднімаються з URL — щоб посилання на список
  // з конкретним фільтром/сторінкою можна було зберегти або переслати.
  const [page, setPage] = useState(() => readFiltersFromUrl({ page: 1 }).page)
  const [perPage, setPerPage] = useState(defaultPerPage)
  const [totalPages, setTotalPages] = useState(0)
  const [sortItems, setSortItems] = useState<SortItem[]>(() => {
    // URL має пріоритет над defaultSort — посилання відтворює побачене
    const fromUrl = readMultiSortFromUrl() as SortItem[]
    return fromUrl.length ? fromUrl : defaultSort.map(s => ({ ...s }))
  })
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [reloadToken, setReloadToken] = useState(0)
  const [revalidating, setRevalidating] = useState(false)
  // Фільтри з `defaultFirstOption`, які вже підставили своє значення (одноразово)
  const firstOptionApplied = useRef<Set<string>>(new Set())
  const [bulkApplying, setBulkApplying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [enablePolling, setEnablePolling] = useState(() => {
    try {
      const stored = localStorage.getItem(`admin.polling:${apiList}`)
      return stored !== null ? JSON.parse(stored) : true
    } catch {
      return true
    }
  })

  // Persist polling preference
  useEffect(() => {
    localStorage.setItem(`admin.polling:${apiList}`, JSON.stringify(enablePolling))
  }, [enablePolling, apiList])

  // Initialize filters from config (only once), overriding with values from URL
  useEffect(() => {
    const initialFilters: Record<string, any> = {}
    for (const f of filterConfig) {
      initialFilters[f.key] = f.default ?? (f.type === 'checkbox' ? false : '')
    }
    setFilters(readFiltersFromUrl(initialFilters))
  }, []) // Empty deps - run once

  useUrlFilters({
    filters: { ...filters, page: page > 1 ? page : '' },
    multiSort: sortItems,
  })

  // Bulk selection (react-admin: bulk selection + SelectAllButton)
  // Виділення рядків: явний список id або selectAllMatching ("всі за фільтром").
  // Скидається автоматично при зміні фільтрів/сортування/per_page.
  const {
    selectedIds,
    selectAllMatching,
    selectedCount,
    allOnPageSelected,
    canSelectAllMatching,
    clear: clearRowSelection,
    toggleSelectAll,
    toggleSelectRow,
    selectAllMatchingOn,
  } = useRowSelection({
    items,
    total,
    resetOn: [filters, sortItems, perPage],
  })

  // Примусове перезавантаження списку (аналог listRef.reload() у Vue):
  // просто інкрементимо токен, який входить у deps ефекту завантаження нижче,
  // щоб не дублювати логіку запиту другою копією.
  const reload = useCallback(() => setReloadToken(t => t + 1), [])

  // Revalidate (для polling, без спінера, обходить кеш)
  const revalidate = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    })

    for (const f of filterConfig) {
      const value = filters[f.key]
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        params.set(f.param ?? f.key, String(value))
      }
    }
    for (const [key, value] of Object.entries(filters)) {
      if (filterConfig.some(f => f.key === key)) continue
      if (value !== '' && value !== null && value !== undefined) {
        params.set(key, String(value))
      }
    }

    if (sortItems.length > 0) {
      params.append('sort_by', sortItems.map(s => s.key).join(','))
      params.append('sort_dir', sortItems.map(s => s.dir).join(','))
    }

    const url = `${apiList}?${params.toString()}`

    try {
      const response = await apiGet<PaginatedResponse<any>>(url)
      setCached(url, response)
      setItems(response.data)
      setTotal(response.pagination.total)
      setTotalPages(response.pagination.total_pages)
    } catch {
      // Тиха помилка: polling не мусить лякати адміна тостами
    }
  }, [filters, sortItems, perPage, page, apiList, filterConfig])

  // Live updates (Task 12: автооновлення списку через polling)
  const { hasPending } = useUndoableMutation()
  const pausePolling = hasPending()

  useListPolling({
    revalidate,
    intervalMs: 60000, // 1 хвилина
    paused: pausePolling,
    enabled: enablePolling,
  })

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

  // Inline cell edit: undoable mutation — зміна з'являється одразу,
  // реальний PATCH — через UNDO_DELETE_DELAY, весь цей час доступне "Скасувати".
  const updateCell = useCallback((row: any, field: ColumnConfig, value: any) => {
    // Нормалізація phone-list перед збереженням: прибираємо форматування, залишаємо
    // тільки E.164 ("+380..."). Дзеркало Vue: DataListPage.vue → handleCellUpdate.
    let normalized = value
    if (field.type === 'phone-list') {
      normalized = (value ?? []).map(normalizePhoneE164).filter((p: string) => p)
    }

    if (!apiUpdate) {
      setItems(items => items.map(r => (r[rowKey] === row[rowKey] ? { ...r, [field.key]: normalized } : r)))
      return
    }

    const id = row[rowKey]
    const prev = row[field.key]
    const label = field.label || field.key

    const url = apiUpdate.includes('{id}')
      ? apiUpdate.replace('{id}', String(id))
      : `${apiUpdate}/${id}`

    updateWithUndo({
      key: `${id}:${field.key}`,
      message: `«${label}»: ${prev} → ${normalized}`,
      apply: () => {
        setItems(items => items.map(r => (r[rowKey] === id ? { ...r, [field.key]: normalized } : r)))
      },
      revert: () => {
        setItems(items => items.map(r => (r[rowKey] === id ? { ...r, [field.key]: prev } : r)))
      },
      commit: async () => {
        await apiPatch(url, { [field.key]: normalized })
        onRowUpdated?.({ ...row, [field.key]: normalized })
      },
      commitSync: () => {
        fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field.key]: normalized }),
          keepalive: true,
        })
      },
      onCommitError: () => {
        setItems(items => items.map(r => (r[rowKey] === id ? { ...r, [field.key]: prev } : r)))
      },
    })
  }, [apiUpdate, rowKey, onRowUpdated, updateWithUndo])

  // Load on filters/sort/perPage/page change
  useEffect(() => {
    // Don't load if filters not initialized yet
    if (Object.keys(filters).length === 0) {
      return
    }

    // Обовʼязковий фільтр (`required: true`) ще порожній — варіанти довідника
    // вантажаться. Запит без нього показав би чужі рядки, які через мить самі
    // змінились би; SelectFilter підставить перший варіант і ефект спрацює знову.
    // Дзеркало Vue: DataListPage.vue → filtersReady.
    const missingRequired = filterConfig.some(f => {
      if (!f.required) return false
      const v = filters[f.key]
      return v === '' || v === null || v === undefined
    })
    if (missingRequired) {
      return
    }

    // `defaultFirstOption` — чекання одноразове: щойно фільтр підставив своє
    // значення, користувач може повернутись до «Всі», і це вже нормальний стан.
    const pendingFirstOption = filterConfig.some(f => {
      if (!f.defaultFirstOption || firstOptionApplied.current.has(f.key)) return false
      const v = filters[f.key]
      if (v === '' || v === null || v === undefined) return true
      firstOptionApplied.current.add(f.key)
      return false
    })
    if (pendingFirstOption) {
      return
    }

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    })

    // Порядок конфіга, а не обʼєкта: кілька фільтрів можуть писати в один
    // query-параметр (`param`), і виграє останній непорожній — тому set, не append.
    // Дзеркало Vue: DataListPage.vue → params.set(f.param ?? f.key, v).
    for (const f of filterConfig) {
      const value = filters[f.key]
      if (value !== '' && value !== null && value !== undefined && value !== false) {
        params.set(f.param ?? f.key, String(value))
      }
    }
    // Фільтри без опису в конфізі (задані сторінкою напряму) — як і раніше
    for (const [key, value] of Object.entries(filters)) {
      if (filterConfig.some(f => f.key === key)) continue
      if (value !== '' && value !== null && value !== undefined) {
        params.set(key, String(value))
      }
    }

    // Add sort (Vue admin format: separate sort_by and sort_dir)
    if (sortItems.length > 0) {
      params.append('sort_by', sortItems.map(s => s.key).join(','))
      params.append('sort_dir', sortItems.map(s => s.dir).join(','))
    }

    const url = `${apiList}?${params.toString()}`

    // stale-while-revalidate: якщо цей самий запит уже був — показуємо збережене
    // одразу (без спінера) і тихо оновлюємо у фоні.
    const cached = getCached<PaginatedResponse<any>>(url)
    if (cached) {
      setItems(cached.data)
      setTotal(cached.pagination.total)
      setTotalPages(cached.pagination.total_pages)
      setRevalidating(true)
    } else {
      setLoading(true)
    }
    setError('')

    apiGet<PaginatedResponse<any>>(url)
      .then(response => {
        setCached(url, response)
        setItems(response.data)
        setTotal(response.pagination.total)
        setTotalPages(response.pagination.total_pages)
      })
      .catch(err => {
        // Якщо показане з кешу — не затираємо його помилкою, лише сповіщаємо
        if (cached) notify(err instanceof Error ? err.message : 'Помилка оновлення', { type: 'error' })
        else setError(err instanceof Error ? err.message : 'Помилка завантаження')
      })
      .finally(() => {
        setLoading(false)
        setRevalidating(false)
      })
  }, [filters, sortItems, perPage, page, apiList, reloadToken])

  // Видалення рядка: зникає одразу, справжній DELETE — через UNDO_DELETE_DELAY,
  // весь цей час у тості доступне "Скасувати".
  const deleteRow = useCallback((row: any) => {
    if (!apiDelete) return
    const id = row[rowKey]
    const index = items.findIndex(r => r[rowKey] === id)

    const url = apiDelete.includes('{id}')
      ? apiDelete.replace('{id}', String(id))
      : `${apiDelete}/${id}`

    deleteWithUndo({
      message: `Запис #${id} видалено`,
      remove: () => {
        setItems(items => items.filter(r => r[rowKey] !== id))
        setTotal(t => t - 1)
      },
      restore: () => {
        setItems(items => {
          const restored = [...items]
          restored.splice(index < 0 ? restored.length : index, 0, row)
          return restored
        })
        setTotal(t => t + 1)
      },
      commit: async () => {
        await apiDeleteRequest(url)
      },
    })
  }, [apiDelete, rowKey, items])

  // Збирає фільтри для bulk all: true — ті самі, що і для list()
  const buildBulkFilters = useCallback(() => {
    const result: Record<string, any> = {}
    for (const f of filterConfig) {
      const v = filters[f.key]
      if (v !== '' && v !== null && v !== undefined && v !== false) {
        result[f.key] = v
      }
    }
    return result
  }, [filters, filterConfig])

  // Використовує bulk-ендпоінт для одночасного оновлення обраного поля у всіх
  // вибраних записах. Режим selectAllMatching надсилає фільтри замість ids.
  const applyBulkUpdate = useCallback(async (field: string, value: any) => {
    if (!apiBulk) return
    if (!selectAllMatching && selectedIds.size === 0) return

    setBulkApplying(true)
    try {
      const body: any = {
        action: 'update',
        field,
        value,
      }

      if (selectAllMatching) {
        body.all = true
        body.filters = buildBulkFilters()
      } else {
        body.ids = Array.from(selectedIds)
      }

      const res = await apiPost<{ affected?: number }>(apiBulk, body)
      notify(`Оновлено: ${res.affected ?? 0} запис(ів)`, { type: 'success' })
      clearRowSelection()
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Помилка масового оновлення', { type: 'error' })
    } finally {
      setBulkApplying(false)
    }
  }, [apiBulk, selectAllMatching, selectedIds, buildBulkFilters, clearRowSelection, reload])

  // Іменована масова дія (activate/deactivate/archive тощо). Undo тут немає навмисно:
  // activate/deactivate не деструктивні й скасовуються зворотною дією.
  const applyBulkAction = useCallback(async (action: string, label: string) => {
    if (!apiBulk) return
    if (!selectAllMatching && selectedIds.size === 0) return

    setBulkApplying(true)
    try {
      const body: any = { action }

      if (selectAllMatching) {
        body.all = true
        body.filters = buildBulkFilters()
      } else {
        body.ids = Array.from(selectedIds)
      }

      const res = await apiPost<{ affected?: number }>(apiBulk, body)
      notify(`${label}: ${res.affected ?? 0} запис(ів)`, { type: 'success' })
      clearRowSelection()
      reload()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Помилка виконання дії', { type: 'error' })
    } finally {
      setBulkApplying(false)
    }
  }, [apiBulk, selectAllMatching, selectedIds, buildBulkFilters, clearRowSelection, reload])

  const applyBulkDelete = useCallback(() => {
    if (!apiDelete || selectedIds.size === 0) return

    const removed = Array.from(selectedIds)
      .map(id => ({ id, index: items.findIndex(r => r[rowKey] === id) }))
      .filter(({ index }) => index !== -1)
      .map(({ index }) => ({ row: items[index], index }))

    clearRowSelection()

    deleteManyWithUndo({
      items: removed,
      message: `Видалено ${removed.length} запис(ів)`,
      remove: () => {
        const ids = new Set(removed.map(r => r.row[rowKey]))
        setItems(list => list.filter(r => !ids.has(r[rowKey])))
        setTotal(t => t - removed.length)
      },
      restore: (entries) => {
        setItems(list => {
          const restored = [...list]
          // за зростанням індексу — інакше наступні вставки зсунуть попередні
          for (const { row, index } of [...entries].sort((a, b) => a.index - b.index)) {
            restored.splice(Math.min(index, restored.length), 0, row)
          }
          return restored
        })
        setTotal(t => t + entries.length)
      },
      commitOne: async ({ row }) => {
        const id = row[rowKey]
        const url = apiDelete.includes('{id}')
          ? apiDelete.replace('{id}', String(id))
          : `${apiDelete}/${id}`
        await apiDeleteRequest(url)
      },
      onAnyCommitError: () => reload(),
    })
  }, [apiDelete, selectedIds, items, rowKey, clearRowSelection, reload])

  // Експорт у CSV: тягне всі сторінки під поточним фільтром, не лише видиму.
  const exportCsv = useCallback(async (columnsConfig: ColumnConfig[]) => {
    setExporting(true)
    try {
      // Довідники select-колонок — щоб у файл пішли підписи, а не коди.
      // fetchOptions ділить кеш із таблицею, тож зазвичай це миттєво.
      const remoteOptions = new Map<string, Option[]>()
      await Promise.all(
        columnsConfig
          .filter(c => c.type === 'select' && c.optionsUrl)
          .map(async c => {
            remoteOptions.set(c.key, await fetchOptions(c.optionsUrl!, {
              valueKey: c.optionsValueKey,
              labelKey: c.optionsLabelKey,
              labelTemplate: c.optionsLabelTemplate,
            }))
          })
      )

      const params = new URLSearchParams()
      params.set('per_page', String(EXPORT_PAGE_SIZE))
      if (sortItems.length) {
        params.set('sort_by', sortItems.map(s => s.key).join(','))
        params.set('sort_dir', sortItems.map(s => s.dir).join(','))
      }
      // Той самий порядок і той самий `param`, що й у списку — інакше експорт
      // вивантажив би не те, що показано на екрані.
      for (const f of filterConfig) {
        const value = filters[f.key]
        if (value !== '' && value !== null && value !== undefined && value !== false) {
          params.set(f.param ?? f.key, String(value))
        }
      }
      for (const [key, value] of Object.entries(filters)) {
        if (filterConfig.some(f => f.key === key)) continue
        if (value !== '' && value !== null && value !== undefined && value !== false) {
          params.set(key, String(value))
        }
      }

      let allRows: any[] = []
      let fetchPage = 1
      let fetchedTotalPages = 1
      do {
        params.set('page', String(fetchPage))
        const res = await apiGet<PaginatedResponse<any>>(`${apiList}?${params}`)
        allRows = allRows.concat(res.data ?? [])
        fetchedTotalPages = res.pagination?.total_pages ?? 1
        fetchPage++
      } while (fetchPage <= fetchedTotalPages && allRows.length < EXPORT_MAX_ROWS)

      if (allRows.length >= EXPORT_MAX_ROWS) {
        notify(
          `Експортовано перші ${EXPORT_MAX_ROWS} записів (забагато для одного файлу) — звузьте фільтр`,
          { type: 'info', duration: 8000 }
        )
      }

      const headers = columnsConfig.map(c => c.label)
      const csvRows = allRows.map(row =>
        columnsConfig.map(col => formatForExport(col, row, remoteOptions))
      )
      downloadCsv(
        `export-${new Date().toISOString().slice(0, 10)}.csv`,
        rowsToCsv(headers, csvRows)
      )
      notify(`Експортовано ${allRows.length} запис(ів)`, { type: 'success' })
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Помилка експорту', { type: 'error' })
    } finally {
      setExporting(false)
    }
  }, [apiList, filters, sortItems])

  return {
    items,
    total,
    loading,
    revalidating,
    bulkApplying,
    exporting,
    applyBulkUpdate,
    applyBulkAction,
    applyBulkDelete,
    exportCsv,
    error,
    page,
    perPage,
    totalPages,
    sortItems,
    filters,
    // Bulk selection (useRowSelection)
    selectedIds,
    selectAllMatching,
    selectedCount,
    allOnPageSelected,
    canSelectAllMatching,
    selectAllMatchingOn,
    clearSelection: clearRowSelection,
    toggleSelectRow,
    reload,
    toggleSort,
    setFilter,
    setPage,
    setPerPage: handleSetPerPage,
    setFilters,
    setSortItems,
    toggleSelectAll,
    updateCell,
    deleteRow,
    // Live updates (Task 12)
    enablePolling,
    setEnablePolling,
  }
}
