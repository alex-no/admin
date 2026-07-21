<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status"></div>
  </div>
  <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
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

      <div v-if="saveError" class="alert alert-danger mb-0 mt-3">{{ saveError }}</div>
      <div v-if="saveSuccess" class="alert alert-success mb-0 mt-3">Збережено успішно!</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { apiGet, apiPatch } from '../utils/api'

const props = defineProps({
  id: { type: Number, required: true },
})

const emit = defineEmits(['updated', 'close'])

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

async function loadDetail() {
  loading.value = true
  error.value = null
  try {
    const res = await apiGet(`/admin/feedback/${props.id}`)
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
    const res = await apiPatch(`/admin/feedback/${props.id}`, formData)
    if (res.success) {
      saveSuccess.value = true
      setTimeout(() => {
        emit('updated')
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

onMounted(() => loadDetail())
</script>
