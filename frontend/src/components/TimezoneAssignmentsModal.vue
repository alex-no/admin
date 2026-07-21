<template>
  <Teleport to="body">
    <!-- Backdrop только для floating режима -->
    <div
      v-if="visible && mode === 'floating'"
      class="modal-backdrop-simple"
      @click="close"
    ></div>

    <!-- Модальное окно -->
    <div
      v-if="visible"
      ref="modalRef"
      class="modal-window"
      :class="[
        `modal-window--${mode}`,
        cursorClass,
      ]"
      :style="mode === 'floating' ? floatingStyle : mode === 'docked-right' ? dockedRightStyle : dockedBottomStyle"
    >
      <!-- Resize handle для docked режимов -->
      <div
        v-if="mode === 'docked-right'"
        class="resize-handle resize-handle--left"
        @mousedown="startResize"
      ></div>
      <div
        v-if="mode === 'docked-bottom'"
        class="resize-handle resize-handle--top"
        @mousedown="startResize"
      ></div>

      <div class="card shadow h-100 d-flex flex-column" style="overflow:hidden; border-radius: 0;">
        <div
          class="card-header d-flex justify-content-between align-items-center px-4 py-3"
          :class="isDraggable ? 'cursor-grab' : ''"
          @mousedown="isDraggable && modalRef ? startDrag($event, modalRef) : null"
        >
          <div>
            <h6 class="mb-0">Прив'язки таймзони</h6>
            <div class="text-muted small font-monospace">
              {{ asgnTz?.name }} ({{ asgnTz?.utc_offset }})
            </div>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <button
              class="btn btn-sm btn-outline-secondary"
              @mousedown.stop
              @click="cycleMode"
              :title="getModeSwitchTitle()"
            >
              <i :class="getModeIcon()"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" @mousedown.stop @click="close">✕</button>
          </div>
        </div>

        <div class="card-body px-4 py-3" style="flex:1; overflow-y:auto;">
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
        </div>

        <div class="card-footer px-4 py-3 bg-light text-end">
          <button class="btn btn-sm btn-secondary" @click="close">Закрити</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'
import { useAuth } from '@/composables/useAuth'

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
const modalRef = ref(null)

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

// Modal window composable
const {
  mode,
  floatingStyle,
  dockedRightStyle,
  dockedBottomStyle,
  contentMargin,
  cursorClass,
  isDragging,
  isDraggable,
  startDrag,
  startResize,
  cycleMode,
} = useModalWindow({
  storageKey: 'timezone-assignments-modal',
  mode: 'floating',
  defaultWidth: 700,
  minWidth: 550,
  maxWidth: 900,
  defaultHeight: 650,
  minHeight: 450,
  maxHeight: 850,
})

// Отправляем событие об изменении margin для родительской страницы
watch([visible, contentMargin], () => {
  if (visible.value) {
    window.dispatchEvent(
      new CustomEvent('modal-content-margin-change', {
        detail: contentMargin.value,
      })
    )
  } else {
    window.dispatchEvent(
      new CustomEvent('modal-content-margin-change', {
        detail: {},
      })
    )
  }
}, { deep: true })

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
  asgnTz.value = null
  asgnList.value = []
}

function handleEscape(e) {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
}

function getModeIcon() {
  if (mode.value === 'floating') return 'bi bi-layout-sidebar-reverse'
  if (mode.value === 'docked-right') return 'bi bi-window-dock'
  if (mode.value === 'docked-bottom') return 'bi bi-window'
  return 'bi bi-window'
}

function getModeSwitchTitle() {
  if (mode.value === 'floating') return 'Закріпити справа'
  if (mode.value === 'docked-right') return 'Закріпити знизу'
  if (mode.value === 'docked-bottom') return 'Відкріпити (плаваюче вікно)'
  return 'Змінити режим'
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('open-timezone-assignments', (e) => {
    if (e.detail?.row) {
      open(e.detail.row)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

defineExpose({ open, close })
</script>

<style scoped>
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1049;
}

.modal-window {
  position: fixed;
  z-index: 1050;
}

.modal-window--floating {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 700px;
  max-height: 88vh;
  width: 90vw;
}

.modal-window--docked-right {
  top: 0;
  right: 0;
  bottom: 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.modal-window--docked-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle--left {
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle--top {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle:hover {
  background: rgba(13, 110, 253, 0.3);
}

.resize-handle:active {
  background: rgba(13, 110, 253, 0.5);
}

.cursor-grab {
  cursor: grab;
  user-select: none;
}

.cursor-grabbing,
.cursor-grabbing * {
  cursor: grabbing !important;
  user-select: none;
}

.cursor-resizing-x,
.cursor-resizing-x * {
  cursor: ew-resize !important;
  user-select: none;
}

.cursor-resizing-y,
.cursor-resizing-y * {
  cursor: ns-resize !important;
  user-select: none;
}

.card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
