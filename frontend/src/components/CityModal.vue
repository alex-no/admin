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
          <h6 class="mb-0">{{ modalMode === 'create' ? 'Новий населений пункт' : 'Редагування населеного пункту' }}</h6>
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
          <div class="row g-3">
            <template v-for="mf in config.modal" :key="mf.key">
              <div :class="mf.key === 'area_region_id' ? 'col-sm-12' : `col-sm-${mf.col}`">
                <template v-if="mf.key.startsWith('_')"></template>
                <label v-else-if="!(mf.key === 'area_region_id' && canEditInModal('area_region_id'))" class="form-label small mb-1">{{ config.fields[mf.key].label }}</label>

                <!-- ID – hidden in create mode -->
                <template v-if="mf.key.startsWith('_')"><!-- spacer --></template>
                <template v-else-if="mf.key === 'id'">
                  <div v-if="modalMode === 'edit'" class="readonly-field">{{ modalData.id }}</div>
                  <div v-else class="readonly-field text-muted">—</div>
                </template>

                <template v-else-if="mf.key === 'city_type_id'">
                  <select v-if="canEditInModal('city_type_id')" v-model.number="modalForm.city_type_id" class="form-select form-select-sm">
                    <option :value="null">— не вказано —</option>
                    <option v-for="t in modalCityTypesList" :key="t.id" :value="t.id">{{ t.short_name_uk }} – {{ t.long_name_uk }}</option>
                  </select>
                  <div v-else class="readonly-field">{{ modalData.city_type_name ?? '—' }}</div>
                </template>

                <template v-else-if="mf.key === 'country_id'">
                  <select v-if="canEditInModal('country_id')" v-model.number="modalForm.country_id" class="form-select form-select-sm">
                    <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
                  </select>
                  <div v-else class="readonly-field">{{ modalData.country_name }}</div>
                </template>

                <template v-else-if="mf.key === 'area_region_id'">
                  <div v-if="canEditInModal('area_region_id')" class="row g-2">
                    <div class="col-sm-6">
                      <label class="form-label small mb-1">Область</label>
                      <select v-model.number="modalFilterArea" class="form-select form-select-sm">
                        <option :value="null">— не вказано —</option>
                        <option v-for="a in modalAreasList" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
                      </select>
                    </div>
                    <div class="col-sm-6">
                      <label class="form-label small mb-1">Район</label>
                      <select v-if="modalFilterArea" v-model.number="modalForm.area_region_id" class="form-select form-select-sm">
                        <option :value="null">— не вказано —</option>
                        <option v-for="d in modalDistrictsList" :key="d.id" :value="d.id">{{ d.name_uk }}</option>
                      </select>
                      <div v-else class="readonly-field text-muted small fst-italic">спочатку оберіть область</div>
                    </div>
                  </div>
                  <div v-else class="readonly-field">{{ modalData.area_region_name ?? '—' }}</div>
                </template>

                <template v-else-if="mf.key === 'is_capital'">
                  <div v-if="canEditInModal('is_capital')" class="form-check mt-1 mb-0">
                    <input v-model="modalForm.is_capital" type="checkbox" class="form-check-input" :id="`modal-capital-${modalData.id}`" />
                    <label class="form-check-label" :for="`modal-capital-${modalData.id}`">Столиця країни</label>
                  </div>
                  <div v-else class="readonly-field">{{ modalData.is_capital ? 'Так' : 'Ні' }}</div>
                </template>

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
                <template v-else-if="config.fields[mf.key].type === 'datetime'">
                  <div v-if="modalMode === 'edit'" class="readonly-field text-muted small">{{ modalData[mf.key] }}</div>
                  <div v-else class="readonly-field text-muted">—</div>
                </template>

                <!-- latitude / longitude -->
                <template v-else-if="mf.key === 'latitude' || mf.key === 'longitude'">
                  <template v-if="canEditInModal(mf.key)">
                    <div class="d-flex gap-1 align-items-start">
                      <div class="flex-grow-1">
                        <input
                          v-model="modalForm[mf.key]"
                          type="text"
                          class="form-control form-control-sm"
                          :class="{ 'is-invalid': getCoordHint(modalForm[mf.key], mf.key)?.error }"
                          placeholder="50.4501 або 50°27′0.4″N"
                        />
                        <div v-if="getCoordHint(modalForm[mf.key], mf.key)" class="coord-hint mt-1"
                             :class="getCoordHint(modalForm[mf.key], mf.key).error ? 'text-danger' : 'text-muted'">
                          {{ getCoordHint(modalForm[mf.key], mf.key).text }}
                        </div>
                      </div>
                      <button v-if="mf.key === 'latitude'"
                              type="button"
                              class="btn btn-sm btn-outline-secondary text-nowrap"
                              :disabled="geocoding"
                              @click="fetchGeocode"
                              title="Отримати координати з геосервісу">
                        <span v-if="geocoding" class="spinner-border spinner-border-sm"></span>
                        <i v-else class="bi bi-geo-alt"></i>
                      </button>
                    </div>
                  </template>
                  <div v-else class="readonly-field">
                    {{ modalData[mf.key] ?? '—' }}
                    <span v-if="modalData[mf.key]" class="text-muted ms-2 small">
                      {{ getCoordHint(modalData[mf.key], mf.key)?.text }}
                    </span>
                  </div>
                </template>

                <template v-else>
                  <input
                    v-if="canEditInModal(mf.key)"
                    v-model="modalForm[mf.key]"
                    :type="config.fields[mf.key].type === 'number' ? 'number' : 'text'"
                    :step="config.fields[mf.key].type === 'number' ? 'any' : undefined"
                    class="form-control form-control-sm"
                  />
                  <div v-else class="readonly-field">{{ modalData[mf.key] ?? '—' }}</div>
                </template>
              </div>
            </template>
          </div>

          <div v-if="saveError" class="alert alert-danger small mt-3 mb-0">{{ saveError }}</div>
        </div>

        <div class="card-footer px-4 py-3 bg-light text-end">
          <button class="btn btn-sm btn-secondary me-2" @click="close">Скасувати</button>
          <button class="btn btn-sm btn-primary" :disabled="saving" @click="save">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'
import { useAuth } from '@/composables/useAuth'
import config from '../pages/geography/cities.config.json'
import { coordHint, dmsToDecimal } from '@/utils/coordinate'

const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
  countriesList: { type: Array, default: () => [] },
  areaRegionsList: { type: Array, default: () => [] },
  allDistrictsList: { type: Array, default: () => [] },
  cityTypesList: { type: Array, default: () => [] },
  countryCityTypeMap: { type: Array, default: () => [] },
  justCreatedIds: { type: Set, default: () => new Set() }
})

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)
const modalRef = ref(null)
const geocoding = ref(false)
const modalFilterArea = ref(null)

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
  storageKey: 'city-modal',
  mode: 'floating',
  defaultWidth: 900,
  minWidth: 700,
  maxWidth: 1200,
  defaultHeight: 700,
  minHeight: 550,
  maxHeight: 900,
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

function getCoordHint(value, key) {
  return coordHint(value, key === 'latitude' ? 'lat' : 'lon')
}

function canEditField(key) {
  const field = config.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

function canEditInModal(key) {
  const field = config.fields[key]
  if (!field?.editable) return false
  if (modalMode.value === 'create') {
    if (field.createPermissions) return field.createPermissions.some(p => can(p))
    return field.type !== 'integer' && field.type !== 'datetime'
  }
  if (canEditField(key)) return true
  if (props.justCreatedIds.has(modalData.value.id)) {
    if (field.createPermissions) return field.createPermissions.some(p => can(p))
    return field.type !== 'integer' && field.type !== 'datetime'
  }
  return false
}

const modalCityTypesList = computed(() => {
  if (!modalForm.value.country_id) return props.cityTypesList
  const allowed = new Set(
    props.countryCityTypeMap
      .filter(r => r.country_id === modalForm.value.country_id)
      .map(r => r.city_type_id)
  )
  return allowed.size > 0 ? props.cityTypesList.filter(t => allowed.has(t.id)) : props.cityTypesList
})

const modalAreasList = computed(() =>
  props.areaRegionsList.filter(a =>
    !modalForm.value.country_id || a.country_id === modalForm.value.country_id
  )
)

const modalDistrictsList = computed(() =>
  props.allDistrictsList.filter(d =>
    d.region_in_area_id === modalFilterArea.value
  )
)

watch(() => modalForm.value.country_id, () => {
  modalFilterArea.value          = null
  modalForm.value.area_region_id = null
})

watch(modalFilterArea, (_, oldVal) => {
  if (oldVal !== null) modalForm.value.area_region_id = null
})

async function fetchGeocode() {
  if (!modalData.value.id) return
  geocoding.value = true
  try {
    const res  = await fetch(`/api/admin/geography/cities/${modalData.value.id}/geocode`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка геокодування')
    modalForm.value.latitude  = String(json.data.latitude)
    modalForm.value.longitude = String(json.data.longitude)
    saveError.value = null
  } catch (e) {
    saveError.value = e.message
  } finally {
    geocoding.value = false
  }
}

const emptyForm = () => ({
  city_type_id: null, country_id: '', area_region_id: null,
  name_uk: '', name_en: '', name_ru: '',
  latitude: '', longitude: '', is_capital: false, is_active: true,
})

function openCreate() {
  modalMode.value       = 'create'
  modalData.value       = {}
  modalForm.value       = emptyForm()
  modalFilterArea.value = null
  saveError.value       = null
  visible.value         = true
}

async function openEdit(row) {
  modalMode.value = 'edit'
  modalData.value = { ...row }
  modalForm.value = {
    city_type_id:   row.city_type_id,
    country_id:     row.country_id,
    area_region_id: row.area_region_id ?? null,
    name_uk:        row.name_uk,
    name_en:        row.name_en,
    name_ru:        row.name_ru,
    latitude:       row.latitude  != null ? String(row.latitude)  : '',
    longitude:      row.longitude != null ? String(row.longitude) : '',
    is_capital:     row.is_capital,
    is_active:      row.is_active,
  }
  saveError.value = null
  visible.value   = true

  await nextTick()

  if (row.area_region_id) {
    const district = props.allDistrictsList.find(d => d.id === row.area_region_id)
    if (district) {
      modalFilterArea.value = district.region_in_area_id ?? null
    } else {
      modalFilterArea.value          = row.area_region_id
      modalForm.value.area_region_id = null
    }
    await nextTick()
    if (district) {
      modalForm.value.area_region_id = row.area_region_id
    }
  } else {
    modalFilterArea.value = null
  }
}

async function save() {
  saving.value    = true
  saveError.value = null
  try {
    const coordErrors = []
    const parsedLat = modalForm.value.latitude  !== '' ? dmsToDecimal(modalForm.value.latitude)  : null
    const parsedLon = modalForm.value.longitude !== '' ? dmsToDecimal(modalForm.value.longitude) : null
    if (modalForm.value.latitude  !== '' && parsedLat === null) coordErrors.push('Широта: невірний формат')
    if (modalForm.value.longitude !== '' && parsedLon === null) coordErrors.push('Довгота: невірний формат')
    if (coordErrors.length) {
      saveError.value = coordErrors.join('; ')
      saving.value = false
      return
    }

    const editable = ['city_type_id', 'country_id', 'area_region_id',
                      'name_uk', 'name_en', 'name_ru',
                      'latitude', 'longitude', 'is_capital', 'is_active']
    const fields = {}
    for (const key of editable) {
      if (!canEditInModal(key)) continue
      if (key === 'area_region_id') {
        fields[key] = modalForm.value.area_region_id ?? (modalFilterArea.value ?? null)
      } else if (key === 'latitude') {
        fields[key] = parsedLat
      } else if (key === 'longitude') {
        fields[key] = parsedLon
      } else {
        fields[key] = modalForm.value[key]
      }
    }

    if (modalMode.value === 'create') {
      const res  = await fetch(config.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('city-created', { detail: json.data }))
    } else {
      const res  = await fetch(`${config.apiUpdate}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
      window.dispatchEvent(new CustomEvent('city-updated', { detail: { id: modalData.value.id, data: json.data } }))
    }
    close()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

function close() {
  visible.value = false
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
  window.addEventListener('open-city-create', () => {
    openCreate()
  })
  window.addEventListener('open-city-edit', (e) => {
    if (e.detail?.row) {
      openEdit(e.detail.row)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

defineExpose({ openCreate, openEdit, close })
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
  max-width: 900px;
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

.readonly-field {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}

.coord-hint { font-size: .8rem; }
</style>
