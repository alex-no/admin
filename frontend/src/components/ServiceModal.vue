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
          <h6 class="mb-0">{{ modalMode === 'create' ? 'Нова послуга' : 'Редагування послуги' }}</h6>
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

            <!-- Group -->
            <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
              <label class="form-label small mb-1">Група <span class="text-danger">*</span></label>
              <select v-if="canEdit" v-model="modalForm.service_group_id" class="form-select form-select-sm">
                <option :value="null" disabled>— оберіть групу —</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name_uk }}</option>
              </select>
              <div v-else class="readonly-field">{{ modalData.group_name ?? '—' }}</div>
            </div>

            <!-- Slug -->
            <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
              <label class="form-label small mb-1">Slug <span class="text-danger">*</span></label>
              <input v-if="canEdit" v-model="modalForm.slug" type="text" class="form-control form-control-sm" />
              <div v-else class="readonly-field">{{ modalData.slug }}</div>
            </div>

            <!-- Names -->
            <div class="col-sm-12">
              <label class="form-label small mb-1">Назва [UA] <span class="text-danger">*</span></label>
              <input v-if="canEdit" v-model="modalForm.name_uk" type="text" class="form-control form-control-sm" />
              <div v-else class="readonly-field">{{ modalData.name_uk }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label small mb-1">Назва [EN] <span class="text-danger">*</span></label>
              <input v-if="canEdit" v-model="modalForm.name_en" type="text" class="form-control form-control-sm" />
              <div v-else class="readonly-field">{{ modalData.name_en }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label small mb-1">Назва [RU]</label>
              <input v-if="canEdit" v-model="modalForm.name_ru" type="text" class="form-control form-control-sm" />
              <div v-else class="readonly-field">{{ modalData.name_ru ?? '—' }}</div>
            </div>

            <template v-if="modalMode === 'edit'">
              <div class="col-sm-6">
                <label class="form-label small mb-1">Створено</label>
                <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
              </div>
              <div class="col-sm-6">
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
  groups: {
    type: Array,
    default: () => []
  },
  filterGroup: {
    type: Number,
    default: null
  }
})

const API = '/api/admin/catalog/services'

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)
const modalRef = ref(null)

const canEdit = computed(() => can('catalog.services.edit') || can('catalog.services.create'))

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
  storageKey: 'service-modal',
  mode: 'floating',
  defaultWidth: 700,
  minWidth: 550,
  maxWidth: 900,
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
  service_group_id: props.filterGroup,
  slug: '', name_uk: '', name_en: '', name_ru: '',
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
    service_group_id: row.service_group_id,
    slug: row.slug, name_uk: row.name_uk, name_en: row.name_en, name_ru: row.name_ru ?? '',
  }
  saveError.value = null
  visible.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    if (!modalForm.value.service_group_id) { saveError.value = 'Оберіть групу послуг'; return }
    if (!modalForm.value.slug?.trim())     { saveError.value = 'Вкажіть slug'; return }
    if (!modalForm.value.name_uk?.trim())  { saveError.value = 'Вкажіть назву [UA]'; return }
    if (!modalForm.value.name_en?.trim())  { saveError.value = 'Вкажіть назву [EN]'; return }

    const payload = {
      service_group_id: modalForm.value.service_group_id,
      slug:    modalForm.value.slug.trim(),
      name_uk: modalForm.value.name_uk.trim(),
      name_en: modalForm.value.name_en.trim(),
      name_ru: modalForm.value.name_ru?.trim() ?? '',
    }

    if (modalMode.value === 'create') {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('service-created', { detail: json.data }))
    } else {
      const res = await fetch(`${API}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
      window.dispatchEvent(new CustomEvent('service-updated', { detail: { id: modalData.value.id, data: json.data } }))
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
  window.dispatchEvent(new CustomEvent('service-edit-closed'))
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
  window.addEventListener('open-service-create', () => {
    openCreate()
  })
  window.addEventListener('open-service-edit', (e) => {
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
  max-width: 700px;
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
