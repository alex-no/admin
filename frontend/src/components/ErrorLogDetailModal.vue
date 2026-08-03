<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="error-log-detail-modal"
    :default-width="1100"
    :min-width="700"
    :max-width="1400"
    :default-height="700"
    :min-height="500"
    :max-height="900"
  >
    <template #title>
      <h6 class="mb-0">Деталі помилки #{{ errorId }}</h6>
    </template>

    <ErrorLogDetail
      :loading="loading"
      :error="error"
      :data="data"
      :context-formatted="contextFormatted"
      @toggle-context-format="contextFormatted = !contextFormatted"
    />

    <template #footer>
      <div></div>
      <button class="btn btn-sm btn-secondary" @click="close">Закрити</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { authHeaders } from '@/utils/api'
import BaseModal from './BaseModal.vue'
import ErrorLogDetail from './ErrorLogDetail.vue'

// Модалка тільки завантажує дані й віддає їх у ErrorLogDetail для відображення.
// Це патерн AnalyticsDetailsModal + AnalyticsDetailsModalContent: вміст відокремлений
// від модалки й переиспользуємий (тут — у expand-панелі ErrorLogs.vue).
const visible = ref(false)
const errorId = ref(null)
const loading = ref(false)
const error = ref(null)
const data = ref(null)
const contextFormatted = ref(true)

// Сповіщаємо решту сторінки, що картку закрито (ErrorLogs.vue скидає detailId в URL) —
// незалежно від того, як саме закрили: хрестик/бекдроп/Escape всередині BaseModal,
// чи кнопка "Закрити" в футері нижче.
watch(visible, (val, wasVisible) => {
  if (wasVisible && !val) {
    data.value = null
    errorId.value = null
    window.dispatchEvent(new CustomEvent('error-log-detail-closed'))
  }
})


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
}

function handleEscape(e) {
  if (e.key === 'Escape' && visible.value) {
    close()
  }
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
