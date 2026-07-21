<template>
  <CarBrandModal :countriesList="countriesList" :filterCountry="filterCountry" />
  <BaseLayout>
    <div :style="contentMargin" class="page-content-wrapper">
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Марки авто</h5>
          <button v-if="canCreate" class="btn btn-sm btn-success" @click="openCreateModal">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
        <div class="d-flex gap-2">
          <input
            v-model="search"
            type="text"
            class="form-control form-control-sm"
            style="width:200px"
            placeholder="Пошук за назвою..."
            @input="debounceLoad"
          />
          <select v-model="filterCountry" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option :value="null">Всі країни</option>
            <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
          </select>
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
                <th style="width:50px" class="text-end">ID</th>
                <th class="th-sortable" @click="toggleSort('name')">
                  Назва
                  <i v-if="sortKey === 'name' && sortDir === 'asc'"       class="bi bi-chevron-up ms-1"></i>
                  <i v-else-if="sortKey === 'name' && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
                  <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                </th>
                <th>Країна</th>
                <th class="th-sortable" style="width:120px" @click="toggleSort('founded_year')">
                  Рік заснув.
                  <i v-if="sortKey === 'founded_year' && sortDir === 'asc'"       class="bi bi-chevron-up ms-1"></i>
                  <i v-else-if="sortKey === 'founded_year' && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
                  <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                </th>
                <th>Сайт</th>
                <th style="width:60px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id">
                <td class="text-muted text-end">{{ row.id }}</td>
                <td>{{ row.name }}</td>
                <td class="text-muted">{{ row.country_name ?? '—' }}</td>
                <td class="text-muted">{{ row.founded_year ?? '—' }}</td>
                <td>
                  <a v-if="row.website" :href="row.website" target="_blank" rel="noopener" class="text-truncate d-inline-block" style="max-width:180px">
                    {{ row.website }}
                  </a>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="text-nowrap">
                  <button v-if="canEdit || justCreatedIds.has(row.id)" class="btn btn-sm btn-outline-secondary me-1" @click="openModal(row)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button v-if="canDelete" class="btn btn-sm btn-outline-danger" title="Видалити" @click="deleteRow(row)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="6" class="text-center text-muted py-4">Немає даних</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="text-muted small">Всього: {{ total }}</span>
          <nav v-if="totalPages > 1">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: page === 1 }">
                <button class="page-link" @click="load(page - 1)">‹</button>
              </li>
              <li v-for="p in totalPages" :key="p" class="page-item" :class="{ active: p === page }">
                <button class="page-link" @click="load(p)">{{ p }}</button>
              </li>
              <li class="page-item" :class="{ disabled: page === totalPages }">
                <button class="page-link" @click="load(page + 1)">›</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import CarBrandModal from '@/components/CarBrandModal.vue'
import { useAuth } from '@/composables/useAuth'
import { usePageLayout } from '@/composables/usePageLayout'
import cfg from './car-brands.config.json'

const { can, authHeaders } = useAuth()
const { contentMargin } = usePageLayout()

const canCreate = computed(() => can(cfg.createPermission))
const canDelete = computed(() => can(cfg.deletePermission))
const canEdit   = computed(() => can('catalog.car-brands.edit') || can(cfg.createPermission))

// ── State ─────────────────────────────────────────────────────────────────────
const items         = ref([])
const loading       = ref(true)
const error         = ref(null)
const page          = ref(1)
const total         = ref(0)
const totalPages    = ref(1)
const sortKey       = ref(null)
const sortDir       = ref('asc')
const search        = ref('')
const filterCountry = ref(null)
const countriesList = ref([])
const justCreatedIds = ref(new Set())

let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 350)
}

// ── List ──────────────────────────────────────────────────────────────────────
function toggleSort(key) {
  if (sortKey.value !== key) { sortKey.value = key; sortDir.value = 'asc' }
  else if (sortDir.value === 'asc') { sortDir.value = 'desc' }
  else { sortKey.value = null; sortDir.value = 'asc' }
  load(1)
}

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const sort = sortKey.value ? `&sort_by=${sortKey.value}&sort_dir=${sortDir.value}` : ''
    const q    = search.value.trim() ? `&search=${encodeURIComponent(search.value.trim())}` : ''
    const cid  = filterCountry.value !== null ? `&country_id=${filterCountry.value}` : ''
    const res  = await fetch(`${cfg.apiList}?per_page=200&page=${p}${sort}${q}${cid}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    items.value      = json.data ?? []
    total.value      = json.pagination?.total ?? 0
    totalPages.value = json.pagination?.total_pages ?? 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteRow(row) {
  if (!confirm(`Видалити марку «${row.name}»?`)) return
  try {
    const res  = await fetch(`${cfg.apiDelete}/${row.id}`, { method: 'DELETE', headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка видалення')
    items.value = items.value.filter(r => r.id !== row.id)
    justCreatedIds.value.delete(row.id)
    total.value--
  } catch (e) {
    alert(e.message)
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openCreateModal() {
  window.dispatchEvent(new CustomEvent('open-car-brand-create'))
}

function openModal(row) {
  window.dispatchEvent(new CustomEvent('open-car-brand-edit', { detail: { row } }))
}

function applyToRow(id, updated) {
  const idx = items.value.findIndex(r => r.id === id)
  if (idx !== -1) Object.assign(items.value[idx], updated)
}

onMounted(async () => {
  const res  = await fetch('/api/admin/geography/countries?per_page=300&status=active', { headers: authHeaders() })
  const json = await res.json()
  countriesList.value = (json.data ?? []).sort((a, b) => {
    if (a.order_num === null && b.order_num === null) return a.name_uk.localeCompare(b.name_uk)
    if (a.order_num === null) return 1
    if (b.order_num === null) return -1
    return a.order_num - b.order_num
  })
  load()

  // Listen for modal events
  window.addEventListener('car-brand-created', (e) => {
    items.value.unshift(e.detail)
    justCreatedIds.value = new Set([...justCreatedIds.value, e.detail.id])
    total.value++
  })

  window.addEventListener('car-brand-updated', (e) => {
    applyToRow(e.detail.id, e.detail.data)
  })
})
</script>

<style scoped>
.page-content-wrapper {
  transition: margin 0.3s ease;
}

.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: #e9ecef; }
</style>
