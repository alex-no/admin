import { useRef, useState, useCallback } from 'react'
import { DataTable } from '@/list-framework'
import DataRegistryDetail from './DataRegistryDetail'
import type { ColumnConfig, FilterConfig, ActionConfig, DataTableHandle } from '@/list-framework'

// Той самий конфіг, що читає Vue-версія (frontend/src/pages/StoRegistry.vue) —
// один екран описується одним конфігом, а не двома копіями.
// Див. shared/page-configs/README.md.
import filterConfig from '@configs/sto-registry.filter.json'
import columnsConfig from '@configs/sto-registry.columns.json'
import cfg from '@configs/sto-registry.config.json'

export default function DataRegistry() {
  const listRef = useRef<DataTableHandle>(null)
  const [detailRow, setDetailRow] = useState<any>(null)
  const [detailTab, setDetailTab] = useState('general')

  const openDetail = (row: any, tab: string) => {
    setDetailRow(row)
    setDetailTab(tab)
  }

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
          onClose={() => setDetailRow(null)}
          onSaved={() => listRef.current?.reload()}
        />
      )}
    </div>
  )
}
