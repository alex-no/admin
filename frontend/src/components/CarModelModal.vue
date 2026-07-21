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
          <h6 class="mb-0">{{ modalMode === 'create' ? 'Нова модель авто' : 'Редагування моделі' }}</h6>
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

            <div v-if="modalMode === 'edit'" class="col-sm-2">
              <label class="form-label small mb-1">ID</label>
              <div class="readonly-field">{{ modalData.id }}</div>
            </div>

            <!-- Brand -->
            <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
              <label class="form-label small mb-1">Марка <span class="text-danger">*</span></label>
              <select v-if="canEdit" v-model="modalForm.car_brand_id" class="form-select form-select-sm">
                <option :value="null" disabled>— оберіть марку —</option>
                <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
              <div v-else class="readonly-field">{{ modalData.brand_name ?? '—' }}</div>
            </div>

            <!-- Vehicle Type -->
            <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
              <label class="form-label small mb-1">Тип ТЗ <span class="text-danger">*</span></label>
              <select v-if="canEdit" v-model="modalForm.vehicle_type_id" class="form-select form-select-sm">
                <option :value="null" disabled>— оберіть тип —</option>
                <option v-for="vt in vehicleTypes" :key="vt.id" :value="vt.id">{{ vt.name_uk }}</option>
              </select>
              <div v-else class="readonly-field">{{ modalData.vehicle_type_name ?? '—' }}</div>
            </div>

            <!-- Name -->
            <div class="col-sm-6">
              <label class="form-label small mb-1">Назва моделі <span class="text-danger">*</span></label>
              <input v-if="canEdit" v-model="modalForm.name" type="text" class="form-control form-control-sm" placeholder="напр. Camry" />
              <div v-else class="readonly-field">{{ modalData.name }}</div>
            </div>

            <!-- Generation -->
            <div class="col-sm-3">
              <label class="form-label small mb-1">Покоління</label>
              <input v-if="canEdit" v-model="modalForm.generation" type="text" class="form-control form-control-sm" placeholder="напр. XV70" />
              <div v-else class="readonly-field">{{ modalData.generation ?? '—' }}</div>
            </div>

            <!-- Body type -->
            <div class="col-sm-3">
              <label class="form-label small mb-1">Тип кузова <span class="text-danger">*</span></label>
              <select v-if="canEdit" v-model="modalForm.body_type" class="form-select form-select-sm">
                <option v-for="(label, val) in BODY_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
              </select>
              <div v-else class="readonly-field">{{ BODY_TYPE_LABELS[modalData.body_type] ?? modalData.body_type }}</div>
            </div>

            <!-- Production years -->
            <div class="col-sm-3">
              <label class="form-label small mb-1">Рік початку</label>
              <input v-if="canEdit" v-model="modalForm.production_start" type="number" min="1900" :max="new Date().getFullYear()" class="form-control form-control-sm" placeholder="напр. 2017" />
              <div v-else class="readonly-field">{{ modalData.production_start ?? '—' }}</div>
            </div>
            <div class="col-sm-3">
              <label class="form-label small mb-1">Рік закінчення</label>
              <input v-if="canEdit" v-model="modalForm.production_end" type="number" min="1900" :max="new Date().getFullYear() + 5" class="form-control form-control-sm" placeholder="порожньо = н.в." />
              <div v-else class="readonly-field">{{ modalData.production_end ?? 'н.в.' }}</div>
            </div>

            <!-- Timestamps (edit only) -->
            <template v-if="modalMode === 'edit'">
              <div class="col-sm-3">
                <label class="form-label small mb-1">Створено</label>
                <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
              </div>
              <div class="col-sm-3">
                <label class="form-label small mb-1">Оновлено</label>
                <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
              </div>
            </template>

          </div>

          <div v-if="saveError" class="alert alert-danger small mt-3 mb-0">{{ saveError }}</div>
        </div>

        <div class="card-footer px-4 py-3 bg-light text-end">
          <button class="btn btn-sm btn-secondary me-2" @click="close">Скасувати</button>
          <button v-if="canEdit" class="btn btn-sm btn-primary" :disabled="saving" @click="save">
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

const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
  brands: {
    type: Array,
    default: () => []
  },
  vehicleTypes: {
    type: Array,
    default: () => []
  },
  filterBrand: {
    type: Number,
    default: null
  },
  filterVehicleType: {
    type: Number,
    default: null
  }
})

const BODY_TYPE_LABELS = {
  sedan:       'Седан',
  hatchback:   'Хетчбек',
  suv:         'Позашляховик',
  coupe:       'Купе',
  convertible: 'Кабріолет',
  wagon:       'Універсал',
  pickup:      'Пікап',
  van:         'Фургон',
  minivan:     'Мінівен',
  other:       'Інше',
}

const API = '/api/admin/catalog/car-models'

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)
const modalRef = ref(null)

const canEdit = computed(() => can('catalog.car-models.edit') || can('catalog.car-models.create'))

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
  storageKey: 'car-model-modal',
  mode: 'floating',
  defaultWidth: 800,
  minWidth: 600,
  maxWidth: 1000,
  defaultHeight: 600,
  minHeight: 450,
  maxHeight: 800,
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
    // Сбрасываем margin при закрытии
    window.dispatchEvent(
      new CustomEvent('modal-content-margin-change', {
        detail: {},
      })
    )
  }
}, { deep: true })

const emptyForm = () => ({
  car_brand_id:    props.filterBrand,
  vehicle_type_id: props.filterVehicleType,
  name:            '',
  generation:      '',
  body_type:       'other',
  production_start: '',
  production_end:   '',
})

function openCreate() {
  modalMode.value = 'create'
  modalData.value = {}
  modalForm.value = emptyForm()
  saveError.value = null
  visible.value = true
}

function openEdit(row) {
  modalMode.value = 'edit'
  modalData.value = { ...row }
  modalForm.value = {
    car_brand_id:    row.car_brand_id,
    vehicle_type_id: row.vehicle_type_id,
    name:            row.name,
    generation:      row.generation ?? '',
    body_type:       row.body_type,
    production_start: row.production_start ?? '',
    production_end:   row.production_end   ?? '',
  }
  saveError.value = null
  visible.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    if (!modalForm.value.car_brand_id) {
      saveError.value = 'Оберіть марку авто'
      return
    }
    if (!modalForm.value.vehicle_type_id) {
      saveError.value = 'Оберіть тип ТЗ'
      return
    }
    if (!modalForm.value.name?.trim()) {
      saveError.value = 'Вкажіть назву моделі'
      return
    }

    const payload = {
      car_brand_id:    modalForm.value.car_brand_id,
      vehicle_type_id: modalForm.value.vehicle_type_id,
      name:            modalForm.value.name.trim(),
      generation:      modalForm.value.generation?.trim() || null,
      body_type:       modalForm.value.body_type || 'other',
      production_start: modalForm.value.production_start || null,
      production_end:   modalForm.value.production_end   || null,
    }

    if (modalMode.value === 'create') {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('car-model-created', { detail: json.data }))
    } else {
      const res = await fetch(`${API}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
      window.dispatchEvent(new CustomEvent('car-model-updated', { detail: { id: modalData.value.id, data: json.data } }))
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
  // Listen for events from parent
  window.addEventListener('open-car-model-create', () => {
    openCreate()
  })
  window.addEventListener('open-car-model-edit', (e) => {
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
/* Backdrop для floating режима */
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1049;
}

/* Базовые стили модального окна */
.modal-window {
  position: fixed;
  z-index: 1050;
}

/* Floating режим */
.modal-window--floating {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 800px;
  max-height: 88vh;
  width: 90vw;
}

/* Docked right */
.modal-window--docked-right {
  top: 0;
  right: 0;
  bottom: 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

/* Docked bottom */
.modal-window--docked-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* Resize handles */
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

/* Курсоры */
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
