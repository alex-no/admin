import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import Pagination from '@/list-framework/components/Pagination'
import AnalyticsDetailsModal from './AnalyticsDetailsModal'
import ChangeClientTypeModal from './ChangeClientTypeModal'
import { apiGet, apiPatch } from '@/utils/api'
import { notify } from '@/hooks/useNotify'
import { formatDate } from '@/utils/date'
import {
  useUrlFilters,
  readFiltersFromUrl,
  readSortFromUrl,
  readDetailIdFromUrl,
} from '@/hooks/useUrlFilters'
import { CLIENT_TYPE_BADGE, responseTimeClass } from './analyticsLabels'
import { methodBadge, rowClass, shortReferer, smartClientLabel, statusBadge } from './analyticsBadges'

const PER_PAGE = 100

function getClientTypeGroups(t: TFunction) {
  return [
    {
      label: t('analytics.filters.groupHumans'),
      options: [
        { value: 'human', label: t('analytics.filters.allHumans') },
        { value: 'human_desktop', label: t('analytics.filters.desktop') },
        { value: 'human_mobile', label: t('analytics.filters.mobile') },
        { value: 'human_tablet', label: t('analytics.filters.tablet') },
        { value: 'human_unknown', label: t('analytics.filters.unknownPlural') },
      ],
    },
    {
      label: t('analytics.filters.groupSearchEngines'),
      options: [
        { value: 'bot_search_engine', label: t('analytics.filters.allSearchEngines') },
        { value: 'bot_search_google', label: 'Google' },
        { value: 'bot_search_yandex', label: 'Yandex' },
        { value: 'bot_search_bing', label: 'Bing' },
        { value: 'bot_search_other', label: t('analytics.filters.otherSearchEngines') },
        { value: 'bot_search_unknown', label: t('analytics.filters.unknownPlural') },
      ],
    },
    {
      label: t('analytics.filters.groupSeoTools'),
      options: [
        { value: 'bot_seo_tool', label: t('analytics.filters.allSeoTools') },
        { value: 'bot_seo_unknown', label: t('analytics.filters.unknownPlural') },
      ],
    },
    {
      label: t('analytics.filters.groupMonitoring'),
      options: [
        { value: 'bot_monitoring', label: t('analytics.filters.allMonitoring') },
        { value: 'bot_monitoring_unknown', label: t('analytics.filters.unknownPlural') },
      ],
    },
    {
      label: t('analytics.filters.groupBadBots'),
      options: [
        { value: 'bot_scraper', label: t('analytics.filters.scrapers') },
        { value: 'bot_malicious', label: t('analytics.filters.malicious') },
        { value: 'bot_bad_unknown', label: t('analytics.filters.unknownPlural') },
      ],
    },
    {
      label: t('analytics.filters.groupOther'),
      options: [
        { value: 'suspicious', label: t('analytics.filters.suspiciousPlural') },
        { value: 'unknown', label: t('analytics.filters.unknownPlural') },
        { value: 'unclassified', label: t('analytics.filters.unclassified') },
      ],
    },
  ]
}

const STATUS_OPTIONS = ['200 OK', '201 Created', '204 No Content', '301 Moved', '302 Found',
  '400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found',
  '422 Unprocessable', '500 Server Error', '503 Unavailable']

function getSortColumns(t: TFunction): Array<{ key: string; label: string; width?: string; align?: string }> {
  return [
    { key: 'id', label: 'ID', width: '60px', align: 'text-end' },
    { key: 'path', label: 'URL' },
    { key: 'method', label: 'Method', width: '60px' },
    { key: 'status_code', label: 'Status', width: '70px' },
    { key: 'ip', label: 'IP', width: '130px' },
    { key: 'referer', label: 'Referer' },
    { key: 'client_type', label: t('analytics.colClientType'), width: '140px' },
    { key: 'browser', label: 'Browser' },
    { key: 'user_id', label: 'User' },
    { key: 'response_time', label: 'Time', width: '90px', align: 'text-end' },
    { key: 'created_at', label: t('analytics.colDate'), width: '140px' },
  ]
}

export default function Analytics() {
  const { t } = useTranslation()
  const CLIENT_TYPE_GROUPS = getClientTypeGroups(t)
  const SORT_COLUMNS = getSortColumns(t)
  // Початковий стан — з URL (client_type за замовчуванням 'human', як у Vue)
  const urlFilters = readFiltersFromUrl({
    search: '',
    client_type: 'human',
    device_type: '',
    status_code: '',
    method: '',
    date_from: '',
    date_to: '',
    ip: '',
    page: 1,
  })
  const urlSort = readSortFromUrl({ sortKey: 'created_at', sortDir: 'DESC' })

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(urlFilters.page)
  const [total, setTotal] = useState(0)

  const [search, setSearch] = useState(urlFilters.search)
  const [searchDebounced, setSearchDebounced] = useState(urlFilters.search)
  const [clientTypeFilter, setClientTypeFilter] = useState(urlFilters.client_type)
  const [deviceFilter, setDeviceFilter] = useState(urlFilters.device_type)
  const [statusFilter, setStatusFilter] = useState(urlFilters.status_code)
  const [methodFilter, setMethodFilter] = useState(urlFilters.method)
  const [dateFrom, setDateFrom] = useState(urlFilters.date_from)
  const [dateTo, setDateTo] = useState(urlFilters.date_to)
  const [ipFilter, setIpFilter] = useState(urlFilters.ip)
  const [ipFilterDebounced, setIpFilterDebounced] = useState(urlFilters.ip)

  const [sortKey, setSortKey] = useState(urlSort.sortKey)
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>(urlSort.sortDir as 'ASC' | 'DESC')
  const [selected, setSelected] = useState<number[]>([])
  const [bulkClientType, setBulkClientType] = useState('')
  const [detailId, setDetailId] = useState<number | null>(() => readDetailIdFromUrl())
  const [changeType, setChangeType] = useState<{ id: number; currentType: string } | null>(null)

  useUrlFilters({
    filters: {
      search,
      client_type: clientTypeFilter,
      device_type: deviceFilter,
      status_code: statusFilter,
      method: methodFilter,
      date_from: dateFrom,
      date_to: dateTo,
      ip: ipFilter,
      page: page > 1 ? page : '',
    },
    sorting: { sortKey, sortDir },
    detailId,
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(search)
      setIpFilterDebounced(ipFilter)
      setPage(1)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [search, ipFilter])

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
    if (clientTypeFilter) params.set('client_type', clientTypeFilter)
    if (deviceFilter) params.set('device_type', deviceFilter)
    if (statusFilter) params.set('status_code', statusFilter)
    if (methodFilter) params.set('method', methodFilter)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (ipFilterDebounced) params.set('ip', ipFilterDebounced)

    try {
      const res = await apiGet(`/admin/analytics/pageviews?${params}`)
      setItems(res.data ?? [])
      setTotal(res.pagination?.total ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analytics.loadError'))
    } finally {
      setLoading(false)
    }
  }, [page, sortKey, sortDir, searchDebounced, clientTypeFilter, deviceFilter,
      statusFilter, methodFilter, dateFrom, dateTo, ipFilterDebounced, t])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PER_PAGE)
  const isAllSelected = items.length > 0 && items.every(row => selected.includes(row.id))

  const toggleSort = (col: string) => {
    if (sortKey === col) setSortDir(d => (d === 'ASC' ? 'DESC' : 'ASC'))
    else { setSortKey(col); setSortDir('DESC') }
    setPage(1)
  }

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <i className="bi bi-arrow-down-up text-muted opacity-25 ms-1" />
    return <i className={`bi bi-arrow-${sortDir === 'ASC' ? 'up' : 'down'} text-primary ms-1`} />
  }

  const clearSelection = () => { setSelected([]); setBulkClientType('') }

  const applyBulkChange = async () => {
    if (!bulkClientType || selected.length === 0) return
    try {
      await apiPatch('/admin/analytics/bulk-update-client-type', {
        ids: selected,
        client_type: bulkClientType,
      })
      clearSelection()
      load()
    } catch (err) {
      notify(`${t('common.error')}: ${err instanceof Error ? err.message : t('analytics.unknownError')}`, { type: 'error' })
    }
  }

  const applyClientType = async (newType: string) => {
    if (!changeType) return
    try {
      await apiPatch(`/admin/analytics/pageview/${changeType.id}/client-type`, { client_type: newType })
      setChangeType(null)
      load()
    } catch (err) {
      notify(`${t('common.error')}: ${err instanceof Error ? err.message : t('analytics.unknownError')}`, { type: 'error' })
    }
  }

  const showMyIp = async () => {
    try {
      const res = await apiGet('/admin/network-tools/my-ip')
      const ip = res.data?.ip
      if (!ip) {
        notify(t('analytics.myIpFailed'), { type: 'error' })
        return
      }
      const subnet = ip.split('.').slice(0, 3).join('.') + '.*'
      notify(
        t('analytics.myIpMessageShort', { ip, subnet }),
        { type: 'info', duration: 10000, action: { label: t('analytics.myIpAction'), onClick: () => setIpFilter(ip) } }
      )
    } catch (err) {
      notify(`${t('common.error')}: ${err instanceof Error ? err.message : t('analytics.unknownError')}`, { type: 'error' })
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0">{t('analytics.title')}</h5>
          <Link to="/analytics/stats" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-bar-chart" /> {t('analytics.statsLink')}
          </Link>
          <Link to="/analytics/charts" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-graph-up-arrow" /> {t('analytics.chartsLink')}
          </Link>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            className="form-control form-control-sm"
            style={{ width: '200px' }}
            placeholder={t('analytics.searchPlaceholder')}
          />
          <select
            value={clientTypeFilter}
            onChange={(e) => { setClientTypeFilter(e.target.value); setPage(1) }}
            className="form-select form-select-sm"
            style={{ width: '220px' }}
          >
            <option value="">{t('analytics.filters.allClientTypes')}</option>
            {CLIENT_TYPE_GROUPS.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
          <select
            value={deviceFilter}
            onChange={(e) => { setDeviceFilter(e.target.value); setPage(1) }}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">{t('analytics.filters.allDevices')}</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">{t('analytics.filters.allStatuses')}</option>
            {STATUS_OPTIONS.map(s => {
              const code = s.split(' ')[0]
              return <option key={code} value={code}>{s}</option>
            })}
            <option value="other">{t('analytics.filters.otherStatuses')}</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1) }}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">{t('analytics.filters.allMethods')}</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
            <option value="other">{t('analytics.filters.otherMethods')}</option>
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
          <div className="input-group" style={{ width: 'auto' }}>
            <input
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              type="text"
              className="form-control form-control-sm"
              style={{ width: '150px' }}
              placeholder={t('analytics.ipPlaceholder')}
            />
            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              title={t('analytics.myIpTooltip')}
              onClick={showMyIp}
            >
              <i className="bi bi-hdd-network" />
            </button>
          </div>
        </div>
      </div>

      {/* Масові дії */}
      {selected.length > 0 && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-3">
          <span><strong>{selected.length}</strong> {t('analytics.bulk.selected')}</span>
          <select
            value={bulkClientType}
            onChange={(e) => setBulkClientType(e.target.value)}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="">{t('analytics.bulk.changeTypeTo')}</option>
            <option value="human">{t('analytics.clientType.human')}</option>
            <option value="bot">{t('analytics.clientType.bot')}</option>
            <option value="suspicious">{t('analytics.clientType.suspicious')}</option>
            <option value="unknown">{t('analytics.clientType.unknown')}</option>
          </select>
          <button className="btn btn-sm btn-primary" disabled={!bulkClientType} onClick={applyBulkChange}>
            {t('dataList.apply')}
          </button>
          <button className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>{t('common.cancel')}</button>
        </div>
      )}

      {loading && <div className="text-center py-5"><div className="spinner-border text-primary" /></div>}
      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={isAllSelected}
                        onChange={() => setSelected(isAllSelected ? [] : items.map(r => r.id))}
                        title={t('analytics.selectAllTooltip')}
                      />
                    </th>
                    {SORT_COLUMNS.map(col => (
                      <th
                        key={col.key}
                        style={col.width ? { width: col.width } : undefined}
                        className={`th-sortable ${col.align ?? ''}`}
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label} {sortIcon(col.key)}
                      </th>
                    ))}
                    <th style={{ width: '80px' }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr key={row.id} className={rowClass(row.status_code)}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selected.includes(row.id)}
                          onChange={() => setSelected(prev =>
                            prev.includes(row.id) ? prev.filter(i => i !== row.id) : [...prev, row.id]
                          )}
                        />
                      </td>
                      <td className="text-muted text-end">{row.id}</td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '300px' }} title={row.path}>
                          {row.path}
                        </div>
                      </td>
                      <td><span className={methodBadge(row.method)}>{row.method}</span></td>
                      <td><span className={statusBadge(row.status_code)}>{row.status_code}</span></td>
                      <td className="small">
                        <a
                          href="#"
                          className="text-decoration-none"
                          title={t('analytics.filterByIpTooltip', { ip: row.ip })}
                          onClick={(e) => { e.preventDefault(); setIpFilter(row.ip) }}
                        >
                          <i className="bi bi-filter-circle" /> {row.ip}
                        </a>
                      </td>
                      <td className="text-muted small">
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={row.referer}>
                          {shortReferer(row.referer)}
                        </div>
                      </td>
                      <td>
                        <span
                          className={CLIENT_TYPE_BADGE[row.client_type] ?? 'badge bg-light text-dark'}
                          style={{ cursor: 'pointer' }}
                          title={t('analytics.changeTypeTooltip', { method: row.detection_method || t('analytics.notSpecified') })}
                          onClick={() => setChangeType({ id: row.id, currentType: row.client_type })}
                        >
                          {smartClientLabel(row)}
                        </span>
                      </td>
                      <td className="text-muted small">{row.browser || '—'}</td>
                      <td className="text-muted small">
                        {row.user_id
                          ? <span title={row.email}>#{row.user_id} {row.username}</span>
                          : '—'}
                      </td>
                      <td className="text-end">
                        <span className={responseTimeClass(row.response_time)}>{row.response_time}ms</span>
                      </td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(row.created_at)}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          title={t('analytics.detailsTooltip')}
                          onClick={() => setDetailId(row.id)}
                        >
                          <i className="bi bi-info-circle" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={14} className="text-center text-muted py-4">{t('common.noData')}</td></tr>
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
        <AnalyticsDetailsModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onFilterByIp={(ip) => { setIpFilter(ip); setDetailId(null) }}
        />
      )}

      {changeType && (
        <ChangeClientTypeModal
          currentType={changeType.currentType}
          onSelect={applyClientType}
          onClose={() => setChangeType(null)}
        />
      )}
    </div>
  )
}
