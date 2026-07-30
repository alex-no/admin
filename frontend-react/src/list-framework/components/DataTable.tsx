import { forwardRef, useImperativeHandle, useState } from 'react'
import { useTableState } from '../hooks/useTableState'
import { useColumnPrefs } from '../hooks/useColumnPrefs'
import { useSavedFilters } from '@/hooks/useSavedFilters'
import { useAuth } from '@/contexts/AuthContext'
import { notify } from '@/hooks/useNotify'
import { resolveCellType } from '../cellTypes'
import ColumnSelector from './ColumnSelector'
import Pagination from './Pagination'
import SortIcon from './SortIcon'
import SearchFilter from '../filters/SearchFilter'
import SelectFilter from '../filters/SelectFilter'
import type { DataTableProps, DataTableHandle, ColumnConfig } from '../types'

const DataTable = forwardRef<DataTableHandle, DataTableProps>(function DataTable({
  title,
  apiList,
  apiUpdate,
  apiDelete,
  filterConfig = [],
  columnsConfig,
  actions = [],
  rowKey = 'id',
  defaultPerPage = 50,
  onRowUpdated,
}: DataTableProps, ref) {
  const {
    items,
    total,
    loading,
    revalidating,
    bulkApplying,
    exporting,
    applyBulkUpdate,
    applyBulkDelete,
    exportCsv,
    error,
    page,
    perPage,
    totalPages,
    sortItems,
    filters,
    selected,
    reload,
    toggleSort,
    setFilter,
    setPage,
    setPerPage,
    setFilters,
    setSortItems,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    updateCell,
    deleteRow,
  } = useTableState({
    apiList,
    apiUpdate,
    apiDelete,
    filterConfig,
    defaultPerPage,
    rowKey,
    onRowUpdated,
  })

  // Сторінка може перезавантажити список після збереження в картці (як listRef.reload() у Vue)
  useImperativeHandle(ref, () => ({ reload }), [reload])

  // ── Збережені фільтри ────────────────────────────────────────────────────
  const { presets, save: savePreset, remove: removePreset } = useSavedFilters(apiList)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  const applyPreset = (name: string) => {
    setSelectedPreset(name)
    const preset = presets.find(p => p.name === name)
    if (!preset) return

    setFilters(prev => ({ ...prev, ...(preset.filters ?? {}) }))
    setSortItems((preset.sort ?? []) as typeof sortItems)
    if (preset.perPage) setPerPage(preset.perPage)
    setPage(1)
  }

  const confirmSavePreset = () => {
    const name = newPresetName.trim()
    if (!name) return

    savePreset(name, {
      filters: Object.fromEntries(filterConfig.map(f => [f.key, filters[f.key]])),
      sort: sortItems.map(s => ({ ...s })),
      perPage,
    })
    setSelectedPreset(name)
    setNewPresetName('')
    setShowSaveInput(false)
    notify(`Фільтр «${name}» збережено`, { type: 'success' })
  }

  const deleteSelectedPreset = () => {
    if (!selectedPreset) return
    removePreset(selectedPreset)
    notify(`Фільтр «${selectedPreset}» видалено`, { type: 'info' })
    setSelectedPreset('')
  }

  // ── Вибір колонок (react-admin: SelectColumnsButton) ─────────────────────
  // Колонка з прапорцем hideable: false ховатись не може. Експорт у CSV навмисно
  // отримує повний columnsConfig — приховане в UI все одно попадає у вигрузку.
  const {
    isVisible: isColumnVisible,
    toggle: toggleColumn,
    reset: resetColumns,
    hasHidden: hasHiddenColumns,
  } = useColumnPrefs(apiList, columnsConfig)

  const visibleColumns = columnsConfig.filter(c => isColumnVisible(c.key))

  // Дії без права взагалі не показуємо — так само, як v-show у Vue-версії
  const { can } = useAuth()

  // Колонка редагована, якщо так сказано в конфізі І користувач має право хоч на
  // один із перелічених editPermissions. Прапорця немає — достатньо editable.
  // Порожній масив = редагувати не може ніхто.
  // Дзеркало Vue: DataListPage.vue → isColumnEditable.
  // ⚠️ Сервер перевіряє те саме окремо (AdminStoController::FIELD_PERMISSIONS) —
  // тут лише UI, обійти його через DevTools тривіально.
  const isColumnEditable = (col: ColumnConfig): boolean => {
    if (!col.editable) return false
    if (!col.editPermissions) return true
    return col.editPermissions.some(p => can(p))
  }

  // ── Масові операції ──────────────────────────────────────────────────────
  // Той самий предикат, що й для комірок: інакше поле, закрите правами, лишилось би
  // доступним через "Змінити поле…" у масових операціях — і змінювалось би пачкою.
  const editableColumns = columnsConfig.filter(isColumnEditable)
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState<any>(null)
  const bulkFieldConfig = editableColumns.find(c => c.key === bulkField) ?? null
  const BulkCell = bulkFieldConfig ? resolveCellType(bulkFieldConfig.type) : null
  const visibleActions = actions.filter(a => !a.permission || can(a.permission))
  const deleteAction = visibleActions.find(a => a.type === 'delete')
  const canBulkDelete = Boolean(apiDelete && deleteAction)

  // Дія рядка: 'delete' обробляє сама таблиця (як декларативний конфіг у Vue),
  // решта — власним handler'ом сторінки.
  const handleAction = (action: typeof actions[0], row: any) => {
    // Підтвердження не питаємо навмисно — замість нього 5 секунд на "Скасувати" в тості.
    if (action.type === 'delete' && apiDelete && !action.handler) {
      deleteRow(row)
      return
    }
    action.handler?.(row)
  }

  // Комірка: тип з реєстру (readonly/editable — один компонент),
  // інакше довільний format(), інакше просто значення.
  const renderCell = (col: ColumnConfig, row: any) => {
    const Cell = resolveCellType(col.type)
    if (Cell) {
      return (
        <Cell
          field={col}
          value={row[col.key]}
          readonly={!isColumnEditable(col)}
          row={row}
          onChange={(v) => updateCell(row, col, v)}
        />
      )
    }
    return col.format ? col.format(row[col.key], row) : row[col.key] ?? '—'
  }

  const renderFilter = (f: typeof filterConfig[0]) => {
    // 'text' — назва зі спільного конфіга (як у Vue-реєстрі filterTypes.js);
    // 'search' лишається прийнятним псевдонімом для сумісності.
    if (f.type === 'text' || f.type === 'search') {
      return (
        <SearchFilter
          key={f.key}
          value={filters[f.key] || ''}
          onChange={(v) => setFilter(f.key, v)}
          placeholder={f.placeholder ?? f.label}
        />
      )
    }

    if (f.type === 'select' && (f.options || f.optionsUrl)) {
      return (
        <SelectFilter
          key={f.key}
          value={filters[f.key] || ''}
          onChange={(v) => setFilter(f.key, v)}
          options={f.options}
          optionsUrl={f.optionsUrl}
          optionsValueKey={f.optionsValueKey}
          optionsLabelKey={f.optionsLabelKey}
          placeholderOption={f.placeholderOption}
          label={f.label}
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

          {filterConfig.length > 0 && (
            <div className="d-flex align-items-center gap-1">
              <select
                value={selectedPreset}
                onChange={(e) => applyPreset(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
              >
                <option value="">Збережені фільтри...</option>
                {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                title="Зберегти поточний фільтр"
                onClick={() => setShowSaveInput(v => !v)}
              >
                <i className="bi bi-bookmark-plus" />
              </button>
              {selectedPreset && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  title="Видалити збережений фільтр"
                  onClick={deleteSelectedPreset}
                >
                  <i className="bi bi-trash" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={exporting}
            title="Експорт у CSV"
            onClick={() => exportCsv(columnsConfig)}
          >
            {exporting
              ? <span className="spinner-border spinner-border-sm me-1" />
              : <i className="bi bi-download me-1" />}
            CSV
          </button>

          <ColumnSelector
            columns={columnsConfig}
            isVisible={isColumnVisible}
            hasHidden={hasHiddenColumns}
            onToggle={toggleColumn}
            onReset={resetColumns}
          />
        </div>
      </div>

      {showSaveInput && (
        <div className="d-flex gap-2 align-items-center justify-content-end mb-3">
          <input
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); confirmSavePreset() }
              if (e.key === 'Escape') { e.preventDefault(); setShowSaveInput(false) }
            }}
            type="text"
            className="form-control form-control-sm"
            style={{ width: '220px' }}
            placeholder="Назва фільтру..."
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={confirmSavePreset}>
            Зберегти
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowSaveInput(false)}
          >
            Скасувати
          </button>
        </div>
      )}

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
          {/* Масові операції — з'являються, коли вибрано хоч один рядок */}
          {selected.length > 0 && (
            <div className="alert alert-info d-flex align-items-center gap-2 flex-wrap mb-3">
              <span><strong>{selected.length}</strong> обрано</span>

              <select
                value={bulkField}
                onChange={(e) => { setBulkField(e.target.value); setBulkValue(null) }}
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
              >
                <option value="">Змінити поле...</option>
                {editableColumns.map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>

              {bulkFieldConfig && BulkCell && (
                <BulkCell
                  field={bulkFieldConfig}
                  value={bulkValue}
                  readonly={false}
                  row={{}}
                  onChange={setBulkValue}
                />
              )}

              {bulkFieldConfig && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={bulkApplying}
                  onClick={() => applyBulkUpdate(bulkField, bulkValue)}
                >
                  {bulkApplying && <span className="spinner-border spinner-border-sm me-1" />}
                  Застосувати
                </button>
              )}

              {canBulkDelete && (
                <button
                  className="btn btn-sm btn-outline-danger"
                  disabled={bulkApplying}
                  onClick={applyBulkDelete}
                >
                  <i className="bi bi-trash" /> Видалити
                </button>
              )}

              <button
                className="btn btn-sm btn-outline-secondary ms-auto"
                onClick={() => { clearSelection(); setBulkField(''); setBulkValue(null) }}
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
                    {visibleColumns.map(col => (
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
                    {visibleActions.length > 0 && <th style={{ width: '100px' }}></th>}
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
                      {visibleColumns.map(col => (
                        <td key={col.key} className={col.align ? `text-${col.align}` : ''}>
                          {renderCell(col, row)}
                        </td>
                      ))}
                      {visibleActions.length > 0 && (
                        <td className="text-nowrap">
                          {visibleActions.map(action => (
                            <button
                              // type сам по собі не унікальний: 'detail' може бути
                              // кілька разів, по одному на вкладку картки
                              key={`${action.type}:${action.tab ?? ''}`}
                              className={`btn btn-sm me-1 ${action.type === 'delete' ? 'btn-outline-danger' : 'btn-outline-secondary'}`}
                              title={action.label}
                              onClick={() => handleAction(action, row)}
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
                        colSpan={visibleColumns.length + 1 + (visibleActions.length ? 1 : 0)}
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
            <span className="text-muted small">
              Всього: {total}
              {revalidating && (
                <span
                  className="spinner-border spinner-border-sm ms-1"
                  style={{ width: '.7rem', height: '.7rem' }}
                  title="Оновлення..."
                />
              )}
            </span>
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
})

export default DataTable
