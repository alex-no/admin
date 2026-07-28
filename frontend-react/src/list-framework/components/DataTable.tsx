import React from 'react'
import { useTableState } from '../hooks/useTableState'
import Pagination from './Pagination'
import SortIcon from './SortIcon'
import SearchFilter from '../filters/SearchFilter'
import SelectFilter from '../filters/SelectFilter'
import type { DataTableProps } from '../types'

export default function DataTable({
  title,
  apiList,
  apiUpdate,
  apiDelete,
  filterConfig = [],
  columnsConfig,
  actions = [],
  rowKey = 'id',
  defaultPerPage = 50,
}: DataTableProps) {
  const {
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
    setPerPage,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  } = useTableState({
    apiList,
    filterConfig,
    defaultPerPage,
    rowKey,
  })

  const renderFilter = (f: typeof filterConfig[0]) => {
    if (f.type === 'search') {
      return (
        <SearchFilter
          key={f.key}
          value={filters[f.key] || ''}
          onChange={(v) => setFilter(f.key, v)}
          placeholder={f.placeholder}
        />
      )
    }

    if (f.type === 'select' && f.options) {
      return (
        <SelectFilter
          key={f.key}
          value={filters[f.key] || ''}
          onChange={(v) => setFilter(f.key, v)}
          options={f.options}
          placeholder={f.placeholder}
        />
      )
    }

    return null
  }

  const isAllSelected = items.length > 0 && items.every(item => selected.includes(item[rowKey]))

  return (
    <div>
      {/* Header with filters */}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        {title && <h5 className="mb-0">{title}</h5>}
        <div className="d-flex gap-2 flex-wrap ms-auto align-items-center">
          {filterConfig.map(renderFilter)}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="alert alert-danger">{error}</div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          {/* Selection info */}
          {selected.length > 0 && (
            <div className="alert alert-info d-flex align-items-center gap-2 flex-wrap mb-3">
              <span><strong>{selected.length}</strong> обрано</span>
              <button
                className="btn btn-sm btn-outline-secondary ms-auto"
                onClick={clearSelection}
              >
                Скасувати
              </button>
            </div>
          )}

          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '36px' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        title="Вибрати всі на сторінці"
                      />
                    </th>
                    {columnsConfig.map(col => (
                      <th
                        key={col.key}
                        style={col.width ? { width: col.width } : undefined}
                        className={`${col.align ? `text-${col.align}` : ''} ${col.sortable ? 'th-sortable' : ''}`}
                        title={col.sortable ? 'Клік — сортувати. Ctrl+клік — додати до сортування' : undefined}
                        onClick={col.sortable ? (e) => toggleSort(col.key, e.ctrlKey) : undefined}
                      >
                        {col.label}
                        {col.sortable && <SortIcon column={col.key} sortItems={sortItems} />}
                      </th>
                    ))}
                    {actions.length > 0 && <th style={{ width: '100px' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(row => (
                    <tr key={row[rowKey]}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selected.includes(row[rowKey])}
                          onChange={() => toggleSelect(row[rowKey])}
                        />
                      </td>
                      {columnsConfig.map(col => (
                        <td key={col.key} className={col.align ? `text-${col.align}` : ''}>
                          {col.format ? col.format(row[col.key], row) : row[col.key] ?? '—'}
                        </td>
                      ))}
                      {actions.length > 0 && (
                        <td className="text-nowrap">
                          {actions.map(action => (
                            <button
                              key={action.type}
                              className={`btn btn-sm me-1 ${action.type === 'delete' ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                              title={action.label}
                              onClick={() => action.handler(row)}
                            >
                              <i className={`bi ${action.icon}`}></i>
                            </button>
                          ))}
                        </td>
                      )}
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={columnsConfig.length + 1 + (actions.length ? 1 : 0)}
                        className="text-center text-muted py-4"
                      >
                        Немає даних
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted small">Всього: {total}</span>
            <div className="d-flex align-items-center gap-2">
              {totalPages > 1 && (
                <Pagination currentPage={page} totalPages={totalPages} onChange={setPage} />
              )}
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
              >
                {[5, 10, 20, 50, 100, 250].map(n => (
                  <option key={n} value={n}>{n} на сторінці</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
