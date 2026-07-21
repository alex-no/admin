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
          class="card-header bg-primary text-white d-flex justify-content-between align-items-center px-4 py-3"
          :class="isDraggable ? 'cursor-grab' : ''"
          @mousedown="isDraggable && modalRef ? startDrag($event, modalRef) : null"
        >
          <h6 class="mb-0">Змінити тип клієнта</h6>
          <div class="d-flex gap-2 align-items-center">
            <button
              class="btn btn-sm btn-light"
              @mousedown.stop
              @click="cycleMode"
              :title="getModeSwitchTitle()"
            >
              <i :class="getModeIcon()"></i>
            </button>
            <button class="btn btn-sm btn-light" @mousedown.stop @click="close">✕</button>
          </div>
        </div>

        <div class="card-body px-4 py-3" style="flex:1; overflow-y:auto;">
          <div class="d-grid gap-2">
            <button
              v-for="type in types"
              :key="type.value"
              class="btn btn-outline-secondary text-start d-flex align-items-center gap-2"
              :class="{ 'btn-primary text-white': type.value === currentType }"
              @click="select(type.value)"
            >
              <span style="font-size: 1.2em">{{ type.icon }}</span>
              <span>{{ type.label }}</span>
              <span v-if="type.value === currentType" class="ms-auto badge bg-light text-dark">поточний</span>
            </button>
          </div>
        </div>

        <div class="card-footer px-4 py-3 text-end bg-light">
          <button class="btn btn-sm btn-outline-secondary" @click="close">Скасувати</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'

// Component state
const isOpen = ref(false)
const currentType = ref(null)
const recordId = ref(null)
const resolve = ref(null)
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
  storageKey: 'change-client-type-modal',
  mode: 'floating',
  defaultWidth: 400,
  minWidth: 320,
  maxWidth: 600,
  defaultHeight: 350,
  minHeight: 250,
  maxHeight: 600,
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

const types = [
  { value: 'human', icon: '👤', label: 'Людина' },
  { value: 'bot', icon: '🤖', label: 'Бот' },
  { value: 'suspicious', icon: '⚠️', label: 'Підозрілий' },
  { value: 'unknown', icon: '❓', label: 'Невідомий' },
]

function open(id, current) {
  recordId.value = id
  currentType.value = current
  isOpen.value = true
  return new Promise((res) => {
    resolve.value = res
  })
}

function select(type) {
  if (resolve.value) {
    resolve.value(type)
  }
  close()
}

function close() {
  isOpen.value = false
  if (resolve.value) {
    resolve.value(null)
  }
  recordId.value = null
  currentType.value = null
  resolve.value = null
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
  window.addEventListener('open-change-client-type', (e) => {
    open(e.detail.id, e.detail.currentType).then((newType) => {
      if (newType) {
        window.dispatchEvent(
          new CustomEvent('client-type-selected', {
            detail: { id: e.detail.id, newType }
          })
        )
      }
    })
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
  max-width: 400px;
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
