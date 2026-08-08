<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status"></div>
  </div>
  <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
  <div v-else-if="item">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('filter.type') }}</label>
        <div><span :class="typeBadge(item.type)">{{ typeLabel(item.type) }}</span></div>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('table.id') }}</label>
        <div class="text-muted">#{{ item.id }}</div>
      </div>
      <div class="col-12">
        <label class="form-label small fw-semibold text-muted">{{ t('feedback.colSubject') }}</label>
        <div class="fw-semibold">{{ item.subject }}</div>
      </div>
      <div class="col-12">
        <label class="form-label small fw-semibold text-muted">{{ t('feedbackDetailModal.messageLabel') }}</label>
        <div class="border rounded p-3 bg-light" style="white-space: pre-wrap">{{ item.message }}</div>
      </div>

      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('filter.status') }}</label>
        <select v-model="formData.status" class="form-select form-select-sm">
          <option value="new">{{ t('feedback.statusNewSingular') }}</option>
          <option value="in_progress">{{ t('feedback.statusInProgress') }}</option>
          <option value="resolved">{{ t('feedback.statusResolvedSingular') }}</option>
          <option value="rejected">{{ t('stoList.reviewRejected') }}</option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('feedback.colPriority') }}</label>
        <select v-model="formData.priority" class="form-select form-select-sm">
          <option value="low">{{ t('feedback.priorityLow') }}</option>
          <option value="normal">{{ t('feedback.priorityNormal') }}</option>
          <option value="high">{{ t('feedback.priorityHigh') }}</option>
          <option value="urgent">{{ t('feedback.priorityUrgentAbbr') }}</option>
        </select>
      </div>

      <div class="col-12">
        <label class="form-label small fw-semibold text-muted">{{ t('feedbackDetailModal.adminResponseLabel') }}</label>
        <textarea v-model="formData.response" class="form-control form-control-sm" rows="4" :placeholder="t('feedbackDetailModal.responsePlaceholder')"></textarea>
      </div>

      <hr class="my-2" />

      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('users.nameLabel') }}</label>
        <div>{{ item.name || '—' }}</div>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">Email</label>
        <div>{{ item.email || '—' }}</div>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('stoList.colPhone') }}</label>
        <div>{{ item.phone || '—' }}</div>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('feedbackDetailModal.ipAddressLabel') }}</label>
        <div class="text-muted small">{{ item.ip_address || '—' }}</div>
      </div>

      <div v-if="item.related_entity_type" class="col-12">
        <label class="form-label small fw-semibold text-muted">{{ t('feedbackDetailModal.relatedEntityLabel') }}</label>
        <div class="text-muted small">
          {{ item.related_entity_type }} #{{ item.related_entity_id }}
        </div>
      </div>

      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.createdAtLabel') }}</label>
        <div class="text-muted small">{{ formatDate(item.created_at) }}</div>
      </div>
      <div class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.updatedAtLabel') }}</label>
        <div class="text-muted small">{{ formatDate(item.updated_at) }}</div>
      </div>
      <div v-if="item.resolved_at" class="col-md-6">
        <label class="form-label small fw-semibold text-muted">{{ t('feedbackDetailModal.resolvedAtLabel') }}</label>
        <div class="text-muted small">{{ formatDate(item.resolved_at) }}</div>
      </div>

      <div v-if="saveError" class="alert alert-danger mb-0 mt-3">{{ saveError }}</div>
      <div v-if="saveSuccess" class="alert alert-success mb-0 mt-3">{{ t('feedbackDetailModal.savedSuccessfully') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet, apiPatch } from '../utils/api'

const { t } = useI18n({ useScope: 'global' })

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
      error.value = res.message || t('list.loadError')
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
      saveError.value = res.message || t('list.saveError')
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
    complaint: t('feedback.typeComplaintSingular'),
    suggestion: t('feedback.typeSuggestionSingular'),
    question: t('feedback.typeQuestion'),
    other: t('feedback.typeOther'),
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
