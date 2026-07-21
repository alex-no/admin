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
          class="card-header d-flex justify-content-between align-items-center py-2 px-4"
          :class="isDraggable ? 'cursor-grab' : ''"
          @mousedown="isDraggable && modalRef ? startDrag($event, modalRef) : null"
        >
          <h5 class="mb-0">{{ modalMode === 'create' ? 'Нова країна' : 'Редагування країни' }}</h5>
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

        <div class="card-body px-4 py-3" style="flex:1; overflow-y:auto">
          <div class="row g-3">
            <template v-for="mf in cfg.modal" :key="mf.key">
              <div :class="`col-sm-${mf.col}`">
                <template v-if="mf.key.startsWith('_')"></template>
                <label v-else class="form-label small mb-1"
                       :class="{ 'text-muted': cfg.fields[mf.key].type === 'integer' || cfg.fields[mf.key].type === 'datetime' }">
                  {{ cfg.fields[mf.key].label }}
                </label>

                <template v-if="mf.key.startsWith('_')"><!-- spacer --></template>

                <template v-else-if="mf.key === 'id'">
                  <div class="readonly-field text-muted">{{ modalMode === 'edit' ? modalData.id : '—' }}</div>
                </template>

                <template v-else-if="mf.key === 'is_active'">
                  <div v-if="canEditInModal('is_active')" class="form-check form-switch mt-1 mb-0">
                    <input v-model="modalForm.is_active" type="checkbox" class="form-check-input" id="modal-active" role="switch" />
                    <label class="form-check-label" for="modal-active">{{ modalForm.is_active ? 'Активна' : 'Неактивна' }}</label>
                  </div>
                  <div v-else>
                    <span class="badge" :class="modalData.is_active ? 'bg-success' : 'bg-danger'">
                      {{ modalData.is_active ? 'Активна' : 'Неактивна' }}
                    </span>
                  </div>
                </template>

                <template v-else-if="cfg.fields[mf.key].type === 'datetime'">
                  <div class="readonly-field text-muted small">{{ modalMode === 'edit' ? (modalData[mf.key] ?? '—') : '—' }}</div>
                </template>

                <template v-else>
                  <input
                    v-if="canEditInModal(mf.key)"
                    v-model="modalForm[mf.key]"
                    :type="cfg.fields[mf.key].type === 'number' ? 'number' : 'text'"
                    class="form-control form-control-sm"
                    :maxlength="cfg.fields[mf.key].maxlength ?? undefined"
                  />
                  <div v-else class="readonly-field">{{ modalData[mf.key] ?? '—' }}</div>
                </template>
              </div>
            </template>
          </div>
        </div>

        <div class="card-footer py-2 px-4" style="flex-shrink:0">
          <div v-if="saveError" class="alert alert-danger small mb-2">{{ saveError }}</div>
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-secondary btn-sm" @click="close">Скасувати</button>
            <button class="btn btn-primary btn-sm" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              Зберегти
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useModalWindow } from '@/composables/useModalWindow'
import cfg from '@/pages/geography/countries.config.json'

const { can, authHeaders } = useAuth()

// Modal window composable
const modalRef = ref(null)

const {
  mode,
  floatingStyle,
  dockedRightStyle,
  dockedBottomStyle,
  contentMargin,
  isDraggable,
  cursorClass,
  cycleMode,
  startDrag,
  startResize,
} = useModalWindow({
  storageKey: 'country-modal-settings-v2', // Changed key to force reset
  mode: 'docked-right',
  defaultWidth: 600,
  defaultHeight: 400,
})

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)

// Permissions
function canEditInModal(key) {
  const field = cfg.fields[key]
  if (!field?.editable) return false
  const perms = modalMode.value === 'create' ? field.createPermissions : field.editPermissions
  return perms?.some(p => can(p)) ?? false
}

// API helpers
async function patch(id, fields) {
  const res = await fetch(`${cfg.apiUpdate}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
  return json.data
}

// Modal actions
function openCreate() {
  modalMode.value = 'create'
  modalData.value = {}
  const form = {}
  for (const [key, field] of Object.entries(cfg.fields)) {
    if (field.editable) form[key] = 'default' in field ? field.default : ''
  }
  modalForm.value = form
  saveError.value = null
  visible.value = true
}

function openEdit(country) {
  modalMode.value = 'edit'
  modalData.value = { ...country }
  const form = {}
  for (const [key, field] of Object.entries(cfg.fields)) {
    if (field.editable) form[key] = country[key] ?? null
  }
  modalForm.value = form
  saveError.value = null
  visible.value = true
}

function close() {
  visible.value = false
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    const fields = {}
    for (const [key, field] of Object.entries(cfg.fields)) {
      if (field.editable && canEditInModal(key)) fields[key] = modalForm.value[key]
    }

    if (modalMode.value === 'create') {
      const res = await fetch(cfg.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')

      // Dispatch event to notify parent
      window.dispatchEvent(new CustomEvent('country-created', { detail: json.data }))
    } else {
      const updated = await patch(modalData.value.id, fields)
      // Dispatch event to notify parent
      window.dispatchEvent(new CustomEvent('country-updated', { detail: updated }))
    }
    close()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
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

function handleEscape(e) {
  if (e.key === 'Escape' && visible.value) close()
}

// Watch для отправки события об изменении margin
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
})

// Event listeners
onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  window.addEventListener('open-country-create', openCreate)
  window.addEventListener('open-country-edit', (e) => {
    if (e.detail?.country) openEdit(e.detail.country)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  window.removeEventListener('open-country-create', openCreate)
  window.removeEventListener('open-country-edit', openEdit)
})
</script>

<style scoped>
.modal-backdrop-simple {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
