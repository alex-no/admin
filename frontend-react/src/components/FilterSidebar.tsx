import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface FilterValue {
  value: string
  label?: string
  count: number
}

interface FilterGroup {
  field: string
  label: string
  values: FilterValue[]
}

interface FilterSidebarProps {
  namespace: string
  groups: FilterGroup[]
  activeFilters: Record<string, string>
  onToggle: (params: { field: string; value: string }) => void
}

export default function FilterSidebar({ namespace, groups, activeFilters, onToggle }: FilterSidebarProps) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const storageKey = `admin.filterSidebar:${namespace}`

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
      if (typeof stored.collapsed === 'boolean') {
        setCollapsed(stored.collapsed)
      }
    } catch {
      // Invalid JSON - ignore
    }
  }, [storageKey])

  function isActive(field: string, value: string) {
    return activeFilters[field] === value
  }

  function toggleCollapsed() {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    localStorage.setItem(storageKey, JSON.stringify({ collapsed: newCollapsed }))
  }

  return (
    <aside className={`filter-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {!collapsed && <h6 className="mb-0">{t('common.filter')}</h6>}
        <button
          className="btn btn-sm btn-link p-0"
          onClick={toggleCollapsed}
          title={collapsed ? t('filters.expand') : t('filters.collapse')}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} />
        </button>
      </div>

      {!collapsed && (
        <>
          {groups.map(group => (
            <div key={group.field} className="mb-3">
              <div className="text-muted small fw-semibold mb-2">{group.label}</div>
              {group.values.map(item => (
                <button
                  key={item.value}
                  className={`btn btn-sm w-100 text-start d-flex justify-content-between align-items-center mb-1 ${
                    isActive(group.field, item.value) ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                  onClick={() => onToggle({ field: group.field, value: item.value })}
                >
                  <span className="text-truncate">{item.label ?? item.value}</span>
                  <span
                    className={`badge ms-2 ${
                      isActive(group.field, item.value) ? 'bg-light text-dark' : 'bg-secondary'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </>
      )}

      <style>{`
        .filter-sidebar {
          min-width: 220px;
          max-width: 280px;
          padding: 1rem;
          background: var(--bs-secondary-bg);
          border-right: 1px solid var(--bs-border-color);
          transition: min-width 0.2s, max-width 0.2s;
        }

        .filter-sidebar.collapsed {
          min-width: 50px;
          max-width: 50px;
        }

        .filter-sidebar .btn {
          font-size: 0.875rem;
        }

        .filter-sidebar .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </aside>
  )
}
