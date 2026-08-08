import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Pagination from '@/list-framework/components/Pagination'
import ErrorLogDetailModal from './ErrorLogDetailModal'
import ErrorLogCleanupModal from './ErrorLogCleanupModal'
import { LEVEL_ORDER, LEVEL_OPTION_ICON, LEVEL_BADGE, rowClass, shortException, shortFile } from './errorLogLevels'
import { apiGet } from '@/utils/api'
import { formatDate } from '@/utils/date'
import {
  useUrlFilters,
  readFiltersFromUrl,
  readSortFromUrl,
  readDetailIdFromUrl,
} from '@/hooks/useUrlFilters'

interface ErrorLog {
  id: number
  level: string
  category: string | null
  message: string
  exception_class: string | null
  file: string | null
  line: number | null
  created_at: string
}

const PER_PAGE = 50

export default function ErrorLogs() {
  const { t } = useTranslation()
  // Початковий стан — з URL, щоб посилання на відфільтрований список працювало
  const urlFilters = readFiltersFromUrl({ search: '', level: '', date_from: '', date_to: '', page: 1 })
  const urlSort = readSortFromUrl({ sortKey: 'created_at', sortDir: 'DESC' })

  const [items, setItems] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(urlFilters.page)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState(urlFilters.search)
  const [level, setLevel] = useState(urlFilters.level)
  const [dateFrom, setDateFrom] = useState(urlFilters.date_from)
  const [dateTo, setDateTo] = useState(urlFilters.date_to)
  const [sortKey, setSortKey] = useState(urlSort.sortKey)
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>(urlSort.sortDir as 'ASC' | 'DESC')
  const [detailId, setDetailId] = useState<number | null>(() => readDetailIdFromUrl())
  const [cleanupOpen, setCleanupOpen] = useState(false)

  useUrlFilters({
    filters: {
      search,
      level,
      date_from: dateFrom,
      date_to: dateTo,
      page: page > 1 ? page : '',
    },
    sorting: { sortKey, sortDir },
    detailId,
  })

  // Пошук з дебаунсом — окремий стан, щоб не смикати сервер на кожну літеру
  const [searchDebounced, setSearchDebounced] = useState(urlFilters.search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PER_PAGE),
      sort_by: sortKey,
      sort_dir: sortDir,
    })
    if (searchDebounced) params.set('search', searchDebounced)
    if (level) params.set('level', level)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)

    try {
      const res = await apiGet(`/admin/error-logs?${params}`)
      setItems(res.data ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLogs.loadError'))
    } finally {
      setLoading(false)
    }
  }, [page, sortKey, sortDir, searchDebounced, level, dateFrom, dateTo, t])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PER_PAGE)

  const toggleSort = (col: string) => {
    if (sortKey === col) {
      setSortDir(d => (d === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      setSortKey(col)
      setSortDir('DESC')
    }
    setPage(1)
  }

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <i className="bi bi-arrow-down-up text-muted opacity-25 ms-1" />
    return <i className={`bi bi-arrow-${sortDir === 'ASC' ? 'up' : 'down'} text-primary ms-1`} />
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0">{t('errorLogs.title')}</h5>
          <Link to="/error-logs/stats" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-bar-chart" /> {t('menu.stats')}
          </Link>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            className="form-control form-control-sm"
            style={{ width: '220px' }}
            placeholder={t('errorLogs.searchPlaceholder')}
          />
          <select
            value={level}
            onChange={(e) => { setLevel(e.target.value); setPage(1) }}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">{t('errorLogs.allLevels')}</option>
            {LEVEL_ORDER.map(l => (
              <option key={l} value={l}>{LEVEL_OPTION_ICON[l]} {l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
          <input
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            type="date"
            className="form-control form-control-sm"
            style={{ width: 'auto' }}
          />
          <input
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            type="date"
            className="form-control form-control-sm"
            style={{ width: 'auto' }}
          />
          <button className="btn btn-sm btn-outline-danger" onClick={() => setCleanupOpen(true)}>
            <i className="bi bi-trash" /> {t('errorLogs.cleanupButton')}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }} className="text-end">{t('roles.colId')}</th>
                    <th style={{ width: '90px' }} className="th-sortable" onClick={() => toggleSort('level')}>
                      {t('errorLogs.level')} {sortIcon('level')}
                    </th>
                    <th>{t('errorLogs.category')}</th>
                    <th>{t('errorLogs.message')}</th>
                    <th>{t('errorLogs.exception')}</th>
                    <th>{t('errorLogs.file')}</th>
                    <th style={{ width: '140px' }} className="th-sortable" onClick={() => toggleSort('created_at')}>
                      {t('analytics.colDate')} {sortIcon('created_at')}
                    </th>
                    <th style={{ width: '50px' }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr key={row.id} className={rowClass(row.level)}>
                      <td className="text-muted text-end">{row.id}</td>
                      <td><span className={LEVEL_BADGE[row.level] ?? 'badge bg-secondary'}>{row.level}</span></td>
                      <td className="text-muted small">{row.category || '—'}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '400px' }} title={row.message}>
                          {row.message}
                        </div>
                      </td>
                      <td className="text-muted small">
                        <div className="text-truncate" style={{ maxWidth: '250px' }} title={row.exception_class ?? ''}>
                          {shortException(row.exception_class)}
                        </div>
                      </td>
                      <td className="text-muted small">
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={row.file ?? ''}>
                          {shortFile(row.file)}{row.line ? `:${row.line}` : ''}
                        </div>
                      </td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(row.created_at)}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          title={t('errorLogs.detailTooltip')}
                          onClick={() => setDetailId(row.id)}
                        >
                          <i className="bi bi-eye" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-4">{t('common.noData')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">{t('analytics.totalCount', { value: total })}</span>
            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} onChange={setPage} />
            )}
          </div>
        </>
      )}

      {detailId !== null && (
        <ErrorLogDetailModal id={detailId} onClose={() => setDetailId(null)} />
      )}

      {cleanupOpen && (
        <ErrorLogCleanupModal onClose={() => setCleanupOpen(false)} onCleaned={load} />
      )}
    </div>
  )
}
