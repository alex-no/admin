import { useState } from 'react'
import { DataTable } from '@/list-framework'
import DataRegistryDetail from './DataRegistryDetail'
import type { ColumnConfig, FilterConfig } from '@/list-framework'

const RECORD_TYPES = [
  { value: 'service', label: 'СТО' },
  { value: 'tire', label: 'Шиномонтаж' },
  { value: 'wash', label: 'Автомийка' },
]

export default function DataRegistry() {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const filterConfig: FilterConfig[] = [
    {
      key: 'search',
      type: 'search',
      placeholder: 'Пошук...',
    },
    {
      key: 'type',
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
  ]

  const columnsConfig: ColumnConfig[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '60px',
      align: 'right',
    },
    {
      key: 'name_uk',
      label: 'Назва',
      sortable: true,
    },
    {
      key: 'type',
      label: 'Тип',
      format: (value) => {
        const type = RECORD_TYPES.find(t => t.value === value)
        return (
          <span className={`badge ${getTypeBadge(value)}`}>
            {type?.label || value}
          </span>
        )
      },
    },
    {
      key: 'address',
      label: 'Адреса',
      format: (value) => (
        <span
          style={{
            maxWidth: '250px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'inline-block',
          }}
          title={value}
        >
          {value || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Телефон',
    },
    {
      key: 'rating',
      label: 'Рейтинг',
      sortable: true,
      width: '80px',
      align: 'center',
      format: (value) => value ? Number(value).toFixed(1) : '—',
    },
    {
      key: 'is_active',
      label: 'Статус',
      sortable: true,
      width: '100px',
      format: (value) => (
        <span className={`badge ${value ? 'bg-success' : 'bg-secondary'}`}>
          {value ? 'Активне' : 'Неактивне'}
        </span>
      ),
    },
  ]

  const actions = [
    {
      type: 'edit',
      label: 'Редагувати',
      icon: 'bi-pencil',
      handler: (row: any) => setSelectedId(row.id),
    },
  ]

  function getTypeBadge(type: string): string {
    switch (type) {
      case 'service':
        return 'bg-primary'
      case 'tire':
        return 'bg-warning text-dark'
      case 'wash':
        return 'bg-info'
      default:
        return 'bg-secondary'
    }
  }

  return (
    <div>
      <DataTable
        title="Реєстр даних"
        apiList="/admin/sto"
        apiUpdate="/admin/sto/{id}"
        apiDelete="/admin/sto/{id}"
        filterConfig={filterConfig}
        columnsConfig={columnsConfig}
        actions={actions}
        rowKey="id"
        defaultPerPage={50}
      />

      {selectedId !== null && (
        <DataRegistryDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
