<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="feedback-detail-modal"
    :default-width="860"
    :min-width="600"
    :max-width="1200"
    :default-height="600"
    :min-height="400"
    :max-height="900"
  >
    <template #title>
      <h6 class="mb-0">Деталі #{{ feedbackId }}</h6>
    </template>

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

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-secondary" @click="close">Скасувати</button>
        <button class="btn btn-sm btn-primary" @click="save" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          Зберегти
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import BaseModal from './BaseModal.vue'
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

const formData = reactive({
  status: '',
  priority: '',
  response: '',
})

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає close() нижче —
// тому прибирання даних і подія "closed" винесені сюди, в один watcher на будь-яке
// закриття (а не дублюються по кожному тригеру закриття окремо).
watch(visible, (val, wasVisible) => {
  if (wasVisible && !val) {
    item.value = null
    feedbackId.value = null
    window.dispatchEvent(new CustomEvent('feedback-detail-closed'))
  }
})

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

onMounted(() => {
  // Listen for event from parent
  window.addEventListener('open-feedback-detail', (e) => {
    if (e.detail?.id) {
      open(e.detail.id)
    }
  })
})

defineExpose({ open, close })
</script>
