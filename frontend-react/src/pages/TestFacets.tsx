import { useState, useMemo } from 'react'
import FilterSidebar from '@/components/FilterSidebar'
import { apiGet } from '@/utils/api'

export default function TestFacets() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facetsData, setFacetsData] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    is_active: '',
    sto_type: '',
  })

  const sidebarGroups = useMemo(() => {
    if (!facetsData) return []

    const groups = []

    // is_active facet
    if (facetsData.is_active) {
      groups.push({
        field: 'is_active',
        label: 'Статус',
        values: facetsData.is_active.map((f: any) => ({
          value: f.value ? '1' : '0',
          label: f.label,
          count: f.count,
        })),
      })
    }

    // sto_type facet
    if (facetsData.sto_type) {
      groups.push({
        field: 'sto_type',
        label: 'Тип СТО',
        values: facetsData.sto_type.map((f: any) => ({
          value: f.value,
          label: f.label ?? f.value,
          count: f.count,
        })),
      })
    }

    return groups
  }, [facetsData])

  const facetsJson = useMemo(() => {
    return facetsData ? JSON.stringify(facetsData, null, 2) : 'Клацніть "Load Facets"'
  }, [facetsData])

  async function loadFacets(filters = activeFilters) {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: '1',
        per_page: '5',
        facets: 'is_active,sto_type',
      })

      // Apply active filters
      if (filters.is_active !== '') {
        params.set('is_active', filters.is_active)
      }
      if (filters.sto_type !== '') {
        params.set('sto_type', filters.sto_type)
      }

      const json = await apiGet<any>(`/api/admin/sto?${params}`)

      setFacetsData(json.facets ?? {})
      setItems(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }

  function handleToggle({ field, value }: { field: string; value: string }) {
    // If clicking on already active - reset
    const newFilters = { ...activeFilters }
    if (newFilters[field] === value) {
      newFilters[field] = ''
    } else {
      newFilters[field] = value
    }

    setActiveFilters(newFilters)

    // Reload facets with new filter (pass newFilters directly)
    loadFacets(newFilters)
  }

  return (
    <div className="container-fluid">
      <h5 className="mb-3">Task 11: Test Facets & FilterSidebar (React)</h5>

      <div className="d-flex">
        <FilterSidebar
          namespace="test-facets"
          groups={sidebarGroups}
          activeFilters={activeFilters}
          onToggle={handleToggle}
        />

        <div className="flex-grow-1 p-3">
          <div className="mb-3">
            <button className="btn btn-primary me-2" onClick={() => loadFacets()}>
              Load Facets from API
            </button>
            {loading && <span className="text-muted">Loading...</span>}
            {error && <span className="text-danger">{error}</span>}
          </div>

          <div className="row">
            <div className="col-md-6">
              <h6>Active Filters:</h6>
              <pre className="bg-light p-2">{JSON.stringify(activeFilters, null, 2)}</pre>
            </div>

            <div className="col-md-6">
              <h6>API Response (facets):</h6>
              <pre className="bg-light p-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {facetsJson}
              </pre>
            </div>
          </div>

          <div className="mt-3">
            <h6>List Items (первых 5):</h6>
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name_uk}</td>
                    <td>{item.sto_type}</td>
                    <td>
                      <span className={item.is_active ? 'badge bg-success' : 'badge bg-secondary'}>
                        {item.is_active ? 'Активне' : 'Неактивне'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
