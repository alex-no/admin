<template>
  <TimezoneAssignmentsModal
    :countriesList="countriesList"
    :areasList="areasList"
    :districtsList="districtsList"
  />
  <ListPageWrapper>
    <div>
      <!-- Header + filters -->
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <h5 class="mb-0">Таймзони</h5>
        <div class="d-flex gap-2 flex-wrap">
          <select
            v-model="filterOffset"
            class="form-select form-select-sm"
            style="width:auto"
            @change="load(1)"
          >
            <option value="">Всі UTC зміщення</option>
            <option
              v-for="o in offsetOptions"
              :key="o.utc_offset"
              :value="o.utc_offset"
            >{{ o.utc_offset }} ({{ o.count }})</option>
          </select>
          <input
            v-model="search"
            type="text"
            class="form-control form-select-sm"
            style="width:220px"
            placeholder="Пошук за назвою..."
            @input="debounceLoad"
          />
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
                  <th class="text-end th-sortable" style="width:55px" @click="toggleSort('id')">
                    ID <SortIcon col="id" :sortKey :sortDir />
                  </th>
                  <th class="th-sortable" @click="toggleSort('name')">
                    Назва <SortIcon col="name" :sortKey :sortDir />
                  </th>
                  <th class="th-sortable" style="width:130px" @click="toggleSort('utc_offset')">
                    UTC зміщення <SortIcon col="utc_offset" :sortKey :sortDir />
                  </th>
                  <th style="width:120px">Прив'язки</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <td class="text-muted text-end">{{ row.id }}</td>

                  <!-- Name inline edit -->
                  <td>
                    <input
                      v-if="inlineCell?.id === row.id && inlineCell?.field === 'name'"
                      :ref="el => { if (el) el.focus() }"
                      v-model="inlineValue"
                      type="text"
                      class="form-control form-control-sm"
                      style="min-width:220px"
                      @keydown.enter.prevent="commitInline(row)"
                      @keydown.esc.prevent="cancelInline"
                      @blur="commitInline(row)"
                    />
                    <span
                      v-else-if="canEdit"
                      class="inline-editable"
                      @click="startInline(row, 'name')"
                    >{{ row.name }}</span>
                    <span v-else>{{ row.name }}</span>
                    <span v-if="savingId === row.id && savingField === 'name'" class="ms-1">
                      <span class="spinner-border spinner-border-sm text-secondary" style="width:.7rem;height:.7rem"></span>
                    </span>
                  </td>

                  <!-- UTC offset inline edit -->
                  <td>
                    <input
                      v-if="inlineCell?.id === row.id && inlineCell?.field === 'utc_offset'"
                      :ref="el => { if (el) el.focus() }"
                      v-model="inlineValue"
                      type="text"
                      class="form-control form-control-sm"
                      style="width:100px"
                      placeholder="+03:00"
                      @keydown.enter.prevent="commitInline(row)"
                      @keydown.esc.prevent="cancelInline"
                      @blur="commitInline(row)"
                    />
                    <span
                      v-else-if="canEdit"
                      class="inline-editable font-monospace"
                      @click="startInline(row, 'utc_offset')"
                    >{{ row.utc_offset }}</span>
                    <span v-else class="font-monospace">{{ row.utc_offset }}</span>
                    <span v-if="savingId === row.id && savingField === 'utc_offset'" class="ms-1">
                      <span class="spinner-border spinner-border-sm text-secondary" style="width:.7rem;height:.7rem"></span>
                    </span>
                  </td>

                  <!-- Assignment count + button -->
                  <td>
                    <button
                      class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                      @click="openAssignments(row)"
                    >
                      <i class="bi bi-link-45deg"></i>
                      <span class="badge bg-secondary rounded-pill">{{ row.assignment_count }}</span>
                    </button>
                  </td>

                  <td>
                    <span v-if="inlineSaveError && inlineCell?.id === row.id"
                          class="text-danger" style="font-size:.7rem" :title="inlineSaveError">
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </span>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="5" class="text-center text-muted py-4">Таймзон не знайдено</td>
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
              <li v-for="p in visiblePages" :key="p" class="page-item" :class="{ active: p === page }">
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
  </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import TimezoneAssignmentsModal from '@/components/TimezoneAssignmentsModal.vue'
import { useAuth } from '@/composables/useAuth'

const { can, authHeaders } = useAuth()

const canEdit = computed(() => can('geography.timezones.edit') || can('*'))

// ── Inline sort icon ──────────────────────────────────────────────────────────
const SortIcon = {
  props: ['col', 'sortKey', 'sortDir'],
  template: `
    <i v-if="sortKey === col && sortDir === 'asc'"  class="bi bi-chevron-up ms-1"></i>
    <i v-else-if="sortKey === col && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
  `,
}

// ── List state ────────────────────────────────────────────────────────────────
const items         = ref([])
const loading       = ref(true)
const error         = ref(null)
const page          = ref(1)
const total         = ref(0)
const totalPages    = ref(1)
const search        = ref('')
const filterOffset  = ref('')
const sortKey       = ref('name')
const sortDir       = ref('asc')

// ── UTC offsets for filter dropdown ──────────────────────────────────────────
const offsetOptions = ref([])

async function loadOffsets() {
  try {
    const res  = await fetch('/api/admin/geography/timezones/offsets', { headers: authHeaders() })
    const json = await res.json()
    if (res.ok) offsetOptions.value = json.data ?? []
  } catch {}
}

const visiblePages = computed(() => {
  const range = 5
  const half  = Math.floor(range / 2)
  let start   = Math.max(1, page.value - half)
  let end     = Math.min(totalPages.value, start + range - 1)
  if (end - start < range - 1) start = Math.max(1, end - range + 1)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 350)
}

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const params = new URLSearchParams({ per_page: 50, page: p, sort_by: sortKey.value, sort_dir: sortDir.value })
    if (search.value.trim())  params.set('search',     search.value.trim())
    if (filterOffset.value)   params.set('utc_offset', filterOffset.value)
    const res  = await fetch(`/api/admin/geography/timezones?${params}`, { headers: authHeaders() })
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

function toggleSort(key) {
  if (sortKey.value !== key) { sortKey.value = key; sortDir.value = 'asc' }
  else if (sortDir.value === 'asc') { sortDir.value = 'desc' }
  else { sortKey.value = 'name'; sortDir.value = 'asc' }
  load(1)
}

// ── Inline editing ────────────────────────────────────────────────────────────
const inlineCell      = ref(null)
const inlineValue     = ref('')
const inlineOrig      = ref('')
const savingId        = ref(null)
const savingField     = ref(null)
const inlineSaveError = ref(null)

function startInline(row, field) {
  inlineCell.value      = { id: row.id, field }
  inlineValue.value     = row[field] ?? ''
  inlineOrig.value      = row[field] ?? ''
  inlineSaveError.value = null
}

function cancelInline() {
  inlineCell.value = null
}

async function commitInline(row) {
  if (!inlineCell.value || inlineCell.value.id !== row.id) return
  const field  = inlineCell.value.field
  const newVal = inlineValue.value.trim()
  inlineCell.value = null

  if (newVal === inlineOrig.value || newVal === '') return

  savingId.value    = row.id
  savingField.value = field
  inlineSaveError.value = null
  try {
    const res  = await fetch(`/api/admin/geography/timezones/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ [field]: newVal }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    row[field] = json.data[field]
  } catch (e) {
    inlineSaveError.value = e.message
    row[field] = inlineOrig.value
  } finally {
    savingId.value    = null
    savingField.value = null
  }
}

// ── Assignments popup ─────────────────────────────────────────────────────────
const countriesList  = ref([])
const areasList      = ref([])
const districtsList  = ref([])
const countriesLoaded = ref(false)
const areasLoaded    = ref(false)

function openAssignments(row) {
  if (!countriesLoaded.value) loadCountries()
  if (!areasLoaded.value) loadAreas()
  window.dispatchEvent(new CustomEvent('open-timezone-assignments', { detail: { row } }))
}

async function loadCountries() {
  try {
    const res  = await fetch('/api/admin/geography/countries?per_page=300&sort_by=name_uk', { headers: authHeaders() })
    const json = await res.json()
    if (res.ok) { countriesList.value = json.data ?? []; countriesLoaded.value = true }
  } catch {}
}

async function loadAreas() {
  try {
    const [areasRes, distRes] = await Promise.all([
      fetch('/api/admin/geography/areas?per_page=200&sort_by=name_uk',     { headers: authHeaders() }),
      fetch('/api/admin/geography/districts?per_page=500&sort_by=name_uk', { headers: authHeaders() }),
    ])
    const areasJson = await areasRes.json()
    const distJson  = await distRes.json()
    if (areasRes.ok) areasList.value     = areasJson.data ?? []
    if (distRes.ok)  districtsList.value = distJson.data  ?? []
    areasLoaded.value = true
  } catch {}
}

onMounted(() => {
  load()
  loadOffsets()

  // Listen for assignment events to update counters
  window.addEventListener('timezone-assignment-added', (e) => {
    const row = items.value.find(r => r.id === e.detail.timezone_id)
    if (row) row.assignment_count++
  })

  window.addEventListener('timezone-assignment-deleted', (e) => {
    const row = items.value.find(r => r.id === e.detail.timezone_id)
    if (row) row.assignment_count--
  })
})
</script>

<style scoped>
.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: #e9ecef; }

.inline-editable {
  display: inline-block;
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color .15s;
}
.inline-editable:hover {
  border-color: #86b7fe;
  background: #f8f9fa;
}
</style>
