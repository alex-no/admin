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
          <h6 class="mb-0">{{ modalMode === 'create' ? 'Нова марка авто' : 'Редагування марки' }}</h6>
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
          <div v-if="modalMode === 'edit'" class="mb-3">
            <label class="form-label small mb-1">ID</label>
            <div class="readonly-field">{{ modalData.id }}</div>
          </div>

          <div class="mb-3">
            <label class="form-label small mb-1">Країна <span class="text-danger">*</span></label>
            <select v-if="canEdit" v-model="modalForm.country_id" class="form-select form-select-sm">
              <option :value="null" disabled>— оберіть країну —</option>
              <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
            </select>
            <div v-else class="readonly-field">{{ modalData.country_name ?? '—' }}</div>
          </div>

          <div class="mb-3">
            <label class="form-label small mb-1">Назва <span class="text-danger">*</span></label>
            <input v-if="canEdit" v-model="modalForm.name" type="text" class="form-control form-control-sm" />
            <div v-else class="readonly-field">{{ modalData.name }}</div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-sm-4">
              <label class="form-label small mb-1">Рік заснування</label>
              <input
                v-if="canEdit"
                v-model.number="modalForm.founded_year"
                type="number"
                min="1800"
                :max="new Date().getFullYear()"
                class="form-control form-control-sm"
                placeholder="напр. 1937"
              />
              <div v-else class="readonly-field">{{ modalData.founded_year ?? '—' }}</div>
            </div>
            <div class="col-sm-8">
              <label class="form-label small mb-1">Сайт</label>
              <input v-if="canEdit" v-model="modalForm.website" type="text" class="form-control form-control-sm" placeholder="https://..." />
              <div v-else class="readonly-field">{{ modalData.website ?? '—' }}</div>
            </div>
          </div>

          <div v-if="modalMode === 'edit'" class="row g-3">
            <div class="col-sm-6">
              <label class="form-label small mb-1">Створено</label>
              <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label small mb-1">Оновлено</label>
              <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
            </div>
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
import config from '../pages/catalog/car-brands.config.json'

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
  }
})

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)
const modalRef = ref(null)

const canEdit = computed(() => can('catalog.car-brands.edit') || can(config.createPermission))

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
  storageKey: 'car-brand-modal',
  mode: 'floating',
  defaultWidth: 600,
  minWidth: 450,
  maxWidth: 800,
  defaultHeight: 550,
  minHeight: 400,
  maxHeight: 750,
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
  country_id: props.filterCountry,
  name: '',
  founded_year: null,
  website: '',
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
    country_id: row.country_id,
    name: row.name,
    founded_year: row.founded_year,
    website: row.website ?? '',
  }
  saveError.value = null
  visible.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    if (!modalForm.value.country_id) {
      saveError.value = 'Оберіть країну'
      return
    }
    if (!modalForm.value.name?.trim()) {
      saveError.value = 'Вкажіть назву марки'
      return
    }

    const payload = {
      country_id: modalForm.value.country_id,
      name: modalForm.value.name.trim(),
      founded_year: modalForm.value.founded_year || null,
      website: modalForm.value.website?.trim() || null,
    }

    if (modalMode.value === 'create') {
      const res = await fetch(config.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('car-brand-created', { detail: json.data }))
    } else {
      const res = await fetch(`${config.apiUpdate}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
      window.dispatchEvent(new CustomEvent('car-brand-updated', { detail: { id: modalData.value.id, data: json.data } }))
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
  window.addEventListener('open-car-brand-create', () => {
    openCreate()
  })
  window.addEventListener('open-car-brand-edit', (e) => {
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
  max-width: 600px;
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
