<template>
  <CityModal
    :countriesList="countriesList"
    :areaRegionsList="areaRegionsList"
    :allDistrictsList="allDistrictsList"
    :cityTypesList="cityTypesList"
    :countryCityTypeMap="countryCityTypeMap"
    :justCreatedIds="justCreatedIds"
  />
  <ListPageWrapper>
    <div>
      <!-- Header + filters -->
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Населені пункти</h5>
          <button v-if="canCreate" class="btn btn-sm btn-success" @click="openCreateModal">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <select v-model="filterCountry" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">Всі країни</option>
            <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
          </select>
          <select v-model="filterOblast" class="form-select form-select-sm" style="width:auto" @change="onFilterOblastChange">
            <option value="">Всі області</option>
            <option v-for="a in areaRegionsList" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
          </select>
          <select v-model="filterDistrict" class="form-select form-select-sm" style="width:auto" :disabled="!filterOblast || !filteredDistrictsForFilter.length" @change="load(1)">
            <option value="">Всі райони</option>
            <option v-for="d in filteredDistrictsForFilter" :key="d.id" :value="d.id">{{ d.name_uk }}</option>
          </select>
          <select v-model="filterCityType" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">Всі типи</option>
            <option v-for="t in cityTypesList" :key="t.id" :value="t.id">{{ t.short_name_uk }}</option>
          </select>
          <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="all">Всі</option>
            <option value="active">Активні</option>
            <option value="inactive">Неактивні</option>
          </select>
          <div class="btn-group btn-group-sm">
            <button class="btn" :class="!filterCentersOnly ? 'btn-secondary' : 'btn-outline-secondary'" @click="filterCentersOnly = false; load(1)">Всі</button>
            <button class="btn" :class="filterCentersOnly  ? 'btn-primary'   : 'btn-outline-secondary'" @click="filterCentersOnly = true;  load(1)">Тільки центри</button>
          </div>
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
                  <th
                    v-for="col in cfg.table" :key="col.key"
                    :style="col.width ? `width:${col.width}px` : ''"
                    :class="[col.align === 'end' ? 'text-end' : '', col.sortable ? 'th-sortable' : '']"
                    @click="col.sortable ? toggleSort(col.key) : null"
                  >
                    {{ cfg.fields[col.key].label }}
                    <template v-if="col.sortable">
                      <i v-if="sortKey === col.key && sortDir === 'asc'"       class="bi bi-chevron-up ms-1"></i>
                      <i v-else-if="sortKey === col.key && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
                      <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                    </template>
                  </th>
                  <th style="width:60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <template v-for="col in cfg.table" :key="col.key">

                    <td v-if="col.key === 'id'" class="text-muted text-end">{{ row.id }}</td>

                    <!-- FK display -->
                    <td v-else-if="col.displayKey" class="text-muted small">{{ row[col.displayKey] ?? '—' }}</td>

                    <!-- Inline-editable names -->
                    <td v-else-if="col.inlineEditable && canEditField(col.key)">
                      <input
                        v-if="inlineCell?.id === row.id && inlineCell?.field === col.key"
                        :ref="el => { if (el) el.focus() }"
                        :value="inlineValue"
                        class="form-control form-control-sm"
                        @input="inlineValue = $event.target.value"
                        @blur="saveInline(row, col.key)"
                        @keydown.enter.prevent="saveInline(row, col.key)"
                        @keydown.escape="cancelInline"
                      />
                      <span v-else class="inline-editable d-inline-flex align-items-center gap-1" @click="startInline(row.id, col.key, row[col.key])">
                        {{ row[col.key] }}
                        <span v-if="col.key === 'name_uk' && row.is_center" class="badge bg-primary" style="font-size:.65em;font-weight:500">центр</span>
                      </span>
                    </td>

                    <!-- is_capital badge -->
                    <td v-else-if="col.key === 'is_capital'" class="text-center">
                      <span v-if="row.is_capital" class="badge bg-warning text-dark">Столиця</span>
                      <span v-else class="text-muted">—</span>
                    </td>

                    <!-- Status toggle -->
                    <td v-else-if="col.key === 'is_active'">
                      <button
                        v-if="canEditField('is_active')"
                        class="badge border-0 btn p-1"
                        :class="row.is_active ? 'bg-success' : 'bg-danger'"
                        :disabled="togglingId === row.id"
                        @click="toggleStatus(row)"
                      >
                        <span v-if="togglingId === row.id" class="spinner-border spinner-border-sm"></span>
                        <span v-else>{{ row.is_active ? 'Активний' : 'Неактивний' }}</span>
                      </button>
                      <span v-else class="badge" :class="row.is_active ? 'bg-success' : 'bg-danger'">
                        {{ row.is_active ? 'Активний' : 'Неактивний' }}
                      </span>
                    </td>

                    <td v-else>{{ row[col.key] ?? '—' }}</td>
                  </template>

                  <td class="text-nowrap">
                    <button v-if="canOpenModal || justCreatedIds.has(row.id)" class="btn btn-sm btn-outline-secondary me-1" @click="openModal(row)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button v-if="canDelete" class="btn btn-sm btn-outline-danger" title="Видалити" @click="deleteRow(row)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td :colspan="cfg.table.length + 1" class="text-center text-muted py-4">Немає даних</td>
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
  </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import CityModal from '@/components/CityModal.vue'
import { useAuth } from '@/composables/useAuth'
import cfg from './cities.config.json'

const { can, authHeaders } = useAuth()

function canEditField(key) {
  const field = cfg.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

const canCreate    = computed(() => can(cfg.createPermission))
const canDelete    = computed(() => can(cfg.deletePermission))
const canOpenModal = computed(() => Object.keys(cfg.fields).some(k => canEditField(k)))

// ── List state ────────────────────────────────────────────────────────────────
const items      = ref([])
const loading    = ref(true)
const error      = ref(null)
const page       = ref(1)
const total      = ref(0)
const totalPages = ref(1)

const filterStatus      = ref('all')
const filterCountry     = ref('')
const filterOblast      = ref('')
const filterDistrict    = ref('')
const filterCityType    = ref('')
const filterCentersOnly = ref(false)

// ── Sort ──────────────────────────────────────────────────────────────────────
const sortKey = ref(null)
const sortDir = ref('asc')

function toggleSort(key) {
  if (sortKey.value !== key) { sortKey.value = key; sortDir.value = 'asc' }
  else if (sortDir.value === 'asc') { sortDir.value = 'desc' }
  else { sortKey.value = null; sortDir.value = 'asc' }
  load(1)
}

// ── Reference lists ───────────────────────────────────────────────────────────
const countriesList       = ref([])
const areaRegionsList     = ref([])
const allDistrictsList    = ref([])
const cityTypesList       = ref([])
const countryCityTypeMap  = ref([])

// ── Filter cascade ────────────────────────────────────────────────────────────
const filteredDistrictsForFilter = computed(() =>
  allDistrictsList.value.filter(d => d.region_in_area_id === Number(filterOblast.value))
)

function onFilterOblastChange() {
  filterDistrict.value = ''
  load(1)
}

// ── Toggle / inline / modal state ─────────────────────────────────────────────
const togglingId     = ref(null)
const inlineCell     = ref(null)
const inlineValue    = ref('')
const justCreatedIds = ref(new Set())

// ── API ───────────────────────────────────────────────────────────────────────
async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const sort = sortKey.value ? `&sort_by=${sortKey.value}&sort_dir=${sortDir.value}` : ''
    const cid  = filterCountry.value  ? `&country_id=${filterCountry.value}` : ''
    const arid = (filterDistrict.value || filterOblast.value)
      ? `&area_region_id=${filterDistrict.value || filterOblast.value}` : ''
    const ctid = filterCityType.value   ? `&city_type_id=${filterCityType.value}` : ''
    const co   = filterCentersOnly.value ? '&centers_only=1' : ''
    const res  = await fetch(
      `${cfg.apiList}?per_page=50&page=${p}&status=${filterStatus.value}${cid}${arid}${ctid}${co}${sort}`,
      { headers: authHeaders() }
    )
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

async function patch(id, fields) {
  const res  = await fetch(`${cfg.apiUpdate}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
  return json.data
}

function applyToRow(id, updated) {
  const idx = items.value.findIndex(r => r.id === id)
  if (idx !== -1) Object.assign(items.value[idx], updated)
}

async function toggleStatus(row) {
  togglingId.value = row.id
  try {
    applyToRow(row.id, await patch(row.id, { is_active: !row.is_active }))
  } catch (e) { alert(e.message) }
  finally { togglingId.value = null }
}

function startInline(id, field, value) {
  inlineCell.value  = { id, field }
  inlineValue.value = value ?? ''
}

async function saveInline(row, field) {
  if (!inlineCell.value || inlineCell.value.id !== row.id) return
  const newVal = inlineValue.value
  cancelInline()
  if (newVal === (row[field] ?? '')) return
  try { applyToRow(row.id, await patch(row.id, { [field]: newVal })) }
  catch (e) { alert(e.message) }
}

function cancelInline() { inlineCell.value = null; inlineValue.value = '' }

async function deleteRow(row) {
  if (!confirm(`Видалити «${row.name_uk}»?`)) return
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

function openCreateModal() {
  window.dispatchEvent(new CustomEvent('open-city-create'))
}

function openModal(row) {
  window.dispatchEvent(new CustomEvent('open-city-edit', { detail: { row } }))
}

onMounted(async () => {
  const h = { headers: authHeaders() }
  const [cRes, arRes, distRes, ctRes, ctMapRes] = await Promise.all([
    fetch('/api/admin/geography/countries?per_page=300&status=all',   h),
    fetch('/api/admin/geography/areas?per_page=1000&status=all',      h),
    fetch('/api/admin/geography/districts?per_page=2000&status=all',  h),
    fetch('/api/admin/geography/city-types?per_page=500',             h),
    fetch('/api/admin/geography/country-city-types',                  h),
  ])
  countriesList.value      = (await cRes.json()).data      ?? []
  if (countriesList.value.length) {
    const first = [...countriesList.value].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))[0]
    filterCountry.value = first.id
  }
  areaRegionsList.value    = (await arRes.json()).data     ?? []
  allDistrictsList.value   = (await distRes.json()).data   ?? []
  cityTypesList.value      = (await ctRes.json()).data     ?? []
  countryCityTypeMap.value = (await ctMapRes.json()).data  ?? []
  load()

  // Listen for modal events
  window.addEventListener('city-created', (e) => {
    items.value.unshift(e.detail)
    justCreatedIds.value = new Set([...justCreatedIds.value, e.detail.id])
    total.value++
  })

  window.addEventListener('city-updated', (e) => {
    applyToRow(e.detail.id, e.detail.data)
  })
})
</script>

<style scoped>
.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: #e9ecef; }

.inline-editable {
  display: block; cursor: text; min-width: 80px;
  padding: 2px 4px; border-radius: 4px;
  border: 1px solid transparent; transition: border-color .15s;
}
.inline-editable:hover { border-color: #86b7fe; background: #f8f9fa; }
</style>
