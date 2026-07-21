<template>
  <BaseLayout>
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h5 class="mb-0">Статистика зворотного зв'язку</h5>
      <router-link to="/feedback" class="btn btn-sm btn-outline-primary">
        <i class="bi bi-list"></i> Список звернень
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="row g-3 mb-4">
        <!-- Total -->
        <div class="col-md-3">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="text-muted small mb-1">Всього звернень</div>
                  <h3 class="mb-0">{{ stats.total }}</h3>
                </div>
                <div class="display-4 text-primary opacity-25">
                  <i class="bi bi-inbox"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- New -->
        <div class="col-md-3">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="text-muted small mb-1">Нові</div>
                  <h3 class="mb-0 text-primary">{{ stats.by_status?.new || 0 }}</h3>
                </div>
                <div class="display-4 text-primary opacity-25">
                  <i class="bi bi-bell"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- In Progress -->
        <div class="col-md-3">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="text-muted small mb-1">В роботі</div>
                  <h3 class="mb-0 text-warning">{{ stats.by_status?.in_progress || 0 }}</h3>
                </div>
                <div class="display-4 text-warning opacity-25">
                  <i class="bi bi-hourglass-split"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resolved -->
        <div class="col-md-3">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <div class="text-muted small mb-1">Вирішено</div>
                  <h3 class="mb-0 text-success">{{ stats.by_status?.resolved || 0 }}</h3>
                </div>
                <div class="display-4 text-success opacity-25">
                  <i class="bi bi-check-circle"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <!-- By Type -->
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <h6 class="mb-0">За типом звернення</h6>
            </div>
            <div class="card-body">
              <div class="mb-3" v-for="(count, type) in stats.by_type" :key="type">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="small">
                    <span :class="typeBadge(type)">{{ typeLabel(type) }}</span>
                  </span>
                  <span class="small fw-semibold">{{ count }} ({{ percentage(count, stats.total) }}%)</span>
                </div>
                <div class="progress" style="height: 8px">
                  <div
                    class="progress-bar"
                    :class="typeProgressBar(type)"
                    :style="{ width: percentage(count, stats.total) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- By Status -->
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <h6 class="mb-0">За статусом</h6>
            </div>
            <div class="card-body">
              <div class="mb-3" v-for="(count, status) in stats.by_status" :key="status">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="small">
                    <span :class="statusBadge(status)">{{ statusLabel(status) }}</span>
                  </span>
                  <span class="small fw-semibold">{{ count }} ({{ percentage(count, stats.total) }}%)</span>
                </div>
                <div class="progress" style="height: 8px">
                  <div
                    class="progress-bar"
                    :class="statusProgressBar(status)"
                    :style="{ width: percentage(count, stats.total) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- By Priority -->
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <h6 class="mb-0">За пріоритетом</h6>
            </div>
            <div class="card-body">
              <div class="mb-3" v-for="(count, priority) in stats.by_priority" :key="priority">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="small">
                    <span :class="priorityBadge(priority)">{{ priorityLabel(priority) }}</span>
                  </span>
                  <span class="small fw-semibold">{{ count }} ({{ percentage(count, stats.total) }}%)</span>
                </div>
                <div class="progress" style="height: 8px">
                  <div
                    class="progress-bar"
                    :class="priorityProgressBar(priority)"
                    :style="{ width: percentage(count, stats.total) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="col-md-6">
          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <h6 class="mb-0">Швидкі фільтри</h6>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <router-link to="/feedback?status=new" class="btn btn-sm btn-outline-primary text-start">
                  <i class="bi bi-bell me-2"></i>Нові звернення ({{ stats.by_status?.new || 0 }})
                </router-link>
                <router-link to="/feedback?priority=urgent" class="btn btn-sm btn-outline-danger text-start">
                  <i class="bi bi-exclamation-triangle me-2"></i>Терміново ({{ stats.by_priority?.urgent || 0 }})
                </router-link>
                <router-link to="/feedback?priority=high" class="btn btn-sm btn-outline-warning text-start">
                  <i class="bi bi-arrow-up-circle me-2"></i>Високий пріоритет ({{ stats.by_priority?.high || 0 }})
                </router-link>
                <router-link to="/feedback?type=complaint" class="btn btn-sm btn-outline-danger text-start">
                  <i class="bi bi-exclamation-circle me-2"></i>Скарги ({{ stats.by_type?.complaint || 0 }})
                </router-link>
                <router-link to="/feedback?status=in_progress" class="btn btn-sm btn-outline-warning text-start">
                  <i class="bi bi-hourglass-split me-2"></i>В роботі ({{ stats.by_status?.in_progress || 0 }})
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BaseLayout from '../layouts/BaseLayout.vue'
import { apiGet } from '../utils/api'

const loading = ref(false)
const error = ref(null)
const stats = ref({
  total: 0,
  by_type: {},
  by_status: {},
  by_priority: {},
})

async function load() {
  loading.value = true
  error.value = null

  try {
    const res = await apiGet('/admin/feedback/stats')
    if (res.success) {
      stats.value = res.stats
    } else {
      error.value = res.message || 'Помилка завантаження'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function percentage(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function typeLabel(type) {
  const labels = {
    complaint: 'Скарги',
    suggestion: 'Пропозиції',
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

function typeProgressBar(type) {
  const bars = {
    complaint: 'bg-danger',
    suggestion: 'bg-info',
    question: 'bg-warning',
    other: 'bg-secondary',
  }
  return bars[type] || 'bg-secondary'
}

function statusLabel(status) {
  const labels = {
    new: 'Нові',
    in_progress: 'В роботі',
    resolved: 'Вирішені',
    rejected: 'Відхилені',
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

function statusProgressBar(status) {
  const bars = {
    new: 'bg-primary',
    in_progress: 'bg-warning',
    resolved: 'bg-success',
    rejected: 'bg-secondary',
  }
  return bars[status] || 'bg-secondary'
}

function priorityLabel(priority) {
  const labels = {
    urgent: 'Термін',
    high: 'Високий',
    normal: 'Норм',
    low: 'Низький',
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

function priorityProgressBar(priority) {
  const bars = {
    urgent: 'bg-danger',
    high: 'bg-warning',
    normal: 'bg-secondary',
    low: 'bg-light',
  }
  return bars[priority] || 'bg-secondary'
}

onMounted(() => load())
</script>
