<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="timezone-assignments-modal"
    :default-width="700"
    :min-width="550"
    :max-width="900"
    :default-height="650"
    :min-height="450"
    :max-height="850"
  >
    <template #title>
      <div>
        <h6 class="mb-0">Прив'язки таймзони</h6>
        <div class="text-muted small font-monospace">
          {{ asgnTz?.name }} ({{ asgnTz?.utc_offset }})
        </div>
      </div>
    </template>

    <!-- Existing assignments -->
    <div v-if="asgnLoading" class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
    </div>
    <div v-else-if="asgnError" class="alert alert-danger py-2 small">{{ asgnError }}</div>
    <template v-else>
      <div v-if="!asgnList.length" class="text-muted small mb-3">Прив'язок немає</div>
      <table v-else class="table table-sm align-middle small mb-3">
        <thead class="table-light">
          <tr>
            <th style="width:110px">Тип</th>
            <th>Назва</th>
            <th style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in asgnList" :key="a.id">
            <td>
              <span class="badge" :class="typeBadge(a.type)">{{ typeLabel(a.type) }}</span>
            </td>
            <td>{{ a.name }}</td>
            <td>
              <button
                v-if="canEdit"
                class="btn btn-sm btn-outline-danger p-0 px-1"
                :disabled="deletingAsgnId === a.id"
                title="Видалити прив'язку"
                @click="deleteAssignment(a)"
              >
                <span v-if="deletingAsgnId === a.id" class="spinner-border spinner-border-sm"></span>
                <i v-else class="bi bi-trash3"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Add new assignment -->
      <div v-if="canEdit" class="border-top pt-3">
        <div class="fw-semibold small mb-2">Додати прив'язку</div>
        <div class="row g-2 align-items-end">

          <!-- Type -->
          <div class="col-sm-4">
            <label class="form-label small mb-1">Тип</label>
            <select v-model="addType" class="form-select form-select-sm" @change="onAddTypeChange">
              <option value="">— Оберіть —</option>
              <option value="country">Країна</option>
              <option value="area_region">Регіон / Район</option>
              <option value="city">Місто</option>
            </select>
          </div>

          <!-- Object selector -->
          <div class="col-sm-6">
            <label class="form-label small mb-1">Об'єкт</label>

            <!-- Country: simple select -->
            <select v-if="addType === 'country'"
                    v-model="addObjectId"
                    class="form-select form-select-sm">
              <option :value="null">— Оберіть країну —</option>
              <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
            </select>

            <!-- Area/Region: simple select -->
            <select v-else-if="addType === 'area_region'"
                    v-model="addObjectId"
                    class="form-select form-select-sm">
              <option :value="null">— Оберіть регіон/район —</option>
              <optgroup v-if="areasList.length" label="Регіони (обл.)">
                <option v-for="a in areasList" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
              </optgroup>
              <optgroup v-if="districtsList.length" label="Райони">
                <option v-for="d in districtsList" :key="d.id" :value="d.id">{{ d.name_uk }}</option>
              </optgroup>
            </select>

            <!-- City: search input -->
            <div v-else-if="addType === 'city'" class="position-relative">
              <input
                ref="citySearchRef"
                v-model="citySearchTerm"
                type="text"
                class="form-control form-control-sm"
                :placeholder="addObjectId ? citySelectedName : 'Введіть назву міста...'"
                @input="debounceCitySearch"
                @focus="cityDropdownOpen = true"
              />
              <div v-if="cityDropdownOpen && (citySearchResults.length || citySearchLoading)"
                   class="dropdown-menu show w-100 p-0"
                   style="top:100%;max-height:180px;overflow-y:auto">
                <div v-if="citySearchLoading" class="text-center py-2">
                  <span class="spinner-border spinner-border-sm text-secondary"></span>
                </div>
                <button
                  v-for="c in citySearchResults"
                  :key="c.id"
                  type="button"
                  class="dropdown-item py-1 small"
                  @mousedown.prevent="selectCity(c)"
                >
                  <span class="text-muted me-1">{{ c.city_type_name ?? '' }}</span>
                  <strong>{{ c.name_uk }}</strong>
                  <span v-if="c.area_region_name" class="text-muted ms-1">({{ c.area_region_name }})</span>
                </button>
              </div>
            </div>

            <div v-else class="form-control form-control-sm bg-light text-muted">
              спочатку оберіть тип
            </div>
          </div>

          <div class="col-sm-2">
            <button
              class="btn btn-primary btn-sm w-100"
              :disabled="!addType || !addObjectId || addingAsgn"
              @click="addAssignment"
            >
              <span v-if="addingAsgn" class="spinner-border spinner-border-sm"></span>
              <span v-else>Додати</span>
            </button>
          </div>
        </div>
        <div v-if="addError" class="text-danger small mt-1">{{ addError }}</div>
      </div>
    </template>

    <template #footer>
      <div></div>
      <button class="btn btn-sm btn-secondary" @click="close">Закрити</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'

const { can, authHeaders } = useAuth()
const canEdit = ref(false)

// Props
const props = defineProps({
  countriesList: { type: Array, default: () => [] },
  areasList: { type: Array, default: () => [] },
  districtsList: { type: Array, default: () => [] },
})

// Component state
const visible = ref(false)

const asgnTz = ref(null)
const asgnList = ref([])
const asgnLoading = ref(false)
const asgnError = ref(null)
const deletingAsgnId = ref(null)

// Add form
const addType = ref('')
const addObjectId = ref(null)
const addingAsgn = ref(false)
const addError = ref(null)

// City search
const citySearchTerm = ref('')
const citySearchResults = ref([])
const citySearchLoading = ref(false)
const cityDropdownOpen = ref(false)
const citySelectedName = ref('')
const citySearchRef = ref(null)
let citySearchTimer = null

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає close() нижче —
// тому прибирання стану винесено сюди, в один watcher на будь-яке закриття.
watch(visible, (val, wasVisible) => {
  if (wasVisible && !val) {
    asgnTz.value = null
    asgnList.value = []
  }
})

function typeLabel(type) {
  return { country: 'Країна', area_region: 'Регіон/Район', city: 'Місто' }[type] ?? type
}

function typeBadge(type) {
  return { country: 'bg-primary', area_region: 'bg-warning text-dark', city: 'bg-info text-dark' }[type] ?? 'bg-secondary'
}

async function open(row) {
  canEdit.value = can('geography.timezones.edit') || can('*')
  asgnTz.value = row
  addType.value = ''
  addObjectId.value = null
  addError.value = null
  citySearchTerm.value = ''
  citySearchResults.value = []
  citySelectedName.value = ''
  cityDropdownOpen.value = false
  visible.value = true
  await loadAssignments()
}

async function loadAssignments() {
  asgnLoading.value = true
  asgnError.value = null
  try {
    const res = await fetch(`/api/admin/geography/timezones/${asgnTz.value.id}/assignments`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    asgnList.value = json.data ?? []
  } catch (e) {
    asgnError.value = e.message
  } finally {
    asgnLoading.value = false
  }
}

function onAddTypeChange() {
  addObjectId.value = null
  citySearchTerm.value = ''
  citySearchResults.value = []
  citySelectedName.value = ''
  cityDropdownOpen.value = false
}

// City search
function debounceCitySearch() {
  clearTimeout(citySearchTimer)
  addObjectId.value = null
  citySelectedName.value = ''
  if (citySearchTerm.value.length < 2) { citySearchResults.value = []; return }
  citySearchTimer = setTimeout(fetchCities, 300)
}

async function fetchCities() {
  citySearchLoading.value = true
  try {
    const p = new URLSearchParams({ search: citySearchTerm.value, per_page: 30, sort_by: 'name_uk' })
    const res = await fetch(`/api/admin/geography/cities?${p}`, { headers: authHeaders() })
    const json = await res.json()
    citySearchResults.value = res.ok ? (json.data ?? []) : []
  } catch { citySearchResults.value = [] }
  finally { citySearchLoading.value = false }
}

function selectCity(city) {
  addObjectId.value = city.id
  citySelectedName.value = city.name_uk
  citySearchTerm.value = city.name_uk
  citySearchResults.value = []
  cityDropdownOpen.value = false
}

async function addAssignment() {
  if (!addType.value || !addObjectId.value) return
  addingAsgn.value = true
  addError.value = null
  try {
    const res = await fetch(`/api/admin/geography/timezones/${asgnTz.value.id}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ type: addType.value, object_id: addObjectId.value }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    asgnList.value.push(json.data)
    // Notify parent to update counter
    window.dispatchEvent(new CustomEvent('timezone-assignment-added', { detail: { timezone_id: asgnTz.value.id } }))
    // Reset form
    addType.value = ''
    addObjectId.value = null
    citySearchTerm.value = ''
    citySelectedName.value = ''
  } catch (e) {
    addError.value = e.message
  } finally {
    addingAsgn.value = false
  }
}

async function deleteAssignment(asgn) {
  deletingAsgnId.value = asgn.id
  try {
    const res = await fetch(
      `/api/admin/geography/timezones/${asgnTz.value.id}/assignments/${asgn.id}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.message ?? 'Помилка')
    }
    asgnList.value = asgnList.value.filter(a => a.id !== asgn.id)
    // Notify parent to update counter
    window.dispatchEvent(new CustomEvent('timezone-assignment-deleted', { detail: { timezone_id: asgnTz.value.id } }))
  } catch (e) {
    alert(e.message)
  } finally {
    deletingAsgnId.value = null
  }
}

function close() {
  visible.value = false
}

onMounted(() => {
  window.addEventListener('open-timezone-assignments', (e) => {
    if (e.detail?.row) {
      open(e.detail.row)
    }
  })
})

defineExpose({ open, close })
</script>
