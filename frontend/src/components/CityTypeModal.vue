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
          <h6 class="mb-0">{{ modalMode === 'create' ? 'Новий тип населеного пункту' : 'Редагування типу' }}</h6>
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
          <!-- Name fields -->
          <div class="row g-3">
            <template v-for="mf in config.modal" :key="mf.key">
              <div :class="`col-sm-${mf.col}`">
                <label class="form-label small mb-1">{{ config.fields[mf.key].label }}</label>

                <template v-if="mf.key === 'id'">
                  <div v-if="modalMode === 'edit'" class="readonly-field">{{ modalData.id }}</div>
                  <div v-else class="readonly-field text-muted">—</div>
                </template>

                <template v-else-if="config.fields[mf.key].type === 'datetime'">
                  <div v-if="modalMode === 'edit'" class="readonly-field text-muted small">{{ modalData[mf.key] }}</div>
                  <div v-else class="readonly-field text-muted">—</div>
                </template>

                <template v-else>
                  <input
                    v-if="canEditInModal(mf.key)"
                    v-model="modalForm[mf.key]"
                    type="text"
                    class="form-control form-control-sm"
                  />
                  <div v-else class="readonly-field">{{ modalData[mf.key] ?? '—' }}</div>
                </template>
              </div>
            </template>
          </div>

          <!-- Country associations -->
          <hr class="my-3" />
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="small fw-semibold">
              Країни
              <span v-if="canEditInModal('short_name_uk')" class="text-danger">*</span>
            </span>
            <span class="badge" :class="modalCountryIds.length ? 'bg-secondary' : 'bg-danger'">
              {{ modalCountryIds.length }}
            </span>
            <input
              v-model="countrySearch"
              type="text"
              class="form-control form-control-sm ms-auto"
              style="max-width:220px"
              placeholder="Пошук країни..."
            />
          </div>
          <div class="border rounded p-2" style="max-height:200px; overflow-y:auto">
            <div v-if="loadingCountries" class="text-center text-muted small py-2">
              <span class="spinner-border spinner-border-sm"></span>
            </div>
            <template v-else>
              <div
                v-for="c in filteredCountriesList" :key="c.id"
                class="form-check form-check-inline"
                style="min-width:170px"
              >
                <input
                  :id="`ct-c-${c.id}`"
                  v-model="modalCountryIds"
                  :value="c.id"
                  :disabled="!canEditInModal('short_name_uk')"
                  type="checkbox"
                  class="form-check-input"
                />
                <label :for="`ct-c-${c.id}`" class="form-check-label small">{{ c.name_uk }}</label>
              </div>
              <div v-if="!filteredCountriesList.length" class="text-muted small text-center py-2">
                Нічого не знайдено
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'
import { useAuth } from '@/composables/useAuth'
import config from '../pages/geography/city-types.config.json'

const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
  countriesList: {
    type: Array,
    default: () => []
  },
  filterCountry: {
    type: Number,
    default: null
  },
  justCreatedIds: {
    type: Set,
    default: () => new Set()
  }
})

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const modalCountryIds = ref([])
const loadingCountries = ref(false)
const countrySearch = ref('')
const saving = ref(false)
const saveError = ref(null)
const modalRef = ref(null)

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
  storageKey: 'city-type-modal',
  mode: 'floating',
  defaultWidth: 900,
  minWidth: 700,
  maxWidth: 1200,
  defaultHeight: 650,
  minHeight: 500,
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

function canEditField(key) {
  const field = config.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

function canEditInModal(key) {
  const field = config.fields[key]
  if (!field?.editable) return false
  if (modalMode.value === 'create' || props.justCreatedIds.has(modalData.value.id)) {
    if (field.createPermissions) return field.createPermissions.some(p => can(p))
    return field.type !== 'integer' && field.type !== 'datetime'
  }
  return canEditField(key)
}

const filteredCountriesList = computed(() =>
  props.countriesList.filter(c =>
    !countrySearch.value ||
    c.name_uk.toLowerCase().includes(countrySearch.value.toLowerCase())
  )
)

const emptyForm = () => ({
  short_name_uk: '', short_name_en: '', short_name_ru: '',
  long_name_uk:  '', long_name_en:  '', long_name_ru:  '',
})

function openCreate() {
  modalMode.value       = 'create'
  modalData.value       = {}
  modalForm.value       = emptyForm()
  modalCountryIds.value = props.filterCountry ? [props.filterCountry] : []
  countrySearch.value   = ''
  saveError.value       = null
  visible.value         = true
}

async function openEdit(row) {
  modalMode.value   = 'edit'
  modalData.value   = { ...row }
  modalForm.value   = {
    short_name_uk: row.short_name_uk,
    short_name_en: row.short_name_en,
    short_name_ru: row.short_name_ru,
    long_name_uk:  row.long_name_uk,
    long_name_en:  row.long_name_en,
    long_name_ru:  row.long_name_ru,
  }
  modalCountryIds.value = []
  countrySearch.value   = ''
  saveError.value       = null
  visible.value         = true

  loadingCountries.value = true
  try {
    const res  = await fetch(`${config.apiList}/${row.id}/countries`, { headers: authHeaders() })
    const json = await res.json()
    modalCountryIds.value = json.data ?? []
  } catch {
    modalCountryIds.value = []
  } finally {
    loadingCountries.value = false
  }
}

async function patch(id, fields) {
  const res = await fetch(`${config.apiUpdate}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
  return json.data
}

async function save() {
  saving.value    = true
  saveError.value = null
  try {
    if (canEditInModal('short_name_uk') && modalCountryIds.value.length === 0) {
      saveError.value = 'Оберіть хоча б одну країну'
      saving.value = false
      return
    }
    const fields = {}
    for (const key of Object.keys(emptyForm())) {
      if (canEditInModal(key)) fields[key] = modalForm.value[key]
    }
    if (canEditInModal('short_name_uk')) {
      fields.country_ids = modalCountryIds.value
    }

    if (modalMode.value === 'create') {
      const res  = await fetch(config.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('city-type-created', { detail: json.data }))
    } else {
      const updated = await patch(modalData.value.id, fields)
      window.dispatchEvent(new CustomEvent('city-type-updated', { detail: { id: modalData.value.id, data: updated } }))
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
  window.addEventListener('open-city-type-create', () => {
    openCreate()
  })
  window.addEventListener('open-city-type-edit', (e) => {
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
</style>
