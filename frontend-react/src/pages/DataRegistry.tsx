import { useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DataTable, useRecordNav } from '@/list-framework'
import DataRegistryDetail from './DataRegistryDetail'
import { authHeaders } from '@/utils/api'
import type {
  ColumnConfig,
  FilterConfig,
  ActionConfig,
  BulkActionConfig,
  DataTableHandle,
} from '@/list-framework'

// Той самий конфіг, що читає Vue-версія (frontend/src/pages/StoRegistry.vue) —
// один екран описується одним конфігом, а не двома копіями.
// Див. shared/page-configs/README.md.
import filterConfig from '@configs/sto-registry.filter.json'
import columnsConfig from '@configs/sto-registry.columns.json'
import cfg from '@configs/sto-registry.config.json'

export default function DataRegistry() {
  const { t } = useTranslation()
  const listRef = useRef<DataTableHandle>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailRow, setDetailRow] = useState<any>(null)
  const [detailTab, setDetailTab] = useState('general')
  const [listState, setListState] = useState<{
    items: any[]
    page: number
    perPage: number
    total: number
  }>({ items: [], page: 1, perPage: 50, total: 0 })

  const openDetail = (row: any, tab: string) => {
    setDetailRow(row)
    setDetailTab(tab)
    // Додаємо detail в URL
    const params = new URLSearchParams(searchParams)
    params.set('detail', row.id.toString())
    if (tab && tab !== 'general') {
      params.set('tab', tab)
    } else {
      params.delete('tab')
    }
    setSearchParams(params)
  }

  const closeDetail = () => {
    setDetailRow(null)
    // Видаляємо detail з URL
    const params = new URLSearchParams(searchParams)
    params.delete('detail')
    params.delete('tab')
    setSearchParams(params)
  }

  const handleTabChange = (tab: string) => {
    setDetailTab(tab)
    // Оновлюємо tab в URL
    const params = new URLSearchParams(searchParams)
    if (tab && tab !== 'general') {
      params.set('tab', tab)
    } else {
      params.delete('tab')
    }
    setSearchParams(params)
  }

  // Відновлення з URL при завантаженні або зміні ?detail=
  useEffect(() => {
    const detailId = searchParams.get('detail')
    if (!detailId) {
      // Якщо detail був видалений з URL (напр. Back), закриваємо модалку
      if (detailRow) setDetailRow(null)
      return
    }

    // Якщо вже відкрито цей запис — не перезавантажувати
    if (detailRow?.id === parseInt(detailId, 10)) return

    // Завантажити запис по ID
    const loadDetail = async () => {
      try {
        const res = await fetch(`${cfg.apiUpdate}/${detailId}`, {
          headers: authHeaders(),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.data) {
          console.error('Failed to load detail:', json)
          // Видаляємо невалідний detail з URL
          const params = new URLSearchParams(searchParams)
          params.delete('detail')
          params.delete('tab')
          setSearchParams(params)
          return
        }
        setDetailRow(json.data)
        const tab = searchParams.get('tab')
        if (tab) setDetailTab(tab)
      } catch (e) {
        console.error('Failed to load detail:', e)
      }
    }

    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('detail')]) // Реагуємо тільки на зміну detail

  // Інлайн-правка в таблиці має одразу відображатись у відкритій картці,
  // інакше список і картка показують різне (напр. статус).
  const syncDetailRow = useCallback((row: any) => {
    setDetailRow((cur: any) => (cur && cur.id === row.id ? row : cur))
  }, [])

  // Запам'ятовуємо стан списку для навігації
  const handleListUpdate = useCallback((items: any[], page: number, perPage: number, total: number) => {
    setListState({ items, page, perPage, total })
  }, [])

  // Навігація по записах
  const recordNav = useRecordNav({
    items: listState.items,
    page: listState.page,
    perPage: listState.perPage,
    total: listState.total,
    currentId: detailRow?.id ?? null,
    load: async (page: number) => {
      if (listRef.current) {
        await listRef.current.setFilter('page', page)
      }
    },
    openRecord: (row: any) => openDetail(row, 'general'),
  })

  // actions[] у конфізі — без обробників: JSON описує type/label/icon/permission/tab,
  // а що робить дія, вирішує сторінка. 'delete' таблиця обробляє сама через apiDelete.
  const actions: ActionConfig[] = (cfg.actions as ActionConfig[]).map((a) =>
    a.type === 'detail'
      ? { ...a, handler: (r: any) => openDetail(r, a.tab ?? 'general') }
      : a
  )

  return (
    <>
      <DataTable
        ref={listRef}
        title={t('stoRegistry.title')}
        apiList={cfg.apiList}
        apiUpdate={cfg.apiUpdate}
        apiDelete={cfg.apiDelete}
        apiCreate={cfg.apiCreate}
        createPermission={cfg.createPermission}
        createFields={cfg.createFields}
        apiBulk={cfg.apiBulk}
        bulkActions={cfg.bulkActions as BulkActionConfig[]}
        bulkEditableFields={cfg.bulkEditableFields}
        filterConfig={filterConfig as FilterConfig[]}
        columnsConfig={columnsConfig as ColumnConfig[]}
        actions={actions}
        rowKey="id"
        defaultPerPage={50}
        onRowUpdated={syncDetailRow}
        onListUpdate={handleListUpdate}
        expandable={true}
        renderExpanded={(row) => (
          <div className="card">
            <div className="card-header bg-white py-2">
              <strong className="small">{t('stoRegistry.recordDetails')} #{row.id}</strong>
            </div>
            <div className="card-body p-2">
              <pre className="mb-0 small" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {JSON.stringify(row, null, 2)}
              </pre>
            </div>
          </div>
        )}
      />

      {detailRow && (
        <DataRegistryDetail
          row={detailRow}
          initialTab={detailTab}
          onClose={closeDetail}
          onSaved={() => listRef.current?.reload()}
          onTabChange={handleTabChange}
          recordNav={recordNav}
        />
      )}
    </>
  )
}
