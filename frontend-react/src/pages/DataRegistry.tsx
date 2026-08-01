import { useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable } from '@/list-framework'
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
  const listRef = useRef<DataTableHandle>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailRow, setDetailRow] = useState<any>(null)
  const [detailTab, setDetailTab] = useState('general')

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
    setSearchParams(params, { replace: true })
  }

  const closeDetail = () => {
    setDetailRow(null)
    // Видаляємо detail з URL
    const params = new URLSearchParams(searchParams)
    params.delete('detail')
    params.delete('tab')
    setSearchParams(params, { replace: true })
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
          setSearchParams(params, { replace: true })
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
  // actions[] у конфізі — без обробників: JSON описує type/label/icon/permission/tab,
  // а що робить дія, вирішує сторінка. 'delete' таблиця обробляє сама через apiDelete.
  const actions: ActionConfig[] = (cfg.actions as ActionConfig[]).map((a) =>
    a.type === 'detail'
      ? { ...a, handler: (r: any) => openDetail(r, a.tab ?? 'general') }
      : a
  )

  return (
    <div>
      <DataTable
        ref={listRef}
        title="Реєстр даних"
        apiList={cfg.apiList}
        apiUpdate={cfg.apiUpdate}
        apiDelete={cfg.apiDelete}
        apiCreate={cfg.apiCreate}
        createPermission={cfg.createPermission}
        createFields={cfg.createFields}
        apiBulk={cfg.apiBulk}
        bulkActions={cfg.bulkActions as BulkActionConfig[]}
        filterConfig={filterConfig as FilterConfig[]}
        columnsConfig={columnsConfig as ColumnConfig[]}
        actions={actions}
        rowKey="id"
        defaultPerPage={50}
        onRowUpdated={syncDetailRow}
      />

      {detailRow && (
        <DataRegistryDetail
          row={detailRow}
          initialTab={detailTab}
          onClose={closeDetail}
          onSaved={() => listRef.current?.reload()}
        />
      )}
    </div>
  )
}
