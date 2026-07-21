<template>
  <Teleport to="body">
    <!-- Backdrop только для floating режима -->
    <div
      v-if="isOpen && mode === 'floating'"
      class="modal-backdrop-simple"
      @click="close"
    ></div>

    <!-- Модальное окно -->
    <div
      v-if="isOpen"
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
          <h6 class="mb-0">Ролі: {{ userName }}</h6>
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
          <div v-if="error" class="alert alert-danger small mb-3">{{ error }}</div>

          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
          </div>

          <div v-else>
            <div v-for="role in availableRoles" :key="role.id" class="form-check mb-3">
              <input
                class="form-check-input"
                type="checkbox"
                :id="'role-' + role.id"
                :value="role.id"
                v-model="selectedRoles"
              />
              <label class="form-check-label" :for="'role-' + role.id">
                <strong>{{ role.name }}</strong>
                <div class="small text-muted">{{ role.description }}</div>
              </label>
            </div>
          </div>
        </div>

        <div class="card-footer px-4 py-3 text-end bg-light">
          <button
            @click="close"
            class="btn btn-secondary btn-sm me-2"
          >
            Скасувати
          </button>
          <button
            @click="save"
            class="btn btn-primary btn-sm"
            :disabled="saving"
          >
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'
import { useAuth } from '@/composables/useAuth'

const auth = useAuth()

// Component state
const isOpen = ref(false)
const userId = ref(null)
const userName = ref('')
const availableRoles = ref([])
const selectedRoles = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref(null)
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
  storageKey: 'role-management-modal',
  mode: 'floating',
  defaultWidth: 500,
  minWidth: 400,
  maxWidth: 700,
  defaultHeight: 400,
  minHeight: 300,
  maxHeight: 700,
})

// Отправляем событие об изменении margin для родительской страницы
watch([isOpen, contentMargin], () => {
  if (isOpen.value) {
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

async function loadRoles() {
  loading.value = true
  try {
    const response = await fetch('/api/admin/management/roles', {
      headers: auth.authHeaders(),
    })
    const json = await response.json()

    if (json.status === 'success') {
      availableRoles.value = json.roles
    } else {
      error.value = json.message || 'Помилка завантаження ролей'
    }
  } catch (e) {
    error.value = 'Помилка з\'єднання з сервером'
  } finally {
    loading.value = false
  }
}

function open(user) {
  userId.value = user.id
  userName.value = user.username
  selectedRoles.value = user.roles.map(r => r.id)
  error.value = null
  isOpen.value = true

  // Загружаем роли при открытии
  loadRoles()
}

async function save() {
  saving.value = true
  error.value = null

  try {
    const response = await fetch(`/api/admin/management/users/${userId.value}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.authHeaders(),
      },
      body: JSON.stringify({ role_ids: selectedRoles.value }),
    })
    const json = await response.json()

    if (json.status === 'success') {
      // Отправляем событие об успешном сохранении
      window.dispatchEvent(new CustomEvent('roles-updated'))
      close()
    } else {
      error.value = json.message || 'Помилка збереження ролей'
    }
  } catch (e) {
    error.value = 'Помилка з\'єднання'
  } finally {
    saving.value = false
  }
}

function close() {
  isOpen.value = false
  userId.value = null
  userName.value = ''
  selectedRoles.value = []
  error.value = null
}

function handleEscape(e) {
  if (e.key === 'Escape' && isOpen.value) {
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
  // Listen for event from parent
  window.addEventListener('open-role-management', (e) => {
    if (e.detail?.user) {
      open(e.detail.user)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

defineExpose({ open })
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
  max-width: 500px;
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
