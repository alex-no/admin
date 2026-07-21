<template>
  <BaseLayout>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <router-link to="/analytics" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i> Назад
        </router-link>
        <h5 class="mb-0">Графіки та візуалізації</h5>
      </div>
      <div class="d-flex gap-2">
        <select v-model="section" class="form-select form-select-sm" style="width:auto" @change="load">
          <option value="">Всі розділи</option>
          <option value="frontend">Frontend</option>
          <option value="admin">Адмінка</option>
        </select>
        <select v-model="days" class="form-select form-select-sm" style="width:auto" @change="load">
          <option :value="1">24 години</option>
          <option :value="7">7 днів</option>
          <option :value="14">14 днів</option>
          <option :value="30">30 днів</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="stats" class="row g-3">
      <!-- Main Trend Chart -->
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Динаміка відвідувань по днях</strong>
          </div>
          <div class="card-body">
            <TrendChart
              v-if="trendData.labels.length"
              :labels="trendData.labels"
              :datasets="trendData.datasets"
              :height="300"
            />
            <div v-else class="text-center text-muted py-5">Немає даних</div>
          </div>
        </div>
      </div>

      <!-- Hourly Distribution (if 1 day selected) -->
      <div v-if="days === 1 && stats.hourly?.length" class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Розподіл по годинах (24h)</strong>
          </div>
          <div class="card-body">
            <HourlyChart :data="stats.hourly" />
          </div>
        </div>
      </div>

      <!-- Device Type Chart -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>По типах пристроїв</strong>
          </div>
          <div class="card-body">
            <PieChart :data="stats.by_device" label-key="device_type" value-key="count" />
          </div>
        </div>
      </div>

      <!-- Browser Chart -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>По браузерах</strong>
          </div>
          <div class="card-body">
            <BarChart :data="stats.by_browser" label-key="browser" value-key="count" title="Браузери" />
          </div>
        </div>
      </div>

      <!-- OS Chart -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>По операційних системах</strong>
          </div>
          <div class="card-body">
            <BarChart :data="stats.by_os" label-key="os" value-key="count" title="ОС" />
          </div>
        </div>
      </div>

      <!-- Client Types Chart -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Типи клієнтів</strong>
          </div>
          <div class="card-body">
            <PieChart :data="clientTypesForChart" label-key="label" value-key="count" />
          </div>
        </div>
      </div>

      <!-- Bot Categories Chart -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>Категорії ботів</strong>
          </div>
          <div class="card-body">
            <PieChart :data="botCategoriesForChart" label-key="label" value-key="count" />
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
import PieChart from '../components/PieChart.vue'
import BarChart from '../components/BarChart.vue'
import HourlyChart from '../components/HourlyChart.vue'

const stats = ref(null)
const loading = ref(false)
const error = ref('')
const days = ref(7)
const section = ref('')

const trendData = computed(() => {
  if (!stats.value || !stats.value.trend) {
    return { labels: [], datasets: [] }
  }

  const dateMap = {}
  stats.value.trend.forEach(item => {
    if (!dateMap[item.date]) dateMap[item.date] = { real: 0, bots: 0 }
    if (item.is_bot === 0) dateMap[item.date].real = item.count
    else dateMap[item.date].bots = item.count
  })

  const labels = Object.keys(dateMap).sort()
  const datasets = [
    {
      label: 'Користувачі',
      data: labels.map(date => dateMap[date].real),
      color: '#0d6efd',
    },
    {
      label: 'Боти',
      data: labels.map(date => dateMap[date].bots),
      color: '#6c757d',
    },
  ]

  return { labels, datasets }
})

const clientTypesForChart = computed(() => {
  if (!stats.value?.by_client_type) return []

  const labels = {
    human: '👤 Люди',
    bot: '🤖 Боти',
    suspicious: '⚠️ Підозрілі',
    unknown: '❓ Невідомі',
  }

  return stats.value.by_client_type.map(item => ({
    label: labels[item.client_type] || item.client_type,
    count: item.count
  }))
})

const botCategoriesForChart = computed(() => {
  if (!stats.value?.bot_categories) return []

  const labels = {
    search_engine: '🔍 Пошукові системи',
    seo_tool: '📊 SEO інструменти',
    monitoring: '🔔 Моніторинг',
    scraper: '🤖 Scrapers',
    malicious: '🚫 Шкідливі',
  }

  return stats.value.bot_categories.map(item => ({
    label: labels[item.bot_category] || item.bot_category,
    count: item.count
  }))
})

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  loading.value = true
  error.value = ''

  const params = new URLSearchParams({ days: days.value })
  if (section.value) params.set('section', section.value)

  try {
    const res = await fetch(`/api/admin/analytics/stats?${params}`, { headers: authHeaders() })
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

onMounted(() => load())
</script>
