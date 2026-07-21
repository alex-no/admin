<template>
  <ListPageWrapper>
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">🚫 Заблоковані IP-адреси</h5>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading">
            <i class="bi bi-arrow-clockwise"></i> Оновити
          </button>
          <router-link to="/analytics" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-arrow-left"></i> Назад до аналітики
          </router-link>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <div v-if="items.length === 0" class="alert alert-info">
          <i class="bi bi-info-circle"></i> Наразі немає заблокованих IP-адрес
        </div>

        <div v-else class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 small">
              <thead class="table-light">
                <tr>
                  <th style="width:60px" class="text-end">ID</th>
                  <th style="width:130px">IP адреса</th>
                  <th>Причина</th>
                  <th style="width:100px" class="text-center">Тип</th>
                  <th style="width:100px" class="text-center">Тривалість</th>
                  <th style="width:140px">Заблоковано</th>
                  <th style="width:140px">Діє до</th>
                  <th style="width:100px" class="text-center">Залишилось</th>
                  <th style="width:60px" class="text-center">Кількість</th>
                  <th style="width:100px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <td class="text-muted text-end">{{ row.id }}</td>
                  <td class="font-monospace">
                    <a
                      href="#"
                      class="text-decoration-none"
                      :title="`Переглянути аналітику для ${row.ip}`"
                      @click.prevent="viewAnalytics(row.ip)"
                    >
                      <i class="bi bi-bar-chart"></i> {{ row.ip }}
                    </a>
                  </td>
                  <td>
                    <div class="text-truncate" style="max-width: 250px" :title="row.reason">
                      {{ row.reason }}
                    </div>
                  </td>
                  <td class="text-center">
                    <span :class="banTypeBadge(row.is_manual)">
                      {{ row.is_manual ? 'Ручний' : 'Авто' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-secondary">{{ formatDuration(row.duration) }}</span>
                  </td>
                  <td class="text-muted small" style="white-space:nowrap">
                    {{ formatDate(row.banned_at) }}
                  </td>
                  <td class="text-muted small" style="white-space:nowrap">
                    {{ formatDate(row.expires_at) }}
                  </td>
                  <td class="text-center">
                    <span :class="timeLeftClass(row.expires_at)">{{ formatTimeLeft(row.expires_at) }}</span>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-warning text-dark" :title="`Заблоковано ${row.ban_count} раз(ів)`">
                      {{ row.ban_count }}
                    </span>
                  </td>
                  <td class="text-center">
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="confirmUnban(row.ip)"
                      title="Розблокувати IP"
                    >
                      <i class="bi bi-unlock"></i> Розблокувати
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="items.length > 0" class="mt-3">
          <span class="text-muted small">Всього заблоковано: {{ items.length }}</span>
        </div>
      </div>
    </div>
  </ListPageWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ListPageWrapper from '../components/ListPageWrapper.vue'
import { formatDate } from '../utils/date'

const router = useRouter()

const items = ref([])
const loading = ref(false)
const error = ref('')

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/admin/analytics/banned-ips', { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.status === 'success') {
      items.value = json.data || []
    } else {
      error.value = json.message || 'Помилка завантаження'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function confirmUnban(ip) {
  if (!confirm(`Розблокувати IP адресу ${ip}?`)) return

  try {
    const res = await fetch('/api/admin/analytics/unban-ip', {
      method: 'DELETE',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    if (json.status === 'success') {
      load() // Reload list
    } else {
      alert('Помилка: ' + (json.message || 'Невідома помилка'))
    }
  } catch (e) {
    alert('Помилка: ' + e.message)
  }
}

function viewAnalytics(ip) {
  router.push(`/analytics?ip=${encodeURIComponent(ip)}`)
}

function banTypeBadge(isManual) {
  return isManual ? 'badge bg-primary' : 'badge bg-secondary'
}

function formatDuration(seconds) {
  if (!seconds) return '—'

  const hours = Math.floor(seconds / 3600)
  const days = Math.floor(seconds / 86400)

  if (seconds < 3600) {
    return Math.floor(seconds / 60) + ' хв'
  }
  if (seconds < 86400) {
    return hours + ' год'
  }
  if (days === 15) return '15 днів'
  if (days === 30) return '30 днів'
  if (days === 180) return '180 днів'
  return days + ' днів'
}


function formatTimeLeft(expiresAt) {
  if (!expiresAt) return '—'

  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires - now

  if (diff <= 0) return 'Закінчився'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return days + ' дн'
  if (hours > 0) return hours + ' год'
  if (minutes > 0) return minutes + ' хв'
  return seconds + ' сек'
}

function timeLeftClass(expiresAt) {
  if (!expiresAt) return 'text-muted'

  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires - now

  if (diff <= 0) return 'text-muted'

  const hours = diff / (1000 * 60 * 60)

  if (hours < 1) return 'text-danger'
  if (hours < 24) return 'text-warning'
  return 'text-success'
}

onMounted(() => {
  load()
})
</script>

<style scoped>
.font-monospace {
  font-family: 'Courier New', monospace;
}
</style>
