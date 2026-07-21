<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      v-if="visible"
      class="modal-backdrop-simple"
      @click="close"
    ></div>

    <!-- Модальное окно (всегда floating) -->
    <div
      v-if="visible"
      class="modal-window modal-window--floating"
    >
      <div class="card shadow">
        <div class="card-header d-flex justify-content-between align-items-center px-4 py-3">
          <h6 class="mb-0">Очистити старі логи</h6>
          <button class="btn btn-sm btn-outline-secondary" @click="close">✕</button>
        </div>

        <div class="card-body px-4 py-3">
          <p class="mb-3">Видалити логи старіші ніж:</p>
          <div class="input-group">
            <input v-model.number="cleanupDays" type="number" class="form-control" min="1" max="365" />
            <span class="input-group-text">днів</span>
          </div>
          <div v-if="cleanupError" class="alert alert-danger small mt-3 mb-0">{{ cleanupError }}</div>
          <div v-if="cleanupSuccess" class="alert alert-success small mt-3 mb-0">{{ cleanupSuccess }}</div>
        </div>

        <div class="card-footer px-4 py-3 text-end bg-light">
          <button type="button" class="btn btn-sm btn-secondary me-2" @click="close">Скасувати</button>
          <button type="button" class="btn btn-sm btn-danger" @click="doCleanup" :disabled="cleaningUp">
            <span v-if="cleaningUp" class="spinner-border spinner-border-sm me-1"></span>
            Видалити
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Component state
const visible = ref(false)
const cleanupDays = ref(90)
const cleaningUp = ref(false)
const cleanupError = ref('')
const cleanupSuccess = ref('')

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function doCleanup() {
  cleaningUp.value = true
  cleanupError.value = ''
  cleanupSuccess.value = ''

  try {
    const res = await fetch('/api/admin/error-logs/cleanup', {
      method: 'DELETE',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: cleanupDays.value }),
    })
    const json = await res.json()
    if (json.status === 'success') {
      cleanupSuccess.value = json.message
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('error-logs-cleaned'))
        close()
      }, 1500)
    } else {
      cleanupError.value = json.message || 'Помилка очищення'
    }
  } catch (e) {
    cleanupError.value = e.message
  } finally {
    cleaningUp.value = false
  }
}

function open() {
  visible.value = true
  cleanupError.value = ''
  cleanupSuccess.value = ''
}

function close() {
  visible.value = false
}

function handleEscape(e) {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  // Listen for event from parent
  window.addEventListener('open-error-log-cleanup', () => {
    open()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})

defineExpose({ open, close })
</script>

<style scoped>
/* Backdrop */
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1049;
}

/* Модальное окно */
.modal-window {
  position: fixed;
  z-index: 1050;
}

/* Floating режим (по центру) */
.modal-window--floating {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 500px;
  width: 90vw;
}

.card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
