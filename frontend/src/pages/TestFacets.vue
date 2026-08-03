<!-- Тестова сторінка для Task 11 (FilterSidebar + facets API) -->
<template>
  <div class="container-fluid">
    <h5 class="mb-3">Task 11: Test Facets & FilterSidebar</h5>

    <div class="d-flex">
      <!-- FilterSidebar -->
      <FilterSidebar
        namespace="test-facets"
        :groups="sidebarGroups"
        :active-filters="activeFilters"
        @toggle="handleToggle"
      />

      <!-- Main content -->
      <div class="flex-grow-1 p-3">
        <div class="mb-3">
          <button class="btn btn-primary me-2" @click="loadFacets">
            Load Facets from API
          </button>
          <span v-if="loading" class="text-muted">Loading...</span>
          <span v-if="error" class="text-danger">{{ error }}</span>
        </div>

        <div class="row">
          <div class="col-md-6">
            <h6>Active Filters:</h6>
            <pre class="bg-light p-2">{{ JSON.stringify(activeFilters, null, 2) }}</pre>
          </div>

          <div class="col-md-6">
            <h6>API Response (facets):</h6>
            <pre class="bg-light p-2" style="max-height: 400px; overflow-y: auto;">{{ facetsJson }}</pre>
          </div>
        </div>

        <div class="mt-3">
          <h6>List Items (первых 5):</h6>
          <table class="table table-sm table-bordered">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.name_uk }}</td>
                <td>{{ item.sto_type }}</td>
                <td>
                  <span :class="item.is_active ? 'badge bg-success' : 'badge bg-secondary'">
                    {{ item.is_active ? 'Активне' : 'Неактивне' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FilterSidebar from '@/components/FilterSidebar.vue'
import { useAuth } from '@/composables/useAuth'

const { authHeaders } = useAuth()

const loading = ref(false)
const error = ref(null)
const facetsData = ref(null)
const items = ref([])

// Активні фільтри (емітуються через @toggle)
const activeFilters = ref({
  is_active: '',
  sto_type: '',
})

// Групи для sidebar (генеруються з facets API response)
const sidebarGroups = computed(() => {
  if (!facetsData.value) return []

  const groups = []

  // is_active facet
  if (facetsData.value.is_active) {
    groups.push({
      field: 'is_active',
      label: 'Статус',
      values: facetsData.value.is_active.map(f => ({
        value: f.value ? '1' : '0',
        label: f.label,
        count: f.count,
      })),
    })
  }

  // sto_type facet
  if (facetsData.value.sto_type) {
    groups.push({
      field: 'sto_type',
      label: 'Тип СТО',
      values: facetsData.value.sto_type.map(f => ({
        value: f.value,
        label: f.label ?? f.value,
        count: f.count,
      })),
    })
  }

  return groups
})

const facetsJson = computed(() => {
  return facetsData.value ? JSON.stringify(facetsData.value, null, 2) : 'Клацніть "Load Facets"'
})

async function loadFacets() {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()
    params.set('page', '1')
    params.set('per_page', '5')
    params.set('facets', 'is_active,sto_type')

    // Застосовуємо активні фільтри
    if (activeFilters.value.is_active !== '') {
      params.set('is_active', activeFilters.value.is_active)
    }
    if (activeFilters.value.sto_type !== '') {
      params.set('sto_type', activeFilters.value.sto_type)
    }

    const res = await fetch(`/api/admin/sto?${params}`, {
      headers: authHeaders(),
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.message ?? 'Помилка завантаження')
    }

    facetsData.value = json.facets ?? {}
    items.value = json.data ?? []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function handleToggle({ field, value }) {
  // Якщо клацнули на вже активний — скидаємо
  if (activeFilters.value[field] === value) {
    activeFilters.value[field] = ''
  } else {
    activeFilters.value[field] = value
  }

  // Перезавантажуємо facets з новим фільтром
  loadFacets()
}
</script>
