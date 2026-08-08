<template>
  <BaseLayout>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <router-link to="/analytics" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i> {{ t('analytics.back') }}
        </router-link>
        <h5 class="mb-0">{{ t('analytics.statsTitle') }}</h5>
      </div>
      <div class="d-flex gap-2">
        <select v-model="section" class="form-select form-select-sm" style="width:auto" @change="load">
          <option value="">{{ t('analytics.filters.allSections') }}</option>
          <option value="frontend">{{ t('analytics.filters.sectionFrontend') }}</option>
          <option value="admin">{{ t('analytics.filters.sectionAdmin') }}</option>
        </select>
        <select v-model="days" class="form-select form-select-sm" style="width:auto" @change="load">
          <option :value="1">{{ t('analytics.period24hFull') }}</option>
          <option :value="7">{{ t('analytics.periodDaysFull', { days: 7 }) }}</option>
          <option :value="14">{{ t('analytics.periodDaysFull', { days: 14 }) }}</option>
          <option :value="30">{{ t('analytics.periodDaysFull', { days: 30 }) }}</option>
          <option :value="60">{{ t('analytics.periodDaysFull', { days: 60 }) }}</option>
          <option :value="90">{{ t('analytics.periodDaysFull', { days: 90 }) }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="stats" class="row g-3">
      <!-- Summary Cards -->
      <div class="col-md-3">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-2">{{ t('analytics.totalViews') }}</h6>
            <h2 class="mb-0">{{ stats.total }}</h2>
            <small class="text-muted">{{ t('analytics.periodDaysSuffix', { days: stats.period_days }) }}</small>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-2">{{ t('analytics.uniqueVisitors') }}</h6>
            <h2 class="mb-0">{{ stats.unique_visitors }}</h2>
            <small class="text-muted">{{ t('analytics.byIpNoBots') }}</small>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-2">{{ t('analytics.avgResponseTime') }}</h6>
            <h2 class="mb-0" :class="responseTimeClass(stats.response_time?.avg_time)">
              {{ Math.round(stats.response_time?.avg_time || 0) }}ms
            </h2>
            <small class="text-muted">{{ t('analytics.maxTime', { value: stats.response_time?.max_time }) }}</small>
          </div>
        </div>
      </div>

      <div class="col-md-3">
        <div class="card text-center shadow-sm">
          <div class="card-body">
            <h6 class="text-muted mb-2">{{ t('analytics.bots') }}</h6>
            <h2 class="mb-0">{{ botsCount }}</h2>
            <small class="text-muted">{{ t('analytics.botsTraffic', { percent: botsPercent }) }}</small>
          </div>
        </div>
      </div>

      <!-- Top Pages -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.topPages') }}</strong>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>URL</th>
                  <th class="text-end">{{ t('analytics.views') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.top_pages" :key="item.path">
                  <td><code class="small">{{ item.path }}</code></td>
                  <td class="text-end"><strong>{{ item.views }}</strong></td>
                </tr>
                <tr v-if="!stats.top_pages?.length">
                  <td colspan="2" class="text-center text-muted py-3">{{ t('common.noData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Top Referers -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.topReferers') }}</strong>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>Referer</th>
                  <th class="text-end">{{ t('analytics.countLabel') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.top_referers" :key="item.referer">
                  <td class="small text-truncate" style="max-width: 300px">{{ shortUrl(item.referer) }}</td>
                  <td class="text-end"><strong>{{ item.count }}</strong></td>
                </tr>
                <tr v-if="!stats.top_referers?.length">
                  <td colspan="2" class="text-center text-muted py-3">{{ t('common.noData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Device Types -->
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.byDevice') }}</strong>
          </div>
          <div class="card-body">
            <div v-for="item in stats.by_device" :key="item.device_type" class="d-flex justify-content-between align-items-center mb-2">
              <span>
                <i :class="deviceIcon(item.device_type)"></i>
                {{ deviceName(item.device_type) }}
              </span>
              <strong>{{ item.count }}</strong>
            </div>
            <div v-if="!stats.by_device?.length" class="text-center text-muted py-3">{{ t('common.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- Browsers -->
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.byBrowser') }}</strong>
          </div>
          <div class="card-body">
            <div v-for="item in stats.by_browser" :key="item.browser" class="d-flex justify-content-between align-items-center mb-2">
              <span>{{ item.browser }}</span>
              <strong>{{ item.count }}</strong>
            </div>
            <div v-if="!stats.by_browser?.length" class="text-center text-muted py-3">{{ t('common.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- OS -->
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.byOs') }}</strong>
          </div>
          <div class="card-body">
            <div v-for="item in stats.by_os" :key="item.os" class="d-flex justify-content-between align-items-center mb-2">
              <span>{{ item.os }}</span>
              <strong>{{ item.count }}</strong>
            </div>
            <div v-if="!stats.by_os?.length" class="text-center text-muted py-3">{{ t('common.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- Client Types Distribution -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.byClientType') }}</strong>
          </div>
          <div class="card-body">
            <div v-for="item in stats.by_client_type" :key="item.client_type" class="d-flex justify-content-between align-items-center mb-2">
              <span :class="clientTypeBadge(item.client_type)" style="min-width: 140px">
                {{ clientTypeLabel(item.client_type) }}
              </span>
              <div class="flex-grow-1 mx-3">
                <div class="progress" style="height: 20px">
                  <div
                    class="progress-bar"
                    :class="clientTypeProgressColor(item.client_type)"
                    :style="`width: ${clientTypePercent(item.count)}%`"
                  >
                    {{ clientTypePercent(item.count) }}%
                  </div>
                </div>
              </div>
              <strong style="min-width: 60px; text-align: right">{{ item.count }}</strong>
            </div>
            <div v-if="!stats.by_client_type?.length" class="text-center text-muted py-3">{{ t('common.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- Bot Categories -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.byBotCategoryTitle') }}</strong>
          </div>
          <div class="card-body">
            <div v-for="item in stats.bot_categories" :key="item.bot_category" class="d-flex justify-content-between align-items-center mb-2">
              <span :class="botCategoryBadge(item.bot_category)" style="min-width: 180px">
                {{ botCategoryLabel(item.bot_category) }}
              </span>
              <div class="flex-grow-1 mx-3">
                <div class="progress" style="height: 20px">
                  <div
                    class="progress-bar"
                    :class="botCategoryProgressColor(item.bot_category)"
                    :style="`width: ${botCategoryPercent(item.count)}%`"
                  >
                    {{ botCategoryPercent(item.count) }}%
                  </div>
                </div>
              </div>
              <strong style="min-width: 60px; text-align: right">{{ item.count }}</strong>
            </div>
            <div v-if="!stats.bot_categories?.length" class="text-center text-muted py-3">{{ t('common.noData') }}</div>
          </div>
        </div>
      </div>

      <!-- Top Bots -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.topBots') }}</strong>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>{{ t('analytics.clientTypePlain.bot') }}</th>
                  <th class="text-end">{{ t('analytics.requests') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in stats.top_bots" :key="item.bot_name">
                  <td><i class="bi bi-robot"></i> {{ item.bot_name }}</td>
                  <td class="text-end"><strong>{{ item.count }}</strong></td>
                </tr>
                <tr v-if="!stats.top_bots?.length">
                  <td colspan="2" class="text-center text-muted py-3">{{ t('common.noData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-light">
            <strong>{{ t('analytics.trendByDays') }}</strong>
          </div>
          <div class="card-body">
            <div v-if="trendData.labels.length" style="max-height: 300px; overflow-x: auto;">
              <TrendChart :labels="trendData.labels" :datasets="trendData.datasets" :height="250" />
            </div>
            <div v-else class="text-center text-muted py-5">{{ t('common.noData') }}</div>
          </div>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { authHeaders } from '@/utils/api'
import BaseLayout from '../layouts/BaseLayout.vue'
import TrendChart from '../components/TrendChart.vue'

const { t } = useI18n({ useScope: 'global' })
const stats = ref(null)
const loading = ref(false)
const error = ref('')
const days = ref(7)
const section = ref('')

const botsCount = computed(() => {
  const botsData = stats.value?.bots_vs_real || []
  const bot = botsData.find(item => item.is_bot === 1)
  return bot?.count || 0
})

const botsPercent = computed(() => {
  if (!stats.value?.total) return 0
  return Math.round((botsCount.value / stats.value.total) * 100)
})

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
      label: t('analytics.legendUsers'),
      data: labels.map(date => dateMap[date].real),
      color: 'var(--bs-primary)',
    },
    {
      label: t('analytics.legendBots'),
      data: labels.map(date => dateMap[date].bots),
      color: 'var(--bs-secondary-color)',
    },
  ]

  return { labels, datasets }
})


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
      error.value = json.message || t('analytics.loadError')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function responseTimeClass(time) {
  if (!time) return ''
  if (time < 100) return 'text-success'
  if (time < 500) return 'text-warning'
  return 'text-danger'
}

function deviceIcon(type) {
  const map = {
    mobile: 'bi-phone',
    tablet: 'bi-tablet',
    desktop: 'bi-display',
  }
  return map[type] || 'bi-question'
}

function deviceName(type) {
  const map = {
    mobile: 'Mobile',
    tablet: 'Tablet',
    desktop: 'Desktop',
  }
  return map[type] || type
}

function shortUrl(url) {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return u.hostname
  } catch {
    return url.slice(0, 50)
  }
}

function clientTypeLabel(type) {
  const labels = {
    human: t('analytics.clientTypePlural.human'),
    bot: t('analytics.clientTypePlural.bot'),
    suspicious: t('analytics.clientTypePlural.suspicious'),
    unknown: t('analytics.clientTypePlural.unknown'),
  }
  return labels[type] || t('analytics.clientType.unclassified')
}

function clientTypeBadge(type) {
  const badges = {
    human: 'badge bg-success',
    bot: 'badge bg-secondary',
    suspicious: 'badge bg-warning text-dark',
    unknown: 'badge bg-info',
  }
  return badges[type] || 'badge bg-light text-dark'
}

function clientTypeProgressColor(type) {
  const colors = {
    human: 'bg-success',
    bot: 'bg-secondary',
    suspicious: 'bg-warning',
    unknown: 'bg-info',
  }
  return colors[type] || 'bg-light'
}

function clientTypePercent(count) {
  if (!stats.value?.total) return 0
  return Math.round((count / stats.value.total) * 100)
}

function botCategoryLabel(category) {
  const labels = {
    search_engine: t('analytics.filters.groupSearchEngines'),
    seo_tool: t('analytics.filters.groupSeoTools'),
    monitoring: t('analytics.filters.groupMonitoring'),
    scraper: t('analytics.filters.scrapers'),
    malicious: t('analytics.botCategoryMalicious'),
  }
  return labels[category] || category
}

function botCategoryBadge(category) {
  const badges = {
    search_engine: 'badge bg-primary',
    seo_tool: 'badge bg-info',
    monitoring: 'badge bg-success',
    scraper: 'badge bg-warning text-dark',
    malicious: 'badge bg-danger',
  }
  return badges[category] || 'badge bg-secondary'
}

function botCategoryProgressColor(category) {
  const colors = {
    search_engine: 'bg-primary',
    seo_tool: 'bg-info',
    monitoring: 'bg-success',
    scraper: 'bg-warning',
    malicious: 'bg-danger',
  }
  return colors[category] || 'bg-secondary'
}

function botCategoryPercent(count) {
  if (!botsCount.value) return 0
  return Math.round((count / botsCount.value) * 100)
}

onMounted(() => load())
</script>
