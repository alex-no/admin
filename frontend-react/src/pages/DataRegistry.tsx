import { useRef, useState, useCallback } from 'react'
import { DataTable } from '@/list-framework'
import DataRegistryDetail from './DataRegistryDetail'
import type { ColumnConfig, FilterConfig, DataTableHandle } from '@/list-framework'

const RECORD_TYPES = [
  { value: 'service', label: 'СТО' },
  { value: 'tire', label: 'Шиномонтаж' },
  { value: 'wash', label: 'Автомийка' },
]

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
  const filterConfig: FilterConfig[] = [
    {
      key: 'search',
      type: 'search',
      placeholder: 'Пошук за назвою...',
    },
    {
      key: 'sto_type',
      type: 'select',
      placeholder: 'Всі типи',
      options: RECORD_TYPES,
    },
    {
      key: 'status',
      type: 'select',
      placeholder: 'Всі статуси',
      options: [
        { value: 'active', label: 'Активні' },
        { value: 'inactive', label: 'Неактивні' },
      ],
    },
    {
      key: 'country_id',
      type: 'select',
      placeholder: 'Всі країни',
      optionsUrl: '/admin/geography/countries',
      optionsValueKey: 'id',
      optionsLabelKey: 'name_uk',
    },
  ]

  const columnsConfig: ColumnConfig[] = [
    { key: 'id', label: 'ID', type: 'text', align: 'right', width: '60px', sortable: true },
    { key: 'name_uk', label: 'Назва', type: 'text', sortable: true, editable: true },
    {
      key: 'sto_type',
      label: 'Тип',
      type: 'select',
      sortable: true,
      editable: true,
      options: RECORD_TYPES,
    },
    { key: 'address', label: 'Адреса', type: 'text' },
    { key: 'phones', label: 'Телефони', type: 'phone-list', sortable: true },
    {
      key: 'rating',
      label: 'Рейтинг',
      type: 'number',
      align: 'right',
      width: '90px',
      sortable: true,
      editable: true,
      min: 0,
      max: 5,
      step: 0.05,
      icon: 'bi-star-fill text-warning',
    },
    {
      key: 'is_active',
      label: 'Статус',
      type: 'boolean',
      sortable: true,
      editable: true,
      trueLabel: 'Активне',
      falseLabel: 'Неактивне',
    },
  ]

  const actions = [
    { type: 'detail', label: 'Деталі', icon: 'bi-eye', handler: (r: any) => openDetail(r, 'general') },
    { type: 'detail', label: 'Контактні дані', icon: 'bi-telephone', handler: (r: any) => openDetail(r, 'contacts') },
    { type: 'detail', label: 'Опис', icon: 'bi-card-text', handler: (r: any) => openDetail(r, 'description') },
    { type: 'detail', label: 'Рейтинг та відгуки', icon: 'bi-star', handler: (r: any) => openDetail(r, 'rating') },
    { type: 'delete', label: 'Видалити', icon: 'bi-trash', permission: 'sto.delete' },
  ]

  return (
    <div>
      <DataTable
        ref={listRef}
        title="Реєстр даних"
        apiList="/admin/sto"
        apiUpdate="/admin/sto"
        apiDelete="/admin/sto"
        filterConfig={filterConfig}
        columnsConfig={columnsConfig}
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
