<template>
  <AnalyticsDetailsModal />
  <ChangeClientTypeModal />
  <ListPageWrapper>
    <div>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <div class="d-flex align-items-center gap-2">
        <h5 class="mb-0">{{ t('analytics.title') }}</h5>
        <router-link to="/analytics/stats" class="btn btn-sm btn-outline-primary">
          <i class="bi bi-bar-chart"></i> {{ t('analytics.statsLink') }}
        </router-link>
        <router-link to="/analytics/charts" class="btn btn-sm btn-outline-primary">
          <i class="bi bi-graph-up-arrow"></i> {{ t('analytics.chartsLink') }}
        </router-link>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          style="width:200px"
          :placeholder="t('analytics.searchPlaceholder')"
          @input="debounceLoad"
        />
        <select v-model="clientTypeFilter" class="form-select form-select-sm" style="width:220px" @change="load(1)">
          <option value="">{{ t('analytics.filters.allClientTypes') }}</option>

          <optgroup :label="t('analytics.filters.groupHumans')">
            <option value="human">{{ t('analytics.filters.allHumans') }}</option>
            <option value="human_desktop">{{ t('analytics.filters.desktop') }}</option>
            <option value="human_mobile">{{ t('analytics.filters.mobile') }}</option>
            <option value="human_tablet">{{ t('analytics.filters.tablet') }}</option>
            <option value="human_unknown">{{ t('analytics.filters.unknownPlural') }}</option>
          </optgroup>

          <optgroup :label="t('analytics.filters.groupSearchEngines')">
            <option value="bot_search_engine">{{ t('analytics.filters.allSearchEngines') }}</option>
            <option value="bot_search_google">Google</option>
            <option value="bot_search_yandex">Yandex</option>
            <option value="bot_search_bing">Bing</option>
            <option value="bot_search_other">{{ t('analytics.filters.otherSearchEngines') }}</option>
            <option value="bot_search_unknown">{{ t('analytics.filters.unknownPlural') }}</option>
          </optgroup>

          <optgroup :label="t('analytics.filters.groupSeoTools')">
            <option value="bot_seo_tool">{{ t('analytics.filters.allSeoTools') }}</option>
            <option value="bot_seo_unknown">{{ t('analytics.filters.unknownPlural') }}</option>
          </optgroup>

          <optgroup :label="t('analytics.filters.groupMonitoring')">
            <option value="bot_monitoring">{{ t('analytics.filters.allMonitoring') }}</option>
            <option value="bot_monitoring_unknown">{{ t('analytics.filters.unknownPlural') }}</option>
          </optgroup>

          <optgroup :label="t('analytics.filters.groupBadBots')">
            <option value="bot_scraper">{{ t('analytics.filters.scrapers') }}</option>
            <option value="bot_malicious">{{ t('analytics.filters.malicious') }}</option>
            <option value="bot_bad_unknown">{{ t('analytics.filters.unknownPlural') }}</option>
          </optgroup>

          <optgroup :label="t('analytics.filters.groupOther')">
            <option value="suspicious">{{ t('analytics.filters.suspiciousPlural') }}</option>
            <option value="unknown">{{ t('analytics.filters.unknownPlural') }}</option>
            <option value="unclassified">{{ t('analytics.filters.unclassified') }}</option>
          </optgroup>
        </select>
        <select v-model="deviceFilter" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">{{ t('analytics.filters.allDevices') }}</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        <select v-model="statusFilter" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">{{ t('analytics.filters.allStatuses') }}</option>
          <option value="200">200 OK</option>
          <option value="201">201 Created</option>
          <option value="204">204 No Content</option>
          <option value="301">301 Moved</option>
          <option value="302">302 Found</option>
          <option value="400">400 Bad Request</option>
          <option value="401">401 Unauthorized</option>
          <option value="403">403 Forbidden</option>
          <option value="404">404 Not Found</option>
          <option value="422">422 Unprocessable</option>
          <option value="500">500 Server Error</option>
          <option value="503">503 Unavailable</option>
          <option value="other">{{ t('analytics.filters.otherStatuses') }}</option>
        </select>
        <select v-model="methodFilter" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">{{ t('analytics.filters.allMethods') }}</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="other">{{ t('analytics.filters.otherMethods') }}</option>
        </select>
        <input
          v-model="filterDateFrom"
          type="date"
          class="form-control form-control-sm"
          style="width:auto"
          @change="load(1)"
        />
        <input
          v-model="filterDateTo"
          type="date"
          class="form-control form-control-sm"
          style="width:auto"
          @change="load(1)"
        />
        <div class="input-group" style="width:auto">
          <input
            v-model="ipFilter"
            type="text"
            class="form-control form-control-sm"
            style="width:150px"
            :placeholder="t('analytics.ipPlaceholder')"
            @input="debounceLoad"
          />
          <button
            class="btn btn-sm btn-outline-secondary"
            type="button"
            :title="t('analytics.myIpTooltip')"
            @click="showMyIp"
          >
            <i class="bi bi-hdd-network"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk actions panel -->
    <div v-if="selected.length > 0" class="alert alert-info d-flex align-items-center gap-2 mb-3">
      <span><strong>{{ selected.length }}</strong> {{ t('analytics.bulk.selected') }}</span>
      <select v-model="bulkClientType" class="form-select form-select-sm" style="width:auto">
        <option value="">{{ t('analytics.bulk.changeTypeTo') }}</option>
        <option value="human">{{ t('analytics.clientType.human') }}</option>
        <option value="bot">{{ t('analytics.clientType.bot') }}</option>
        <option value="suspicious">{{ t('analytics.clientType.suspicious') }}</option>
        <option value="unknown">{{ t('analytics.clientType.unknown') }}</option>
      </select>
      <button
        class="btn btn-sm btn-primary"
        :disabled="!bulkClientType"
        @click="applyBulkChange"
      >
        {{ t('dataList.apply') }}
      </button>
      <button class="btn btn-sm btn-outline-secondary" @click="clearSelection">{{ t('common.cancel') }}</button>
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
                <th style="width:40px">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    :title="t('analytics.selectAllTooltip')"
                  />
                </th>
                <th style="width:60px" class="text-end th-sortable" @click="toggleSort('id')">
                  ID <SortIcon col="id" :sortKey :sortDir />
                </th>
                <th class="th-sortable" @click="toggleSort('path')">
                  URL <SortIcon col="path" :sortKey :sortDir />
                </th>
                <th style="width:60px" class="th-sortable" @click="toggleSort('method')">
                  Method <SortIcon col="method" :sortKey :sortDir />
                </th>
                <th style="width:70px" class="th-sortable" @click="toggleSort('status_code')">
                  Status <SortIcon col="status_code" :sortKey :sortDir />
                </th>
                <th style="width:130px" class="th-sortable" @click="toggleSort('ip')">
                  IP <SortIcon col="ip" :sortKey :sortDir />
                </th>
                <th class="th-sortable" @click="toggleSort('referer')">
                  Referer <SortIcon col="referer" :sortKey :sortDir />
                </th>
                <th style="width:140px" class="th-sortable" @click="toggleSort('client_type')">
                  {{ t('analytics.colClientType') }} <SortIcon col="client_type" :sortKey :sortDir />
                </th>
                <th class="th-sortable" @click="toggleSort('browser')">
                  Browser <SortIcon col="browser" :sortKey :sortDir />
                </th>
                <th class="th-sortable" @click="toggleSort('user_id')">
                  User <SortIcon col="user_id" :sortKey :sortDir />
                </th>
                <th style="width:90px" class="th-sortable text-end" @click="toggleSort('response_time')">
                  Time <SortIcon col="response_time" :sortKey :sortDir />
                </th>
                <th style="width:140px" class="th-sortable" @click="toggleSort('created_at')">
                  {{ t('analytics.colDate') }} <SortIcon col="created_at" :sortKey :sortDir />
                </th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id" :class="rowClass(row)">
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="selected.includes(row.id)"
                    @change="toggleSelect(row.id)"
                  />
                </td>
                <td class="text-muted text-end">{{ row.id }}</td>
                <td>
                  <div class="text-truncate" style="max-width: 300px" :title="row.path">
                    {{ row.path }}
                  </div>
                </td>
                <td><span :class="methodBadge(row.method)">{{ row.method }}</span></td>
                <td><span :class="statusBadge(row.status_code)">{{ row.status_code }}</span></td>
                <td class="small">
                  <a
                    href="#"
                    class="text-decoration-none"
                    :title="t('analytics.filterByIpTooltip', { ip: row.ip })"
                    @click.prevent="filterByIp(row.ip)"
                  >
                    <i class="bi bi-filter-circle"></i> {{ row.ip }}
                  </a>
                </td>
                <td class="text-muted small">
                  <div class="text-truncate" style="max-width: 200px" :title="row.referer">
                    {{ shortReferer(row.referer) }}
                  </div>
                </td>
                <td>
                  <span
                    :class="clientTypeBadge(row.client_type)"
                    style="cursor: pointer"
                    :title="t('analytics.changeTypeTooltip', { method: row.detection_method || t('analytics.notSpecified') })"
                    @click="changeClientType(row.id, row.client_type)"
                  >
                    {{ smartClientLabel(row) }}
                  </span>
                </td>
                <td class="text-muted small">
                  {{ row.browser || '—' }}
                </td>
                <td class="text-muted small">
                  <span v-if="row.user_id" :title="row.email">#{{ row.user_id }} {{ row.username }}</span>
                  <span v-else>—</span>
                </td>
                <td class="text-end">
                  <span :class="responseTimeClass(row.response_time)">{{ row.response_time }}ms</span>
                </td>
                <td class="text-muted" style="white-space:nowrap">
                  {{ formatDate(row.created_at) }}
                </td>
                <td class="text-center">
                  <button
                    class="btn btn-sm btn-outline-primary"
                    @click="showDetails(row.id)"
                    :title="t('analytics.detailsTooltip')"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="14" class="text-center text-muted py-4">{{ t('common.noData') }}</td>
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
import { authHeaders } from '@/utils/api'
import { useNotify } from '../composables/useNotify'
import { useUrlFilters } from '../composables/useUrlFilters'
import { formatDate } from '../utils/date'
import ListPageWrapper from '../components/ListPageWrapper.vue'
import SortIcon from '../components/SortIcon.vue'
import Pagination from '../components/Pagination.vue'
import AnalyticsDetailsModal from '../components/AnalyticsDetailsModal.vue'
import ChangeClientTypeModal from '../components/ChangeClientTypeModal.vue'

const { t } = useI18n({ useScope: 'global' })
const { notify } = useNotify()

// Page layout для управления отступами при docked модальных окнах
const items = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const perPage = ref(100)
const total = ref(0)
const search = ref('')
const sectionFilter = ref('')
const clientTypeFilter = ref('human') // По умолчанию показываем людей
const deviceFilter = ref('')
const statusFilter = ref('')
const methodFilter = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const ipFilter = ref('')
const sortKey = ref('created_at')
const sortDir = ref('DESC')
const selected = ref([])
const bulkClientType = ref('')
const detailId = ref(null)

// Настройка синхронизации с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    section: sectionFilter,
    client_type: clientTypeFilter,
    device_type: deviceFilter,
    status_code: statusFilter,
    method: methodFilter,
    date_from: filterDateFrom,
    date_to: filterDateTo,
    ip: ipFilter,
    page
  },
  sorting: {
    sortKey,
    sortDir
  },
  detail: {
    id: detailId,
    onOpen: (id) => {
      window.dispatchEvent(new CustomEvent('show-analytics-details', { detail: { id } }))
    }
  }
})

const totalPages = computed(() => Math.ceil(total.value / perPage.value))
const isAllSelected = computed(() => {
  return items.value.length > 0 && items.value.every(row => selected.value.includes(row.id))
})


async function load(p = 1) {
  loading.value = true
  error.value = ''
  page.value = p

  const params = new URLSearchParams({
    page: page.value,
    per_page: perPage.value,
    sort_by: sortKey.value,
    sort_dir: sortDir.value,
  })
  if (search.value) params.set('search', search.value)
  if (sectionFilter.value) params.set('section', sectionFilter.value)
  if (clientTypeFilter.value) params.set('client_type', clientTypeFilter.value)
  if (deviceFilter.value) params.set('device_type', deviceFilter.value)
  if (statusFilter.value) params.set('status_code', statusFilter.value)
  if (methodFilter.value) params.set('method', methodFilter.value)
  if (filterDateFrom.value) params.set('date_from', filterDateFrom.value)
  if (filterDateTo.value) params.set('date_to', filterDateTo.value)
  if (ipFilter.value) params.set('ip', ipFilter.value)

  try {
    const res = await fetch(`/api/admin/analytics/pageviews?${params}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status === 'success') {
      items.value = json.data
      total.value = json.pagination.total
    } else {
      error.value = json.message || t('analytics.loadError')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function toggleSort(col) {
  if (sortKey.value === col) {
    sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortKey.value = col
    sortDir.value = 'DESC'
  }
  load(1)
}

let debounceTimer
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 400)
}

function rowClass(row) {
  if (row.status_code >= 500) return 'table-danger'
  if (row.status_code >= 400) return 'table-warning'
  return ''
}

function methodBadge(method) {
  const map = {
    GET: 'badge bg-primary',
    POST: 'badge bg-success',
    PUT: 'badge bg-warning text-dark',
    DELETE: 'badge bg-danger',
  }
  return map[method] || 'badge bg-secondary'
}

function statusBadge(code) {
  if (code >= 200 && code < 300) return 'badge bg-success'
  if (code >= 300 && code < 400) return 'badge bg-info'
  if (code >= 400 && code < 500) return 'badge bg-warning text-dark'
  if (code >= 500) return 'badge bg-danger'
  return 'badge bg-secondary'
}

function deviceIcon(type) {
  const map = {
    mobile: 'bi-phone',
    tablet: 'bi-tablet',
    desktop: 'bi-display',
  }
  return map[type] || 'bi-question'
}

function responseTimeClass(time) {
  if (!time) return 'text-muted'
  if (time < 100) return 'text-success'
  if (time < 500) return 'text-warning'
  return 'text-danger'
}

function shortReferer(ref) {
  if (!ref) return '—'
  try {
    const url = new URL(ref)
    return url.hostname
  } catch {
    return ref.slice(0, 30)
  }
}


function filterByIp(ip) {
  ipFilter.value = ip
  load(1)
}

function showDetails(id) {
  detailId.value = id
  window.dispatchEvent(new CustomEvent('show-analytics-details', { detail: { id } }))
}

function clientTypeLabel(type) {
  const labels = {
    human: t('analytics.clientType.human'),
    bot: t('analytics.clientType.bot'),
    suspicious: t('analytics.clientType.suspicious'),
    unknown: t('analytics.clientType.unknown'),
  }
  return labels[type] || t('analytics.clientType.unclassified')
}

// Smart label: combines client type + device/bot name
function smartClientLabel(row) {
  // Humans - show device
  if (row.client_type === 'human') {
    if (row.device_type === 'desktop') return t('analytics.smart.humanDesktop')
    if (row.device_type === 'mobile') return t('analytics.smart.humanMobile')
    if (row.device_type === 'tablet') return t('analytics.smart.humanTablet')
    return t('analytics.clientType.human')
  }

  // Bots - show search engine name or category
  if (row.client_type === 'bot') {
    // Search engines
    if (row.bot_category === 'search_engine') {
      if (row.bot_name?.includes('Google')) return t('analytics.smart.google')
      if (row.bot_name?.includes('Yandex')) return t('analytics.smart.yandex')
      if (row.bot_name?.includes('bing')) return t('analytics.smart.bing')
      if (row.bot_name?.includes('DuckDuck')) return t('analytics.smart.duckduckgo')
      if (row.bot_name?.includes('Baidu')) return t('analytics.smart.baidu')
      if (row.bot_name?.includes('facebook')) return t('analytics.smart.facebook')
      return '🔍 ' + (row.bot_name || t('analytics.smart.searchEngineFallback'))
    }

    // SEO tools
    if (row.bot_category === 'seo_tool') {
      return '📊 ' + (row.bot_name || 'SEO')
    }

    // Monitoring
    if (row.bot_category === 'monitoring') {
      return '🔔 ' + (row.bot_name || t('analytics.smart.monitoringFallback'))
    }

    // Bad bots
    if (row.bot_category === 'scraper') {
      return t('analytics.smart.scraper')
    }

    if (row.bot_category === 'malicious') {
      return '🚫 ' + (row.bot_name || 'Malicious')
    }

    return t('analytics.clientType.bot')
  }

  // Suspicious
  if (row.client_type === 'suspicious') {
    return t('analytics.clientType.suspicious')
  }

  // Unknown
  if (row.client_type === 'unknown') {
    return t('analytics.clientType.unknown')
  }

  return t('analytics.clientType.unclassified')
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

function changeClientType(id, currentType) {
  window.dispatchEvent(
    new CustomEvent('open-change-client-type', {
      detail: { id, currentType }
    })
  )
}

function toggleSelect(id) {
  const idx = selected.value.indexOf(id)
  if (idx > -1) {
    selected.value.splice(idx, 1)
  } else {
    selected.value.push(id)
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selected.value = []
  } else {
    selected.value = items.value.map(row => row.id)
  }
}

function clearSelection() {
  selected.value = []
  bulkClientType.value = ''
}

async function applyBulkChange() {
  if (!bulkClientType.value || selected.value.length === 0) return

  if (!confirm(t('analytics.bulk.confirm', { count: selected.value.length, label: clientTypeLabel(bulkClientType.value) }))) return

  try {
    const res = await fetch('/api/admin/analytics/bulk-update-client-type', {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: selected.value,
        client_type: bulkClientType.value
      })
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    if (json.status === 'success') {
      clearSelection()
      load(page.value)
    } else {
      notify(`${t('common.error')}: ` + (json.message || t('analytics.unknownError')), { type: 'error' })
    }
  } catch (e) {
    notify(`${t('common.error')}: ` + e.message, { type: 'error' })
  }
}

async function showMyIp() {
  try {
    const res = await fetch('/api/admin/network-tools/my-ip', { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status === 'success' && json.data?.ip) {
      const ip = json.data.ip
      const ipParts = ip.split('.')
      const subnet = ipParts.slice(0, 3).join('.') + '.*'
      const message = t('analytics.myIpMessage', { ip, subnet })
      if (confirm(message + '\n\n' + t('analytics.myIpConfirmCopy'))) {
        ipFilter.value = ip
        load(1)
      }
    } else {
      notify(`${t('analytics.myIpFailed')}: ` + (json.message || t('analytics.unknownError')), { type: 'error' })
    }
  } catch (e) {
    notify(`${t('common.error')}: ` + e.message, { type: 'error' })
  }
}

onMounted(() => {
  // Инициализируем фильтры из URL перед первой загрузкой
  initFromUrl()
  load(page.value)

  // Listen for details modal closed
  window.addEventListener('analytics-details-closed', () => {
    detailId.value = null
  })

  // Listen for IP filter event from modal
  window.addEventListener('filter-analytics-by-ip', (e) => {
    if (e.detail?.ip) {
      filterByIp(e.detail.ip)
    }
  })

  // Listen for client type selection
  window.addEventListener('client-type-selected', async (e) => {
    if (!e.detail?.id || !e.detail?.newType) return

    try {
      const res = await fetch(`/api/admin/analytics/pageview/${e.detail.id}/client-type`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_type: e.detail.newType })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()

      if (json.status === 'success') {
        load(page.value)
      } else {
        notify(`${t('common.error')}: ` + (json.message || t('analytics.unknownError')), { type: 'error' })
      }
    } catch (err) {
      notify(`${t('common.error')}: ` + err.message, { type: 'error' })
    }
  })
})
</script>

<style scoped>
/* Page content wrapper with scroll */
.th-sortable {
  cursor: pointer;
  user-select: none;
}
.th-sortable:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
