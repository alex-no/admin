<template>
  <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
  <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
  <div v-else-if="data">
    <div v-show="activeTab === 'info'">
      <div class="row g-3">
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Запит</h6>
          <table class="table table-sm table-bordered">
            <tr><th style="width:140px">ID:</th><td>{{ data.id }}</td></tr>
            <tr><th>Дата/час:</th><td>{{ formatDateTime(data.created_at) }}</td></tr>
            <tr><th>URL:</th><td class="text-break"><code class="small">{{ data.url }}</code></td></tr>
            <tr><th>Path:</th><td><code class="small">{{ data.path }}</code></td></tr>
            <tr><th>Method:</th><td><span :class="methodBadge(data.method)">{{ data.method }}</span></td></tr>
            <tr><th>Status:</th><td><span :class="statusBadge(data.status_code)">{{ data.status_code }}</span></td></tr>
            <tr><th>Response Time:</th><td><span :class="responseTimeClass(data.response_time)">{{ data.response_time }} ms</span></td></tr>
            <tr><th>Referer:</th><td class="text-break small">{{ data.referer || '—' }}</td></tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Клієнт</h6>
          <table class="table table-sm table-bordered">
            <tr>
              <th style="width:140px">Тип клієнта:</th>
              <td>
                <span :class="clientTypeBadge(data.client_type)">{{ clientTypeLabel(data.client_type) }}</span>
                <span v-if="data.detection_method" class="text-muted small ms-2">({{ data.detection_method }})</span>
              </td>
            </tr>
            <tr>
              <th>Пристрій:</th>
              <td>
                <span v-if="data.is_bot" class="badge bg-secondary"><i class="bi bi-robot"></i> Bot: {{ data.bot_name }}</span>
                <span v-else class="badge bg-info"><i :class="deviceIcon(data.device_type)"></i> {{ data.device_type }}</span>
              </td>
            </tr>
            <tr v-if="!data.is_bot"><th>Browser:</th><td>{{ data.browser || '—' }}</td></tr>
            <tr v-if="!data.is_bot"><th>OS:</th><td>{{ data.os || '—' }}</td></tr>
            <tr><th>User Agent:</th><td class="text-break small"><code class="small">{{ data.user_agent || '—' }}</code></td></tr>
          </table>
          <h6 class="text-muted mb-2 mt-3">Користувач</h6>
          <table class="table table-sm table-bordered">
            <tr><th style="width:140px">User ID:</th><td>{{ data.user_id || 'Гість' }}</td></tr>
            <tr v-if="data.username"><th>Username:</th><td>{{ data.username }}</td></tr>
            <tr v-if="data.email"><th>Email:</th><td>{{ data.email }}</td></tr>
            <tr><th>Session ID:</th><td><code class="small">{{ data.session_id || '—' }}</code></td></tr>
          </table>
        </div>
      </div>
    </div>
    <div v-show="activeTab === 'network'">
      <div class="row g-3">
        <div class="col-md-6">
          <h6 class="text-muted mb-2">IP адреса</h6>
          <table class="table table-sm table-bordered">
            <tr>
              <th style="width:140px">IP:</th>
              <td>
                <strong>{{ data.ip }}</strong>
                <button class="btn btn-sm btn-outline-secondary ms-2" @click="$emit('filter-by-ip')">
                  <i class="bi bi-filter-circle"></i> Фільтрувати
                </button>
              </td>
            </tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted mb-2">Геолокація <span v-if="loadingIpInfo" class="spinner-border spinner-border-sm ms-2"></span></h6>
          <div v-if="ipInfo?.error" class="alert alert-info py-2 small">
            <i class="bi bi-info-circle me-1"></i>{{ ipInfo.message }}
          </div>
          <table v-else-if="ipInfo && !ipInfo.error" class="table table-sm table-bordered">
            <tr v-if="ipInfo.country"><th style="width:140px">Країна:</th><td>{{ ipInfo.country }} ({{ ipInfo.countryCode }})</td></tr>
            <tr v-if="ipInfo.regionName"><th>Регіон:</th><td>{{ ipInfo.regionName }}</td></tr>
            <tr v-if="ipInfo.city"><th>Місто:</th><td>{{ ipInfo.city }}</td></tr>
            <tr v-if="ipInfo.zip"><th>ZIP:</th><td>{{ ipInfo.zip }}</td></tr>
            <tr v-if="ipInfo.isp"><th>ISP:</th><td>{{ ipInfo.isp }}</td></tr>
            <tr v-if="ipInfo.org"><th>Організація:</th><td>{{ ipInfo.org }}</td></tr>
            <tr v-if="ipInfo.as"><th>ASN:</th><td><code class="small">{{ ipInfo.as }}</code></td></tr>
            <tr v-if="ipInfo.asname"><th>AS Name:</th><td>{{ ipInfo.asname }}</td></tr>
            <tr v-if="ipInfo.reverse"><th>Reverse DNS:</th><td><code class="small">{{ ipInfo.reverse }}</code></td></tr>
            <tr v-if="ipInfo.timezone"><th>Timezone:</th><td>{{ ipInfo.timezone }} (UTC{{ ipInfo.offset ? formatOffset(ipInfo.offset) : '' }})</td></tr>
            <tr>
              <th>Тип IP:</th>
              <td>
                <span v-if="ipInfo.hosting" class="badge bg-warning text-dark" title="Hosting/Datacenter IP"><i class="bi bi-server"></i> Hosting</span>
                <span v-if="ipInfo.proxy" class="badge bg-danger" title="Proxy/VPN detected"><i class="bi bi-shield-exclamation"></i> Proxy</span>
                <span v-if="ipInfo.mobile" class="badge bg-info" title="Mobile network"><i class="bi bi-phone"></i> Mobile</span>
                <span v-if="!ipInfo.hosting && !ipInfo.proxy && !ipInfo.mobile" class="badge bg-success"><i class="bi bi-house"></i> Residential</span>
              </td>
            </tr>
          </table>
          <div v-else-if="!loadingIpInfo" class="text-muted small">Немає даних</div>
        </div>
      </div>
    </div>
    <div v-show="activeTab === 'tools'">
      <div v-if="ipInfo?.error" class="alert alert-warning py-2 small mb-3">
        <i class="bi bi-exclamation-triangle me-1"></i>
        Мережні інструменти недоступні для приватних IP адрес
      </div>
      <div class="alert alert-info py-2 small mb-3">
        <i class="bi bi-info-circle me-1"></i>
        <strong>HTTP Headers:</strong> працює тільки для IP-адрес веб-серверів. Для звичайних клієнтів (боти, браузери) буде помилка "Unable to connect".
      </div>
      <div class="mb-3">
        <div class="btn-group mb-2">
          <button class="btn btn-sm btn-primary" @click="$emit('run-ping')" :disabled="loadingPing || ipInfo?.error">
            <i class="bi bi-reception-4"></i> Ping
            <span v-if="loadingPing" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
          <button class="btn btn-sm btn-primary" @click="$emit('run-traceroute')" :disabled="loadingTraceroute || ipInfo?.error">
            <i class="bi bi-diagram-3"></i> Traceroute
            <span v-if="loadingTraceroute" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
          <button class="btn btn-sm btn-primary" @click="$emit('run-reverse-dns')" :disabled="loadingReverseDns || ipInfo?.error">
            <i class="bi bi-arrow-left-right"></i> Reverse DNS
            <span v-if="loadingReverseDns" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-warning" @click="$emit('run-blacklist')" :disabled="loadingBlacklist || ipInfo?.error">
            <i class="bi bi-shield-exclamation"></i> Blacklist Check
            <span v-if="loadingBlacklist" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
          <button class="btn btn-sm btn-info" @click="$emit('run-http-headers')" :disabled="loadingHttpHeaders || ipInfo?.error" title="Працює тільки для веб-серверів">
            <i class="bi bi-file-earmark-code"></i> HTTP Headers
            <span v-if="loadingHttpHeaders" class="spinner-border spinner-border-sm ms-1"></span>
          </button>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-danger" @click="showBanModal = true" :disabled="ipInfo?.error">
            <i class="bi bi-slash-circle"></i> Забанити IP
          </button>
        </div>
      </div>

      <div v-if="pingResult" class="mb-3">
        <h6 class="text-muted">Ping:</h6>
        <pre class="bg-dark text-light p-3 rounded small" style="max-height:300px;overflow-y:auto">{{ pingResult }}</pre>
      </div>

      <div v-if="tracerouteResult" class="mb-3">
        <h6 class="text-muted">Traceroute:</h6>
        <pre class="bg-dark text-light p-3 rounded small" style="max-height:300px;overflow-y:auto">{{ tracerouteResult }}</pre>
      </div>

      <div v-if="reverseDnsResult" class="mb-3">
        <h6 class="text-muted">Reverse DNS:</h6>
        <div class="alert alert-info">
          <strong>IP:</strong> {{ reverseDnsResult.ip }}<br>
          <strong>Hostname:</strong> {{ reverseDnsResult.hostname || 'Немає PTR запису' }}
        </div>
      </div>

      <div v-if="blacklistResult" class="mb-3">
        <h6 class="text-muted">Blacklist Check:</h6>
        <div :class="blacklistResult.is_clean ? 'alert alert-success' : 'alert alert-danger'">
          <strong>Статус:</strong> {{ blacklistResult.is_clean ? '✅ Чистий IP' : '⚠️ Знайдено в чорних списках' }}<br>
          <strong>Перевірено:</strong> {{ blacklistResult.total_checks }} RBL<br>
          <strong>Знайдено в:</strong> {{ blacklistResult.listed_count }} списках
        </div>
        <div v-if="!blacklistResult.is_clean" class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead>
              <tr>
                <th>RBL сервіс</th>
                <th>Статус</th>
                <th>Відповідь</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rbl in blacklistResult.results.filter(r => r.listed)" :key="rbl.server">
                <td>{{ rbl.name }}</td>
                <td><span class="badge bg-danger">Listed</span></td>
                <td><code class="small">{{ rbl.response }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="httpHeadersResult" class="mb-3">
        <h6 class="text-muted">HTTP Headers:</h6>
        <div v-if="httpHeadersResult.error" class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Помилка:</strong> {{ httpHeadersResult.message }}
        </div>
        <template v-else>
          <div class="alert alert-info mb-2">
            <strong>URL:</strong> {{ httpHeadersResult.url }}<br>
            <strong>Протокол:</strong> {{ httpHeadersResult.protocol.toUpperCase() }}
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
            <summary class="text-muted small" style="cursor:pointer">Показати всі headers ({{ Object.keys(httpHeadersResult.all_headers).length }})</summary>
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
        Виберіть інструмент
      </div>
    </div>

    <!-- Ban IP Modal -->
    <div v-if="showBanModal" class="modal-backdrop-simple" @click.self="showBanModal = false">
      <div class="card shadow-lg" style="max-width:500px;margin:50px auto">
        <div class="card-header bg-danger text-white">
          <h6 class="mb-0"><i class="bi bi-slash-circle"></i> Забанити IP {{ data.ip }}</h6>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label form-label-sm">Період бану:</label>
            <select v-model="banDuration" class="form-select form-select-sm">
              <option value="1h">1 година</option>
              <option value="24h">24 години</option>
              <option value="15d">15 днів</option>
              <option value="30d">30 днів</option>
              <option value="180d">6 місяців</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label form-label-sm">Причина:</label>
            <input
              v-model="banReason"
              type="text"
              class="form-control form-control-sm"
              placeholder="Наприклад: Malicious bot, DDoS attack..."
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
                <i class="bi bi-trash text-danger"></i> Видалити всі записи цього IP з аналітики
                <div class="text-muted" style="font-size:0.85em">
                  (щоб не псувати статистику)
                </div>
              </label>
            </div>
          </div>
          <div v-if="banError" class="alert alert-danger py-2 small mb-3">
            {{ banError }}
          </div>
          <div v-if="banSuccess" class="alert alert-success py-2 small mb-3">
            <i class="bi bi-check-circle me-1"></i> IP успішно забанено!
            <span v-if="deletedCount > 0"><br>Видалено записів: {{ deletedCount }}</span>
          </div>
        </div>
        <div class="card-footer d-flex gap-2 justify-content-end">
          <button class="btn btn-sm btn-secondary" @click="showBanModal = false">Скасувати</button>
          <button
            class="btn btn-sm btn-danger"
            @click="banIp"
            :disabled="loadingBan || !banReason.trim()"
          >
            <span v-if="loadingBan" class="spinner-border spinner-border-sm me-1"></span>
            Забанити
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { apiPost } from '../utils/api'

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
    banError.value = 'Вкажіть причину бану'
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
      banError.value = res.message || 'Помилка при бані IP'
    }
  } catch (err) {
    banError.value = err.message || 'Помилка мережі'
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
    human: '👤 Людина',
    bot: '🤖 Бот',
    suspicious: '⚠️ Підозрілий',
    unknown: '❓ Невідомий',
  }
  return labels[type] || '⏳ Не класифіковано'
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
