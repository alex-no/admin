<template>
  <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
  <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
  <div v-else-if="data">
    <div v-show="activeTab === 'info'">
      <div class="row g-3">
        <div class="col-md-6">
          <h6 class="text-muted mb-2">{{ t('analytics.request') }}</h6>
          <table class="table table-sm table-bordered">
            <tr><th style="width:140px">ID:</th><td>{{ data.id }}</td></tr>
            <tr><th>{{ t('analytics.dateTime') }}</th><td>{{ formatDateTime(data.created_at) }}</td></tr>
            <tr><th>{{ t('analytics.urlLabel') }}</th><td class="text-break"><code class="small">{{ data.url }}</code></td></tr>
            <tr><th>{{ t('analytics.pathLabel') }}</th><td><code class="small">{{ data.path }}</code></td></tr>
            <tr><th>{{ t('analytics.methodLabel') }}</th><td><span :class="methodBadge(data.method)">{{ data.method }}</span></td></tr>
            <tr><th>{{ t('analytics.statusLabel') }}</th><td><span :class="statusBadge(data.status_code)">{{ data.status_code }}</span></td></tr>
            <tr><th>{{ t('analytics.responseTimeLabel') }}</th><td><span :class="responseTimeClass(data.response_time)">{{ data.response_time }} ms</span></td></tr>
            <tr><th>{{ t('analytics.refererLabel') }}</th><td class="text-break small">{{ data.referer || '—' }}</td></tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">{{ t('analytics.client') }}</h6>
          <table class="table table-sm table-bordered">
            <tr>
              <th style="width:140px">{{ t('analytics.clientTypeLabel') }}</th>
              <td>
                <span :class="clientTypeBadge(data.client_type)">{{ clientTypeLabel(data.client_type) }}</span>
                <span v-if="data.detection_method" class="text-muted small ms-2">({{ data.detection_method }})</span>
              </td>
            </tr>
            <tr>
              <th>{{ t('analytics.deviceLabel') }}</th>
              <td>
                <span v-if="data.is_bot" class="badge bg-secondary"><i class="bi bi-robot"></i> Bot: {{ data.bot_name }}</span>
                <span v-else class="badge bg-info"><i :class="deviceIcon(data.device_type)"></i> {{ data.device_type }}</span>
              </td>
            </tr>
            <tr v-if="!data.is_bot"><th>{{ t('analytics.browserLabel') }}</th><td>{{ data.browser || '—' }}</td></tr>
            <tr v-if="!data.is_bot"><th>{{ t('analytics.osLabel') }}</th><td>{{ data.os || '—' }}</td></tr>
            <tr><th>{{ t('analytics.userAgentLabel') }}</th><td class="text-break small"><code class="small">{{ data.user_agent || '—' }}</code></td></tr>
          </table>
          <h6 class="text-muted mb-2 mt-3">{{ t('analytics.user') }}</h6>
          <table class="table table-sm table-bordered">
            <tr><th style="width:140px">{{ t('analytics.userIdLabel') }}</th><td>{{ data.user_id || t('analytics.guest') }}</td></tr>
            <tr v-if="data.username"><th>{{ t('analytics.usernameLabel') }}</th><td>{{ data.username }}</td></tr>
            <tr v-if="data.email"><th>{{ t('analytics.emailLabel') }}</th><td>{{ data.email }}</td></tr>
            <tr><th>{{ t('analytics.sessionIdLabel') }}</th><td><code class="small">{{ data.session_id || '—' }}</code></td></tr>
          </table>
        </div>
      </div>
    </div>
    <div v-show="activeTab === 'network'">
      <div class="row g-3">
        <div class="col-md-6">
          <h6 class="text-muted mb-2">{{ t('analytics.ipAddress') }}</h6>
          <table class="table table-sm table-bordered">
            <tr>
              <th style="width:140px">{{ t('analytics.ipLabel') }}</th>
              <td>
                <strong>{{ data.ip }}</strong>
                <button class="btn btn-sm btn-outline-secondary ms-2" @click="$emit('filter-by-ip')">
                  <i class="bi bi-filter-circle"></i> {{ t('analytics.filterButton') }}
                </button>
              </td>
            </tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">{{ t('analytics.geolocation') }} <span v-if="loadingIpInfo" class="spinner-border spinner-border-sm ms-2"></span></h6>
          <div v-if="ipInfo?.error" class="alert alert-info py-2 small">
            <i class="bi bi-info-circle me-1"></i>{{ ipInfo.message }}
          </div>
          <table v-else-if="ipInfo && !ipInfo.error" class="table table-sm table-bordered">
            <tr v-if="ipInfo.country"><th style="width:140px">{{ t('analytics.country') }}</th><td>{{ ipInfo.country }} ({{ ipInfo.countryCode }})</td></tr>
            <tr v-if="ipInfo.regionName"><th>{{ t('analytics.region') }}</th><td>{{ ipInfo.regionName }}</td></tr>
            <tr v-if="ipInfo.city"><th>{{ t('analytics.city') }}</th><td>{{ ipInfo.city }}</td></tr>
            <tr v-if="ipInfo.zip"><th>{{ t('analytics.zip') }}</th><td>{{ ipInfo.zip }}</td></tr>
            <tr v-if="ipInfo.isp"><th>{{ t('analytics.isp') }}</th><td>{{ ipInfo.isp }}</td></tr>
            <tr v-if="ipInfo.org"><th>{{ t('analytics.org') }}</th><td>{{ ipInfo.org }}</td></tr>
            <tr v-if="ipInfo.as"><th>{{ t('analytics.asn') }}</th><td><code class="small">{{ ipInfo.as }}</code></td></tr>
            <tr v-if="ipInfo.asname"><th>{{ t('analytics.asName') }}</th><td>{{ ipInfo.asname }}</td></tr>
            <tr v-if="ipInfo.reverse"><th>{{ t('analytics.reverseDnsLabel') }}</th><td><code class="small">{{ ipInfo.reverse }}</code></td></tr>
            <tr v-if="ipInfo.timezone"><th>{{ t('analytics.timezone') }}</th><td>{{ ipInfo.timezone }} (UTC{{ ipInfo.offset ? formatOffset(ipInfo.offset) : '' }})</td></tr>
            <tr>
              <th>{{ t('analytics.ipType') }}</th>
              <td>
                <span v-if="ipInfo.hosting" class="badge bg-warning text-dark" :title="t('analytics.hostingTooltip')"><i class="bi bi-server"></i> {{ t('analytics.hostingBadge') }}</span>
                <span v-if="ipInfo.proxy" class="badge bg-danger" :title="t('analytics.proxyTooltip')"><i class="bi bi-shield-exclamation"></i> {{ t('analytics.proxyBadge') }}</span>
                <span v-if="ipInfo.mobile" class="badge bg-info" :title="t('analytics.mobileTooltip')"><i class="bi bi-phone"></i> {{ t('analytics.mobileBadge') }}</span>
                <span v-if="!ipInfo.hosting && !ipInfo.proxy && !ipInfo.mobile" class="badge bg-success"><i class="bi bi-house"></i> {{ t('analytics.residentialBadge') }}</span>
              </td>
            </tr>
          </table>
          <div v-else-if="!loadingIpInfo" class="text-muted small">{{ t('common.noData') }}</div>
        </div>
      </div>
    </div>
    <div v-show="activeTab === 'tools'">
      <div v-if="ipInfo?.error" class="alert alert-warning py-2 small mb-3">
        <i class="bi bi-exclamation-triangle me-1"></i>
        {{ t('analytics.toolsUnavailablePrivate') }}
      </div>
      <div class="alert alert-info py-2 small mb-3">
        <i class="bi bi-info-circle me-1"></i>
        {{ t('analytics.httpHeadersHint') }}
      </div>
      <div class="mb-3">
        <div class="btn-group mb-2">
          <button class="btn btn-sm btn-primary" @click="$emit('run-ping')" :disabled="loadingPing || ipInfo?.error">
            <i class="bi bi-reception-4"></i> {{ t('analytics.ping') }}
            <span v-if="loadingPing" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
          <button class="btn btn-sm btn-primary" @click="$emit('run-traceroute')" :disabled="loadingTraceroute || ipInfo?.error">
            <i class="bi bi-diagram-3"></i> {{ t('analytics.traceroute') }}
            <span v-if="loadingTraceroute" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
          <button class="btn btn-sm btn-primary" @click="$emit('run-reverse-dns')" :disabled="loadingReverseDns || ipInfo?.error">
            <i class="bi bi-arrow-left-right"></i> {{ t('analytics.reverseDnsButton') }}
            <span v-if="loadingReverseDns" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-warning" @click="$emit('run-blacklist')" :disabled="loadingBlacklist || ipInfo?.error">
            <i class="bi bi-shield-exclamation"></i> {{ t('analytics.blacklistCheck') }}
            <span v-if="loadingBlacklist" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
          <button class="btn btn-sm btn-info" @click="$emit('run-http-headers')" :disabled="loadingHttpHeaders || ipInfo?.error" :title="t('analytics.httpHeadersOnly')">
            <i class="bi bi-file-earmark-code"></i> {{ t('analytics.httpHeaders') }}
            <span v-if="loadingHttpHeaders" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-danger" @click="showBanModal = true" :disabled="ipInfo?.error">
            <i class="bi bi-slash-circle"></i> {{ t('analytics.banIp') }}
          </button>
        </div>
      </div>

      <div v-if="pingResult" class="mb-3">
        <h6 class="text-muted">{{ t('analytics.pingResultLabel') }}</h6>
        <pre class="bg-dark text-light p-3 rounded small" style="max-height:300px;overflow-y:auto">{{ pingResult }}</pre>
      </div>

      <div v-if="tracerouteResult" class="mb-3">
        <h6 class="text-muted">{{ t('analytics.tracerouteResultLabel') }}</h6>
        <pre class="bg-dark text-light p-3 rounded small" style="max-height:300px;overflow-y:auto">{{ tracerouteResult }}</pre>
      </div>

      <div v-if="reverseDnsResult" class="mb-3">
        <h6 class="text-muted">{{ t('analytics.reverseDnsResultLabel') }}</h6>
        <div class="alert alert-info">
          <strong>IP:</strong> {{ reverseDnsResult.ip }}<br>
          <strong>{{ t('analytics.hostname') }}</strong> {{ reverseDnsResult.hostname || t('analytics.noPtrRecord') }}
        </div>
      </div>

      <div v-if="blacklistResult" class="mb-3">
        <h6 class="text-muted">{{ t('analytics.blacklistResultLabel') }}</h6>
        <div :class="blacklistResult.is_clean ? 'alert alert-success' : 'alert alert-danger'">
          <strong>{{ t('analytics.status') }}</strong> {{ blacklistResult.is_clean ? t('analytics.cleanIp') : t('analytics.listedIp') }}<br>
          <strong>{{ t('analytics.checked', { count: blacklistResult.total_checks }) }}</strong><br>
          <strong>{{ t('analytics.listedIn', { count: blacklistResult.listed_count }) }}</strong>
        </div>
        <div v-if="!blacklistResult.is_clean" class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead>
              <tr>
                <th>{{ t('analytics.rblService') }}</th>
                <th>{{ t('analytics.status') }}</th>
                <th>{{ t('analytics.response') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rbl in blacklistResult.results.filter(r => r.listed)" :key="rbl.server">
                <td>{{ rbl.name }}</td>
                <td><span class="badge bg-danger">{{ t('analytics.listed') }}</span></td>
                <td><code class="small">{{ rbl.response }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="httpHeadersResult" class="mb-3">
        <h6 class="text-muted">{{ t('analytics.httpHeadersResultLabel') }}</h6>
        <div v-if="httpHeadersResult.error" class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>{{ t('analytics.httpHeadersError') }}</strong> {{ httpHeadersResult.message }}
        </div>
        <template v-else>
          <div class="alert alert-info mb-2">
            <strong>URL:</strong> {{ httpHeadersResult.url }}<br>
            <strong>{{ t('analytics.protocol') }}</strong> {{ httpHeadersResult.protocol.toUpperCase() }}
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead>
                <tr>
                  <th style="width:30%">Header</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(value, key) in httpHeadersResult.notable_headers" :key="key">
                  <td><code class="small">{{ key }}</code></td>
                  <td class="small text-break">{{ value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <details>
            <summary class="text-muted small" style="cursor:pointer">{{ t('analytics.showAllHeaders', { count: Object.keys(httpHeadersResult.all_headers).length }) }}</summary>
            <div class="mt-2">
              <table class="table table-sm table-bordered">
                <tbody>
                  <tr v-for="(value, key) in httpHeadersResult.all_headers" :key="key">
                    <td style="width:30%"><code class="small">{{ key }}</code></td>
                    <td class="small text-break">{{ value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </template>
      </div>

      <div v-if="!pingResult && !tracerouteResult && !reverseDnsResult && !blacklistResult && !httpHeadersResult" class="text-muted text-center py-4">
        {{ t('analytics.chooseTool') }}
      </div>
    </div>

    <!-- Ban IP Modal -->
    <div v-if="showBanModal" class="modal-backdrop-simple" @click.self="showBanModal = false">
      <div class="card shadow-lg" style="max-width:500px;margin:50px auto">
        <div class="card-header bg-danger text-white">
          <h6 class="mb-0"><i class="bi bi-slash-circle"></i> {{ t('analytics.banModalTitle', { ip: data.ip }) }}</h6>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label form-label-sm">{{ t('analytics.banDuration') }}</label>
            <select v-model="banDuration" class="form-select form-select-sm">
              <option value="1h">{{ t('analytics.duration1h') }}</option>
              <option value="24h">{{ t('analytics.duration24h') }}</option>
              <option value="15d">{{ t('analytics.duration15d') }}</option>
              <option value="30d">{{ t('analytics.duration30d') }}</option>
              <option value="180d">{{ t('analytics.duration180d') }}</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label form-label-sm">{{ t('analytics.banReason') }}</label>
            <input
              v-model="banReason"
              type="text"
              class="form-control form-control-sm"
              :placeholder="t('analytics.banReasonPlaceholder')"
            />
          </div>
          <div class="mb-3">
            <div class="form-check">
              <input
                v-model="deleteAnalytics"
                type="checkbox"
                class="form-check-input"
                id="deleteAnalyticsCheck"
              />
              <label class="form-check-label small" for="deleteAnalyticsCheck">
                <i class="bi bi-trash text-danger"></i> {{ t('analytics.deleteAnalytics') }}
                <div class="text-muted" style="font-size:0.85em">
                  {{ t('analytics.deleteAnalyticsHint') }}
                </div>
              </label>
            </div>
          </div>
          <div v-if="banError" class="alert alert-danger py-2 small mb-3">
            {{ banError }}
          </div>
          <div v-if="banSuccess" class="alert alert-success py-2 small mb-3">
            <i class="bi bi-check-circle me-1"></i> {{ t('analytics.banSuccess') }}
            <span v-if="deletedCount > 0"><br>{{ t('analytics.deletedRecords', { count: deletedCount }) }}</span>
          </div>
        </div>
        <div class="card-footer d-flex gap-2 justify-content-end">
          <button class="btn btn-sm btn-secondary" @click="showBanModal = false">{{ t('common.cancel') }}</button>
          <button
            class="btn btn-sm btn-danger"
            @click="banIp"
            :disabled="loadingBan || !banReason.trim()"
          >
            <span v-if="loadingBan" class="spinner-border spinner-border-sm me-1"></span>
            {{ t('analytics.banButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiPost } from '../utils/api'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  loading: Boolean,
  error: String,
  data: Object,
  activeTab: String,
  ipInfo: Object,
  loadingIpInfo: Boolean,
  pingResult: String,
  loadingPing: Boolean,
  tracerouteResult: String,
  loadingTraceroute: Boolean,
  reverseDnsResult: Object,
  loadingReverseDns: Boolean,
  blacklistResult: Object,
  loadingBlacklist: Boolean,
  httpHeadersResult: Object,
  loadingHttpHeaders: Boolean,
})

defineEmits([
  'run-ping',
  'run-traceroute',
  'run-reverse-dns',
  'run-blacklist',
  'run-http-headers',
  'filter-by-ip',
])

// Ban IP modal
const showBanModal = ref(false)
const banDuration = ref('24h')
const banReason = ref('')
const deleteAnalytics = ref(true) // Default: delete analytics records
const loadingBan = ref(false)
const banError = ref('')
const banSuccess = ref(false)
const deletedCount = ref(0)

async function banIp() {
  if (!banReason.value.trim()) {
    banError.value = t('analytics.banReasonRequired')
    return
  }

  loadingBan.value = true
  banError.value = ''
  banSuccess.value = false
  deletedCount.value = 0

  try {
    const res = await apiPost('/admin/analytics/ban-ip', {
      ip: props.data.ip,
      duration: banDuration.value,
      reason: banReason.value.trim(),
      delete_analytics: deleteAnalytics.value,
    })

    if (res.status === 'success') {
      banSuccess.value = true
      deletedCount.value = res.data?.deleted_count || 0
      setTimeout(() => {
        showBanModal.value = false
        banReason.value = ''
        banSuccess.value = false
        deleteAnalytics.value = true
        deletedCount.value = 0
      }, 2000)
    } else {
      banError.value = res.message || t('analytics.banError')
    }
  } catch (err) {
    banError.value = err.message || t('analytics.networkError')
  } finally {
    loadingBan.value = false
  }
}

function formatDateTime(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
}

function methodBadge(m) {
  return { GET: 'badge bg-primary', POST: 'badge bg-success', PUT: 'badge bg-warning text-dark', DELETE: 'badge bg-danger' }[m] || 'badge bg-secondary'
}

function statusBadge(c) {
  if (c >= 200 && c < 300) return 'badge bg-success'
  if (c >= 300 && c < 400) return 'badge bg-info'
  if (c >= 400 && c < 500) return 'badge bg-warning text-dark'
  if (c >= 500) return 'badge bg-danger'
  return 'badge bg-secondary'
}

function deviceIcon(type) {
  return { mobile: 'bi-phone', tablet: 'bi-tablet', desktop: 'bi-display' }[type] || 'bi-question'
}

function responseTimeClass(time) {
  if (!time) return 'text-muted'
  if (time < 100) return 'text-success'
  if (time < 500) return 'text-warning'
  return 'text-danger'
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

function clientTypeBadge(type) {
  const badges = {
    human: 'badge bg-success',
    bot: 'badge bg-secondary',
    suspicious: 'badge bg-warning text-dark',
    unknown: 'badge bg-info',
  }
  return badges[type] || 'badge bg-light text-dark'
}

function formatOffset(seconds) {
  if (!seconds) return ''
  const hours = Math.floor(Math.abs(seconds) / 3600)
  const minutes = Math.floor((Math.abs(seconds) % 3600) / 60)
  const sign = seconds >= 0 ? '+' : '-'
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
</script>
