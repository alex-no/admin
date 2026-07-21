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
          <h6 class="mb-0">Деталі помилки #{{ errorId }}</h6>
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
          <div v-else-if="data">
            <div class="row g-3">
              <!-- Basic Info -->
              <div class="col-md-6">
                <div class="card">
                  <div class="card-header bg-light py-2">
                    <strong class="small">Основна інформація</strong>
                  </div>
                  <div class="card-body p-2">
                    <table class="table table-sm mb-0 small">
                      <tbody>
                        <tr>
                          <th style="width:140px">ID:</th>
                          <td>{{ data.id }}</td>
                        </tr>
                        <tr>
                          <th>Рівень:</th>
                          <td><span :class="levelBadge(data.level)">{{ data.level }}</span></td>
                        </tr>
                        <tr>
                          <th>Категорія:</th>
                          <td>{{ data.category || '—' }}</td>
                        </tr>
                        <tr>
                          <th>Дата:</th>
                          <td>{{ data.created_at }}</td>
                        </tr>
                        <tr v-if="data.user_id">
                          <th>Користувач:</th>
                          <td>
                            #{{ data.user_id }}
                            <span v-if="data.username" class="text-muted">— {{ data.username }}</span>
                            <span v-if="data.email" class="text-muted">({{ data.email }})</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Request Info -->
              <div class="col-md-6">
                <div class="card">
                  <div class="card-header bg-light py-2">
                    <strong class="small">HTTP запит</strong>
                  </div>
                  <div class="card-body p-2">
                    <table class="table table-sm mb-0 small">
                      <tbody>
                        <tr>
                          <th style="width:140px">URL:</th>
                          <td class="small">{{ data.url || '—' }}</td>
                        </tr>
                        <tr>
                          <th>Метод:</th>
                          <td>
                            <span v-if="data.method" class="badge bg-info">{{ data.method }}</span>
                            <span v-else>—</span>
                          </td>
                        </tr>
                        <tr>
                          <th>IP:</th>
                          <td>{{ data.ip || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Message -->
              <div class="col-12">
                <div class="card">
                  <div class="card-header bg-light py-2">
                    <strong class="small">Повідомлення</strong>
                  </div>
                  <div class="card-body p-2">
                    <pre class="mb-0 small" style="white-space: pre-wrap; word-break: break-word;">{{ data.message }}</pre>
                  </div>
                </div>
              </div>

              <!-- Exception -->
              <div v-if="data.exception_class" class="col-12">
                <div class="card">
                  <div class="card-header bg-light py-2">
                    <strong class="small">Exception</strong>
                  </div>
                  <div class="card-body p-2">
                    <table class="table table-sm mb-0 small">
                      <tbody>
                        <tr>
                          <th style="width:140px">Клас:</th>
                          <td><code>{{ data.exception_class }}</code></td>
                        </tr>
                        <tr v-if="data.file">
                          <th>Файл:</th>
                          <td><code>{{ data.file }}</code></td>
                        </tr>
                        <tr v-if="data.line">
                          <th>Рядок:</th>
                          <td><code>{{ data.line }}</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Stack Trace -->
              <div v-if="data.stack_trace" class="col-12">
                <div class="card">
                  <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                    <strong class="small">Stack Trace</strong>
                    <button class="btn btn-sm btn-outline-secondary" @click="copyStackTrace">
                      <i class="bi bi-clipboard"></i> Копіювати
                    </button>
                  </div>
                  <div class="card-body p-2">
                    <pre class="mb-0 small" style="max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;">{{ formatStackTrace(data.stack_trace) }}</pre>
                  </div>
                </div>
              </div>

              <!-- Context -->
              <div v-if="data.context" class="col-12">
                <div class="card">
                  <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                    <strong class="small">Контекст (додаткові дані)</strong>
                    <button class="btn btn-sm btn-outline-secondary" @click="toggleContextFormat">
                      <i class="bi bi-code"></i> {{ contextFormatted ? 'Raw JSON' : 'Formatted' }}
                    </button>
                  </div>
                  <div class="card-body p-2">
                    <pre v-if="contextFormatted" class="mb-0 small" style="max-height: 300px; overflow-y: auto;">{{ JSON.stringify(data.context, null, 2) }}</pre>
                    <pre v-else class="mb-0 small" style="max-height: 300px; overflow-y: auto; white-space: pre-wrap;">{{ JSON.stringify(data.context) }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer px-4 py-2 bg-light text-end">
          <button class="btn btn-sm btn-secondary" @click="close">Закрити</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'

// Component state
const visible = ref(false)
const errorId = ref(null)
const loading = ref(false)
const error = ref(null)
const data = ref(null)
const contextFormatted = ref(true)
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
  storageKey: 'error-log-detail-modal',
  mode: 'floating',
  defaultWidth: 1100,
  minWidth: 700,
  maxWidth: 1400,
  defaultHeight: 700,
  minHeight: 500,
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

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  loading.value = true
  error.value = null

  try {
    const res = await fetch(`/api/admin/error-logs/${errorId.value}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status === 'success') {
      data.value = json.data
    } else {
      error.value = json.message || 'Помилка завантаження'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function open(id) {
  errorId.value = id
  visible.value = true
  load()
}

function close() {
  visible.value = false
  data.value = null
  errorId.value = null
  window.dispatchEvent(new CustomEvent('error-log-detail-closed'))
}

function handleEscape(e) {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
}

function levelBadge(level) {
  const map = {
    error: 'badge bg-danger',
    critical: 'badge bg-danger',
    alert: 'badge bg-warning text-dark',
    emergency: 'badge bg-dark',
    warning: 'badge bg-warning text-dark',
  }
  return map[level] || 'badge bg-secondary'
}

function formatStackTrace(trace) {
  if (typeof trace === 'string') return trace
  if (trace && typeof trace === 'object') {
    return trace.trace || JSON.stringify(trace, null, 2)
  }
  return 'Немає даних'
}

function copyStackTrace() {
  const text = formatStackTrace(data.value.stack_trace)
  navigator.clipboard.writeText(text).then(() => {
    alert('Stack trace скопійовано в буфер обміну')
  })
}

function toggleContextFormat() {
  contextFormatted.value = !contextFormatted.value
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
  window.addEventListener('open-error-log-detail', (e) => {
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
  max-width: 1100px;
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
