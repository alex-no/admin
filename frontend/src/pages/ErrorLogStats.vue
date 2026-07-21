<template>
  <BaseLayout>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <router-link to="/error-logs" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i> Назад
        </router-link>
        <h5 class="mb-0">Статистика помилок</h5>
      </div>
      <div class="d-flex gap-2">
        <select v-model="days" class="form-select form-select-sm" style="width:auto" @change="load">
          <option :value="7">За 7 днів</option>
          <option :value="14">За 14 днів</option>
          <option :value="30">За 30 днів</option>
          <option :value="60">За 60 днів</option>
          <option :value="90">За 90 днів</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="stats" class="row g-3">
      <!-- Total -->
      <div class="col-md-3">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-2">Всього помилок</h6>
            <h2 class="mb-0">{{ stats.total }}</h2>
            <small class="text-muted">за {{ stats.period_days }} днів</small>
          </div>
        </div>
      </div>

      <!-- By Level -->
      <div class="col-md-9">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>По рівнях</strong>
          </div>
          <div class="card-body">
            <div class="row g-2">
              <div v-for="item in stats.by_level" :key="item.level" class="col-md-4">
                <div class="d-flex justify-content-between align-items-center p-2 border rounded">
                  <span :class="levelBadge(item.level)">{{ item.level }}</span>
                  <strong>{{ item.count }}</strong>
                </div>
              </div>
              <div v-if="!stats.by_level.length" class="col-12 text-center text-muted py-3">
                Немає даних
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- By Category -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Топ-10 категорій</strong>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>Категорія</th>
                  <th class="text-end">Кількість</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.by_category" :key="item.category">
                  <td><code class="small">{{ item.category }}</code></td>
                  <td class="text-end"><strong>{{ item.count }}</strong></td>
                </tr>
                <tr v-if="!stats.by_category.length">
                  <td colspan="2" class="text-center text-muted py-3">Немає даних</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- By Exception -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Топ-10 exceptions</strong>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>Exception</th>
                  <th class="text-end">Кількість</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.by_exception" :key="item.exception_class">
                  <td>
                    <code class="small" :title="item.exception_class">{{ shortException(item.exception_class) }}</code>
                  </td>
                  <td class="text-end"><strong>{{ item.count }}</strong></td>
                </tr>
                <tr v-if="!stats.by_exception.length">
                  <td colspan="2" class="text-center text-muted py-3">Немає даних</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Динаміка помилок по днях</strong>
          </div>
          <div class="card-body">
            <div v-if="trendData.labels.length" style="max-height: 400px; overflow-x: auto;">
              <TrendChart :labels="trendData.labels" :datasets="trendData.datasets" />
            </div>
            <div v-else class="text-center text-muted py-5">
              Немає даних для графіка
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseLayout from '../layouts/BaseLayout.vue'
import TrendChart from '../components/TrendChart.vue'

const stats = ref(null)
const loading = ref(false)
const error = ref('')
const days = ref(7)

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`/api/admin/error-logs/stats?days=${days.value}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status === 'success') {
      stats.value = json.data
    } else {
      error.value = json.message || 'Помилка завантаження'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const trendData = computed(() => {
  if (!stats.value || !stats.value.trend) {
    return { labels: [], datasets: [] }
  }

  // Group by date
  const dateMap = {}
  stats.value.trend.forEach(item => {
    if (!dateMap[item.date]) dateMap[item.date] = {}
    dateMap[item.date][item.level] = item.count
  })

  const labels = Object.keys(dateMap).sort()
  const levels = ['error', 'critical', 'warning', 'alert', 'emergency']
  const datasets = []

  levels.forEach(level => {
    const data = labels.map(date => dateMap[date][level] || 0)
    const total = data.reduce((sum, val) => sum + val, 0)
    if (total > 0) {
      datasets.push({
        label: level,
        data,
        color: levelColor(level),
      })
    }
  })

  return { labels, datasets }
})

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

function levelColor(level) {
  const map = {
    error: '#dc3545',
    critical: '#721c24',
    alert: '#ffc107',
    emergency: '#212529',
    warning: '#ff9800',
  }
  return map[level] || '#6c757d'
}

function shortException(str) {
  if (!str) return '—'
  const parts = str.split('\\')
  return parts[parts.length - 1]
}

onMounted(() => load())
</script>
