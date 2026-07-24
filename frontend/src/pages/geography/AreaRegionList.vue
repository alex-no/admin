<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <ListPageWrapper>
    <div>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <h5 class="mb-0">{{ title }}</h5>
        <button v-if="canCreate" class="btn btn-sm btn-success" @click="openCreateModal">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <!-- Country filter -->
        <select v-model="filterCountry" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">Всі країни</option>
          <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
        </select>

        <!-- Area filter (Districts page only) -->
        <select v-if="hasAreaFilter" v-model="filterArea" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">Всі регіони</option>
          <option v-for="a in areasList" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
        </select>

        <!-- Status filter -->
        <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="all">Всі</option>
          <option value="active">Активні</option>
          <option value="inactive">Неактивні</option>
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
                <th
                  v-for="col in cfg.table"
                  :key="col.key"
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

                  <!-- ID -->
                  <td v-if="col.key === 'id'" class="text-muted text-end">{{ row.id }}</td>

                  <!-- FK display columns (country, area) -->
                  <td v-else-if="col.displayKey" class="text-muted small">{{ row[col.displayKey] }}</td>

                  <!-- Inline-editable name fields -->
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
                    <span v-else class="inline-editable" @click="startInline(row.id, col.key, row[col.key])">
                      {{ row[col.key] }}
                    </span>
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

                  <!-- Plain text -->
                  <td v-else>{{ row[col.key] ?? '—' }}</td>

                </template>

                <!-- Pencil + Trash -->
                <td class="text-nowrap">
                  <button
                    v-if="canOpenModal || justCreatedIds.has(row.id)"
                    class="btn btn-sm btn-outline-secondary me-1"
                    title="Редагувати"
                    @click="openModal(row)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    v-if="canDelete"
                    class="btn btn-sm btn-outline-danger"
                    title="Видалити"
                    @click="deleteRow(row)"
                  >
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

  <!-- ── Edit Modal ──────────────────────────────────────────────────────── -->
  <BaseModal
    v-model:visible="modalOpen"
    storage-key="area-region-modal"
    :default-width="750"
    :min-width="600"
    :max-width="1000"
    :default-height="550"
    :min-height="450"
    :max-height="800"
  >
    <template #title>
      <h5 class="mb-0">{{ modalMode === 'create' ? 'Новий запис' : 'Редагування' }}</h5>
    </template>

    <div class="row g-3">
      <template v-for="mf in cfg.modal" :key="mf.key">
        <div :class="`col-sm-${mf.col}`">
          <label class="form-label small mb-1">{{ cfg.fields[mf.key].label }}</label>

          <!-- ID – read only, hidden in create mode -->
          <template v-if="mf.key === 'id'">
            <div v-if="modalMode === 'edit'" class="readonly-field">{{ modalData.id }}</div>
            <div v-else class="readonly-field text-muted">—</div>
          </template>

          <!-- country_id select -->
          <template v-else-if="mf.key === 'country_id'">
            <select v-if="canEditInModal('country_id')" v-model.number="modalForm.country_id" class="form-select form-select-sm">
              <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
            </select>
            <div v-else class="readonly-field">{{ modalData.country_name }}</div>
          </template>

          <!-- region_in_area_id select -->
          <template v-else-if="mf.key === 'region_in_area_id'">
            <select v-if="canEditInModal('region_in_area_id')" v-model.number="modalForm.region_in_area_id" class="form-select form-select-sm">
              <option :value="null">— не вказано —</option>
              <option v-for="a in areasList" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
            </select>
            <div v-else class="readonly-field">{{ modalData.area_name ?? '—' }}</div>
          </template>

          <!-- center_city_id autocomplete -->
          <template v-else-if="mf.key === 'center_city_id'">
            <div v-if="canEditInModal('center_city_id')" class="city-autocomplete-wrap">
              <div class="input-group input-group-sm">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  :placeholder="citySearchPlaceholder"
                  v-model="citySearch"
                  @input="onCitySearchInput"
                  @focus="cityDropdownOpen = true"
                  @blur="onCitySearchBlur"
                  autocomplete="off"
                />
                <button v-if="modalForm.center_city_id" type="button" class="btn btn-outline-secondary" @click="clearCenterCity" title="Очистити">×</button>
              </div>
              <ul v-if="cityDropdownOpen && cityResults.length" class="city-dropdown list-unstyled">
                <li v-for="city in cityResults" :key="city.id" class="city-option" @mousedown.prevent="selectCenterCity(city)">
                  {{ city.name_uk }}
                  <span v-if="city.area_region_name" class="text-muted ms-1 small">{{ city.area_region_name }}</span>
                </li>
              </ul>
              <div v-if="cityDropdownOpen && citySearchLoading" class="city-dropdown-info text-muted small px-2 py-1">Пошук...</div>
              <div v-if="cityDropdownOpen && !citySearchLoading && citySearch.length >= 2 && !cityResults.length" class="city-dropdown-info text-muted small px-2 py-1">Нічого не знайдено</div>
            </div>
            <div v-else class="readonly-field">{{ modalData.center_city_name ?? '—' }}</div>
          </template>

          <!-- is_active switch -->
          <template v-else-if="mf.key === 'is_active'">
            <div v-if="canEditInModal('is_active')" class="form-check form-switch mt-1 mb-0">
              <input v-model="modalForm.is_active" type="checkbox" class="form-check-input" :id="`modal-active-${modalData.id}`" role="switch" />
              <label class="form-check-label" :for="`modal-active-${modalData.id}`">
                {{ modalForm.is_active ? 'Активний' : 'Неактивний' }}
              </label>
            </div>
            <div v-else>
              <span class="badge" :class="modalData.is_active ? 'bg-success' : 'bg-danger'">
                {{ modalData.is_active ? 'Активний' : 'Неактивний' }}
              </span>
            </div>
          </template>

          <!-- timestamps – hidden in create mode -->
          <template v-else-if="cfg.fields[mf.key].type === 'datetime'">
            <div v-if="modalMode === 'edit'" class="readonly-field text-muted small">{{ modalData[mf.key] }}</div>
            <div v-else class="readonly-field text-muted">—</div>
          </template>

          <!-- regular text input -->
          <template v-else>
            <input v-if="canEditInModal(mf.key)" v-model="modalForm[mf.key]" class="form-control form-control-sm" />
            <div v-else class="readonly-field">{{ modalData[mf.key] ?? '—' }}</div>
          </template>

        </div>
      </template>
    </div>

    <div v-if="saveError" class="alert alert-danger small mt-3 mb-0">{{ saveError }}</div>

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-secondary btn-sm" @click="closeModal">Скасувати</button>
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveModal">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          Зберегти
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  cfg:           { type: Object, required: true },
  title:         { type: String, required: true },
  hasAreaFilter: { type: Boolean, default: false },
})

const { can, authHeaders } = useAuth()

// ── Config helpers ────────────────────────────────────────────────────────────
function canEditField(key) {
  const field = props.cfg.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

function canEditInModal(key) {
  const field = props.cfg.fields[key]
  if (!field?.editable) return false
  if (modalMode.value === 'create' || justCreatedIds.value.has(modalData.value.id)) {
    if (field.createPermissions) return field.createPermissions.some(p => can(p))
    return field.type !== 'integer' && field.type !== 'datetime'
  }
  return canEditField(key)
}

const canCreate    = computed(() => can(props.cfg.createPermission))
const canDelete    = computed(() => can(props.cfg.deletePermission))
const canOpenModal = computed(() => Object.keys(props.cfg.fields).some(k => canEditField(k)))

// ── List state ────────────────────────────────────────────────────────────────
const items       = ref([])
const loading     = ref(true)
const error       = ref(null)
const page        = ref(1)
const total       = ref(0)
const totalPages  = ref(1)

const filterStatus  = ref('all')
const filterCountry = ref('')
const filterArea    = ref('')

// ── Sort state ────────────────────────────────────────────────────────────────
const sortKey = ref(null)
const sortDir = ref('asc')

function toggleSort(key) {
  if (sortKey.value !== key) {
    sortKey.value = key
    sortDir.value = 'asc'
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc'
  } else {
    sortKey.value = null
    sortDir.value = 'asc'
  }
  load(1)
}

// ── Filter lists ──────────────────────────────────────────────────────────────
const countriesList = ref([])
const areasList     = ref([])

async function loadCountries() {
  try {
    const res  = await fetch('/api/admin/geography/countries?per_page=300&status=all', { headers: authHeaders() })
    const json = await res.json()
    countriesList.value = json.data ?? []
    if (!filterCountry.value && countriesList.value.length) {
      const first = [...countriesList.value].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))[0]
      filterCountry.value = first.id
    }
  } catch {}
}

async function loadAreas() {
  try {
    const res  = await fetch('/api/admin/geography/areas?per_page=500&status=all', { headers: authHeaders() })
    const json = await res.json()
    areasList.value = json.data ?? []
  } catch {}
}

// ── City autocomplete ─────────────────────────────────────────────────────────
const citySearch        = ref('')
const cityResults       = ref([])
const cityDropdownOpen  = ref(false)
const citySearchLoading = ref(false)
const citySearchPlaceholder = computed(() =>
  modalForm.value.center_city_id ? (modalData.value.center_city_name ?? '') : 'Пошук міста...'
)
let citySearchTimer = null

function onCitySearchInput() {
  cityDropdownOpen.value = true
  clearTimeout(citySearchTimer)
  if (citySearch.value.length < 2) { cityResults.value = []; return }
  citySearchTimer = setTimeout(fetchCities, 300)
}

async function fetchCities() {
  citySearchLoading.value = true
  try {
    const q    = encodeURIComponent(citySearch.value)
    const cid  = modalForm.value.country_id ? `&country_id=${modalForm.value.country_id}` : ''
    const res  = await fetch(`/api/admin/geography/cities?per_page=15&status=active&search=${q}${cid}`, { headers: authHeaders() })
    const json = await res.json()
    cityResults.value = json.data ?? []
  } catch { cityResults.value = [] }
  finally { citySearchLoading.value = false }
}

function selectCenterCity(city) {
  modalForm.value.center_city_id = city.id
  modalData.value.center_city_name = city.name_uk
  citySearch.value = city.name_uk
  cityResults.value = []
  cityDropdownOpen.value = false
}

function clearCenterCity() {
  modalForm.value.center_city_id = null
  modalData.value.center_city_name = null
  citySearch.value = ''
  cityResults.value = []
}

function onCitySearchBlur() {
  setTimeout(() => { cityDropdownOpen.value = false }, 150)
}

// ── Toggle state ──────────────────────────────────────────────────────────────
const togglingId = ref(null)

// ── Inline edit state ─────────────────────────────────────────────────────────
const inlineCell  = ref(null)
const inlineValue = ref('')

// ── Modal state ───────────────────────────────────────────────────────────────
const modalMode      = ref('edit')
const modalOpen      = ref(false)
const modalData      = ref({})
const modalForm      = ref({})
const saving         = ref(false)
const saveError      = ref(null)
const justCreatedIds = ref(new Set())

// ── API ───────────────────────────────────────────────────────────────────────
async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const sort   = sortKey.value ? `&sort_by=${sortKey.value}&sort_dir=${sortDir.value}` : ''
    const cid    = filterCountry.value ? `&country_id=${filterCountry.value}` : ''
    const aid    = filterArea.value    ? `&area_id=${filterArea.value}`       : ''
    const res    = await fetch(
      `${props.cfg.apiList}?per_page=50&page=${p}&status=${filterStatus.value}${cid}${aid}${sort}`,
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
  const res  = await fetch(`${props.cfg.apiUpdate}/${id}`, {
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

// ── Toggle status ─────────────────────────────────────────────────────────────
async function toggleStatus(row) {
  togglingId.value = row.id
  try {
    const updated = await patch(row.id, { is_active: !row.is_active })
    applyToRow(row.id, updated)
  } catch (e) {
    alert(e.message)
  } finally {
    togglingId.value = null
  }
}

// ── Inline edit ───────────────────────────────────────────────────────────────
function startInline(id, field, value) {
  inlineCell.value  = { id, field }
  inlineValue.value = value ?? ''
}

async function saveInline(row, field) {
  if (!inlineCell.value || inlineCell.value.id !== row.id) return
  const newVal = inlineValue.value
  cancelInline()
  if (newVal === (row[field] ?? '')) return
  try {
    const updated = await patch(row.id, { [field]: newVal })
    applyToRow(row.id, updated)
  } catch (e) {
    alert(e.message)
  }
}

function cancelInline() {
  inlineCell.value  = null
  inlineValue.value = ''
}

// ── Delete ────────────────────────────────────────────────────────────────
async function deleteRow(row) {
  if (!confirm(`Видалити «${row.name_uk}»?`)) return
  try {
    const res  = await fetch(`${props.cfg.apiDelete}/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
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
const emptyForm = () => ({ country_id: '', region_in_area_id: null, center_city_id: null, name_uk: '', name_en: '', name_ru: '', region_code: '', is_active: true })

function openCreateModal() {
  modalMode.value = 'create'
  modalData.value = {}
  modalForm.value = emptyForm()
  citySearch.value = ''
  cityResults.value = []
  saveError.value = null
  modalOpen.value = true
}

function openModal(row) {
  modalMode.value = 'edit'
  modalData.value = { ...row }
  modalForm.value = {
    country_id:        row.country_id,
    region_in_area_id: row.region_in_area_id ?? null,
    center_city_id:    row.center_city_id ?? null,
    name_uk:           row.name_uk,
    name_en:           row.name_en,
    name_ru:           row.name_ru,
    region_code:       row.region_code,
    is_active:         row.is_active,
  }
  citySearch.value = row.center_city_name ?? ''
  cityResults.value = []
  saveError.value = null
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function saveModal() {
  saving.value    = true
  saveError.value = null
  try {
    const editable = ['country_id', 'region_in_area_id', 'center_city_id', 'name_uk', 'name_en', 'name_ru', 'region_code', 'is_active']
    const fields   = {}
    for (const key of editable) {
      if (canEditInModal(key)) fields[key] = modalForm.value[key]
    }
    if (modalMode.value === 'create') {
      const res  = await fetch(props.cfg.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      items.value.unshift(json.data)
      justCreatedIds.value = new Set([...justCreatedIds.value, json.data.id])
      total.value++
    } else {
      applyToRow(modalData.value.id, await patch(modalData.value.id, fields))
    }
    closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadCountries()
  if (props.hasAreaFilter) await loadAreas()
  load()
})
</script>

<style scoped>
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.th-sortable:hover { background: #e9ecef; }

.inline-editable {
  display: block;
  cursor: text;
  min-width: 80px;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color .15s;
}
.inline-editable:hover {
  border-color: #86b7fe;
  background: #f8f9fa;
}

.readonly-field {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}

.city-autocomplete-wrap { position: relative; }
.city-dropdown {
  position: absolute; z-index: 1060; left: 0; right: 0;
  background: #fff; border: 1px solid #dee2e6; border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
  max-height: 220px; overflow-y: auto; margin-top: 2px;
}
.city-option {
  padding: 6px 10px; cursor: pointer; font-size: .85rem;
}
.city-option:hover { background: #e9f0ff; }
.city-dropdown-info {
  border: 1px solid #dee2e6; border-radius: 4px;
  margin-top: 2px; background: #fff;
}
</style>
