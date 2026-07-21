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
          <h6 class="mb-0">Деталі #{{ feedbackId }}</h6>
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
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          </div>
          <div v-else-if="error" class="alert alert-danger small">{{ error }}</div>
          <div v-else-if="item">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Тип</label>
                <div><span :class="typeBadge(item.type)">{{ typeLabel(item.type) }}</span></div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">ID</label>
                <div class="text-muted">#{{ item.id }}</div>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold text-muted">Тема</label>
                <div class="fw-semibold">{{ item.subject }}</div>
              </div>
              <div class="col-12">
                <label class="form-label small fw-semibold text-muted">Повідомлення</label>
                <div class="border rounded p-3 bg-light" style="white-space: pre-wrap">{{ item.message }}</div>
              </div>

              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Статус</label>
                <select v-model="formData.status" class="form-select form-select-sm">
                  <option value="new">Новий</option>
                  <option value="in_progress">В роботі</option>
                  <option value="resolved">Вирішено</option>
                  <option value="rejected">Відхилено</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Пріоритет</label>
                <select v-model="formData.priority" class="form-select form-select-sm">
                  <option value="low">Низький</option>
                  <option value="normal">Звичайний</option>
                  <option value="high">Високий</option>
                  <option value="urgent">Термін</option>
                </select>
              </div>

              <div class="col-12">
                <label class="form-label small fw-semibold text-muted">Відповідь адміністратора</label>
                <textarea v-model="formData.response" class="form-control form-control-sm" rows="4" placeholder="Введіть відповідь..."></textarea>
              </div>

              <hr class="my-2" />

              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Ім'я</label>
                <div>{{ item.name || '—' }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Email</label>
                <div>{{ item.email || '—' }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Телефон</label>
                <div>{{ item.phone || '—' }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">IP адреса</label>
                <div class="text-muted small">{{ item.ip_address || '—' }}</div>
              </div>

              <div v-if="item.related_entity_type" class="col-12">
                <label class="form-label small fw-semibold text-muted">Пов'язана сутність</label>
                <div class="text-muted small">
                  {{ item.related_entity_type }} #{{ item.related_entity_id }}
                </div>
              </div>

              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Дата створення</label>
                <div class="text-muted small">{{ formatDate(item.created_at) }}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Дата оновлення</label>
                <div class="text-muted small">{{ formatDate(item.updated_at) }}</div>
              </div>
              <div v-if="item.resolved_at" class="col-md-6">
                <label class="form-label small fw-semibold text-muted">Дата вирішення</label>
                <div class="text-muted small">{{ formatDate(item.resolved_at) }}</div>
              </div>

              <div v-if="saveError" class="alert alert-danger small mb-0 mt-3">{{ saveError }}</div>
              <div v-if="saveSuccess" class="alert alert-success small mb-0 mt-3">Збережено успішно!</div>
            </div>
          </div>
        </div>

        <div class="card-footer px-4 py-3 bg-light text-end">
          <button class="btn btn-sm btn-secondary me-2" @click="close">Скасувати</button>
          <button class="btn btn-sm btn-primary" @click="save" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'
import { apiGet, apiPatch } from '../utils/api'

// Component state
const visible = ref(false)
const feedbackId = ref(null)
const loading = ref(false)
const error = ref(null)
const item = ref(null)
const saving = ref(false)
const saveError = ref(null)
const saveSuccess = ref(false)
const modalRef = ref(null)

const formData = reactive({
  status: '',
  priority: '',
  response: '',
})

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
  storageKey: 'feedback-detail-modal',
  mode: 'floating',
  defaultWidth: 860,
  minWidth: 600,
  maxWidth: 1200,
  defaultHeight: 600,
  minHeight: 400,
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
    // Сбрасываем margin при закрытии
    window.dispatchEvent(
      new CustomEvent('modal-content-margin-change', {
        detail: {},
      })
    )
  }
}, { deep: true })

async function loadDetail() {
  loading.value = true
  error.value = null
  try {
    const res = await apiGet(`/admin/feedback/${feedbackId.value}`)
    if (res.success) {
      item.value = res.data
      formData.status = res.data.status
      formData.priority = res.data.priority
      formData.response = res.data.response || ''
    } else {
      error.value = res.message || 'Помилка завантаження'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    const res = await apiPatch(`/admin/feedback/${feedbackId.value}`, formData)
    if (res.success) {
      saveSuccess.value = true
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('feedback-updated'))
        close()
      }, 1000)
    } else {
      saveError.value = res.message || 'Помилка збереження'
    }
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
}

function open(id) {
  feedbackId.value = id
  visible.value = true
  saveError.value = null
  saveSuccess.value = false
  loadDetail()
}

function close() {
  visible.value = false
  item.value = null
  feedbackId.value = null
  window.dispatchEvent(new CustomEvent('feedback-detail-closed'))
}

function handleEscape(e) {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function typeLabel(type) {
  const labels = {
    complaint: 'Скарга',
    suggestion: 'Пропозиція',
    question: 'Питання',
    other: 'Інше',
  }
  return labels[type] || type
}

function typeBadge(type) {
  const badges = {
    complaint: 'badge bg-danger',
    suggestion: 'badge bg-info',
    question: 'badge bg-warning text-dark',
    other: 'badge bg-secondary',
  }
  return badges[type] || 'badge bg-secondary'
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
  // Listen for event from parent
  window.addEventListener('open-feedback-detail', (e) => {
    if (e.detail?.id) {
      open(e.detail.id)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

defineExpose({ open, close })
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
  max-width: 860px;
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
</style>
