<template>
  <ErrorLogDetailModal />
  <ErrorLogCleanupModal />
  <ListPageWrapper>
    <div>
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Логи помилок</h5>
          <router-link to="/error-logs/stats" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-bar-chart"></i> Статистика
          </router-link>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <input
            v-model="search"
            type="text"
            class="form-control form-control-sm"
            style="width:220px"
            placeholder="Пошук..."
            @input="debounceLoad"
          />
          <select v-model="filterLevel" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">Всі рівні</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="alert">Alert</option>
            <option value="emergency">Emergency</option>
          </select>
          <input
            v-model="filterDateFrom"
            type="date"
            class="form-control form-control-sm"
            style="width:auto"
            @change="load(1)"
          />
          <input
            v-model="filterDateTo"
            type="date"
            class="form-control form-control-sm"
            style="width:auto"
            @change="load(1)"
          />
          <button class="btn btn-sm btn-outline-danger" @click="openCleanup">
            <i class="bi bi-trash"></i> Очистити
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:60px" class="text-end">ID</th>
                <th style="width:90px" class="th-sortable" @click="toggleSort('level')">
                  Рівень <SortIcon col="level" :sortKey :sortDir />
                </th>
                <th>Категорія</th>
                <th>Повідомлення</th>
                <th>Exception</th>
                <th>Файл</th>
                <th style="width:140px" class="th-sortable" @click="toggleSort('created_at')">
                  Дата <SortIcon col="created_at" :sortKey :sortDir />
                </th>
                <th style="width:50px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id" :class="rowClass(row.level)">
                <td class="text-muted text-end">{{ row.id }}</td>
                <td><span :class="levelBadge(row.level)">{{ row.level }}</span></td>
                <td class="text-muted small">{{ row.category || '—' }}</td>
                <td>
                  <div class="text-truncate" style="max-width: 400px" :title="row.message">
                    {{ row.message }}
                  </div>
                </td>
                <td class="text-muted small">
                  <div class="text-truncate" style="max-width: 250px" :title="row.exception_class">
                    {{ shortException(row.exception_class) }}
                  </div>
                </td>
                <td class="text-muted small">
                  <div class="text-truncate" style="max-width: 200px" :title="row.file">
                    {{ shortFile(row.file) }}<span v-if="row.line">:{{ row.line }}</span>
                  </div>
                </td>
                <td class="text-muted" style="white-space:nowrap">
                  {{ formatDate(row.created_at) }}
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" @click="openDetail(row.id)" title="Детальна інформація">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="8" class="text-center text-muted py-4">Немає даних</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="text-muted small">Всього: {{ total }}</span>
          <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
        </div>
      </div>
    </div>
    </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '../components/ListPageWrapper.vue'
import SortIcon from '../components/SortIcon.vue'
import Pagination from '../components/Pagination.vue'
import ErrorLogDetailModal from '../components/ErrorLogDetailModal.vue'
import ErrorLogCleanupModal from '../components/ErrorLogCleanupModal.vue'
import { useUrlFilters } from '../composables/useUrlFilters'
import { formatDate } from '../utils/date'

const items = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const perPage = ref(50)
const total = ref(0)
const search = ref('')
const filterLevel = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const sortKey = ref('created_at')
const sortDir = ref('DESC')
const detailId = ref(null)

// Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    level: filterLevel,
    date_from: filterDateFrom,
    date_to: filterDateTo,
    page
  },
  sorting: {
    sortKey,
    sortDir
  },
  detail: {
    id: detailId,
    onOpen: (id) => {
      window.dispatchEvent(new CustomEvent('open-error-log-detail', { detail: { id } }))
    }
  }
})


const totalPages = computed(() => Math.ceil(total.value / perPage.value))

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load(p = 1) {
  loading.value = true
  error.value = ''
  page.value = p

  const params = new URLSearchParams({
    page: page.value,
    per_page: perPage.value,
    sort_by: sortKey.value,
    sort_dir: sortDir.value,
  })
  if (search.value) params.set('search', search.value)
  if (filterLevel.value) params.set('level', filterLevel.value)
  if (filterDateFrom.value) params.set('date_from', filterDateFrom.value)
  if (filterDateTo.value) params.set('date_to', filterDateTo.value)

  try {
    const res = await fetch(`/api/admin/error-logs?${params}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status === 'success') {
      items.value = json.data
      total.value = json.pagination.total
    } else {
      error.value = json.message || 'Помилка завантаження'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function toggleSort(col) {
  if (sortKey.value === col) {
    sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortKey.value = col
    sortDir.value = 'DESC'
  }
  load(1)
}

let debounceTimer
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 400)
}

function openDetail(id) {
  detailId.value = id
  window.dispatchEvent(new CustomEvent('open-error-log-detail', { detail: { id } }))
}

function openCleanup() {
  window.dispatchEvent(new CustomEvent('open-error-log-cleanup'))
}

function levelBadge(level) {
  const map = {
    error: 'badge bg-danger',
    critical: 'badge bg-danger',
    alert: 'badge bg-warning text-dark',
    emergency: 'badge bg-dark',
    warning: 'badge bg-warning text-dark',
  }
  return map[level] || 'badge bg-secondary'
}

function rowClass(level) {
  if (level === 'critical' || level === 'emergency') return 'table-danger'
  if (level === 'error') return 'table-warning'
  return ''
}

function shortException(str) {
  if (!str) return '—'
  const parts = str.split('\\')
  return parts[parts.length - 1]
}

function shortFile(str) {
  if (!str) return '—'
  const parts = str.split('/')
  return parts.slice(-2).join('/')
}


onMounted(() => {
  initFromUrl()
  load(page.value)

  // Listen for detail closed
  window.addEventListener('error-log-detail-closed', () => {
    detailId.value = null
  })

  // Listen for cleanup event
  window.addEventListener('error-logs-cleaned', () => {
    load(page.value)
  })
})
</script>

<style scoped>
.th-sortable {
  cursor: pointer;
  user-select: none;
}
.th-sortable:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
