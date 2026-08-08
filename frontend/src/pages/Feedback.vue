<template>
  <FeedbackDetailModal />
  <ListPageWrapper>
    <div>
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">{{ t('feedback.title') }}</h5>
          <span class="badge bg-secondary">{{ total }}</span>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <input
            v-model="search"
            type="text"
            class="form-control form-control-sm"
            style="width:220px"
            :placeholder="t('feedback.searchPlaceholder')"
            @input="debounceLoad"
          />
          <select v-model="filterType" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">{{ t('filter.allTypes') }}</option>
            <option value="complaint">{{ t('feedback.typeComplaint') }}</option>
            <option value="suggestion">{{ t('feedback.typeSuggestion') }}</option>
            <option value="question">{{ t('feedback.typeQuestion') }}</option>
            <option value="other">{{ t('feedback.typeOther') }}</option>
          </select>
          <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">{{ t('filter.allStatuses') }}</option>
            <option value="new">{{ t('feedback.statusNew') }}</option>
            <option value="in_progress">{{ t('feedback.statusInProgress') }}</option>
            <option value="resolved">{{ t('feedback.statusResolved') }}</option>
            <option value="rejected">{{ t('reviews.statusRejectedOption') }}</option>
          </select>
          <select v-model="filterPriority" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">{{ t('feedback.allPriorities') }}</option>
            <option value="urgent">{{ t('feedback.priorityUrgent') }}</option>
            <option value="high">{{ t('feedback.priorityHigh') }}</option>
            <option value="normal">{{ t('feedback.priorityNormal') }}</option>
            <option value="low">{{ t('feedback.priorityLow') }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead>
              <tr>
                <th style="width:60px" class="text-end">{{ t('table.id') }}</th>
                <th style="width:100px">{{ t('filter.type') }}</th>
                <th style="width:100px">{{ t('filter.status') }}</th>
                <th style="width:90px">{{ t('feedback.colPriority') }}</th>
                <th>{{ t('feedback.colSubject') }}</th>
                <th style="width:180px">{{ t('stoOutreach.colContact') }}</th>
                <th style="width:140px">{{ t('analytics.colDate') }}</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id">
                <td class="text-muted text-end">{{ row.id }}</td>
                <td><span :class="typeBadge(row.type)">{{ typeLabel(row.type) }}</span></td>
                <td><span :class="statusBadge(row.status)">{{ statusLabel(row.status) }}</span></td>
                <td><span :class="priorityBadge(row.priority)">{{ priorityLabel(row.priority) }}</span></td>
                <td>
                  <div class="text-truncate" style="max-width: 400px" :title="row.subject">
                    {{ row.subject }}
                  </div>
                  <div class="text-muted small text-truncate" style="max-width: 400px">
                    {{ row.message }}
                  </div>
                </td>
                <td class="small">
                  <div v-if="row.name" class="text-truncate">{{ row.name }}</div>
                  <div v-if="row.email" class="text-muted text-truncate">{{ row.email }}</div>
                  <div v-if="row.phone" class="text-muted">{{ row.phone }}</div>
                </td>
                <td class="text-muted" style="white-space:nowrap">
                  {{ formatDate(row.created_at) }}
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" @click="openDetail(row.id)" :title="t('reviews.viewTooltip')">
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="8" class="text-center text-muted py-4">{{ t('common.noData') }}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="text-muted small">{{ t('analytics.totalCount', { value: total }) }}</span>
          <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
        </div>
      </div>
    </div>
    </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ListPageWrapper from '../components/ListPageWrapper.vue'
import Pagination from '../components/Pagination.vue'
import FeedbackDetailModal from '../components/FeedbackDetailModal.vue'
import { apiGet } from '../utils/api'
import { useUrlFilters } from '../composables/useUrlFilters'

const { t } = useI18n({ useScope: 'global' })
const loading = ref(false)
const error = ref(null)
const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const search = ref('')
const filterType = ref('')
const filterStatus = ref('')
const filterPriority = ref('')
const detailId = ref(null)

// Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    type: filterType,
    status: filterStatus,
    priority: filterPriority,
    page
  },
  detail: {
    id: detailId,
    onOpen: (id) => {
      window.dispatchEvent(new CustomEvent('open-feedback-detail', { detail: { id } }))
    }
  }
})

const totalPages = computed(() => Math.ceil(total.value / perPage.value))

let debounceTimer = null
const debounceLoad = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 500)
}

async function load(p = 1) {
  loading.value = true
  error.value = null
  page.value = p

  const params = new URLSearchParams({
    page: page.value.toString(),
    per_page: perPage.value.toString(),
  })
  if (search.value) params.set('search', search.value)
  if (filterType.value) params.set('type', filterType.value)
  if (filterStatus.value) params.set('status', filterStatus.value)
  if (filterPriority.value) params.set('priority', filterPriority.value)

  try {
    const res = await apiGet(`/admin/feedback?${params}`)
    if (res.success) {
      items.value = res.data
      total.value = res.pagination.total
    } else {
      error.value = res.message || t('list.loadError')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openDetail(id) {
  detailId.value = id
  window.dispatchEvent(new CustomEvent('open-feedback-detail', { detail: { id } }))
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

function statusLabel(status) {
  const labels = {
    new: t('feedback.statusNewSingular'),
    in_progress: t('feedback.statusInProgress'),
    resolved: t('feedback.statusResolvedSingular'),
    rejected: t('stoList.reviewRejected'),
  }
  return labels[status] || status
}

function statusBadge(status) {
  const badges = {
    new: 'badge bg-primary',
    in_progress: 'badge bg-warning text-dark',
    resolved: 'badge bg-success',
    rejected: 'badge bg-secondary',
  }
  return badges[status] || 'badge bg-secondary'
}

function priorityLabel(priority) {
  const labels = {
    urgent: t('feedback.priorityUrgentAbbr'),
    high: t('feedback.priorityHigh'),
    normal: t('feedback.priorityNormalAbbr'),
    low: t('feedback.priorityLow'),
  }
  return labels[priority] || priority
}

function priorityBadge(priority) {
  const badges = {
    urgent: 'badge bg-danger',
    high: 'badge bg-warning text-dark',
    normal: 'badge bg-secondary',
    low: 'badge bg-light text-dark',
  }
  return badges[priority] || 'badge bg-secondary'
}

onMounted(() => {
  initFromUrl()
  load(page.value)

  // Listen for feedback detail closed
  window.addEventListener('feedback-detail-closed', () => {
    detailId.value = null
  })

  // Listen for feedback update event
  window.addEventListener('feedback-updated', () => {
    load(page.value)
  })
})
</script>

<style scoped>
</style>
