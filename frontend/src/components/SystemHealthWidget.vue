<template>
  <div class="mb-4">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h6 class="mb-0">
        <i class="bi bi-hdd-network me-1"></i>
        {{ t('systemHealth.title') }}
      </h6>
      <button class="btn btn-sm btn-outline-secondary" :disabled="loading" @click="load">
        <span v-if="loading" class="spinner-border spinner-border-sm"></span>
        <i v-else class="bi bi-arrow-clockwise"></i>
      </button>
    </div>

    <div v-if="error" class="alert alert-danger py-2 small mb-0">{{ error }}</div>

    <div v-else class="row g-3">
      <!-- Server -->
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2"><i class="bi bi-cpu me-1"></i>{{ t('systemHealth.server') }}</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.disk') }}</span>
                <span :class="pctClass(data?.server?.disk_usage_percent)">
                  {{ fmtPercent(data?.server?.disk_usage_percent) }}
                </span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.loadAvg') }}</span>
                <span>{{ data?.server?.load_average ? data.server.load_average.join(' / ') : '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.memory') }}</span>
                <span :class="pctClass(data?.server?.memory?.usage_percent)">
                  {{ fmtPercent(data?.server?.memory?.usage_percent) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Database -->
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2"><i class="bi bi-database me-1"></i>{{ t('systemHealth.database') }}</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.connections') }}</span>
                <span>{{ data?.database?.connections ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.slowQueries') }}</span>
                <span>{{ data?.database?.slow_queries ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.size') }}</span>
                <span>{{ data?.database?.size_mb != null ? t('systemHealth.megabytes', { value: data.database.size_mb }) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Storage -->
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2"><i class="bi bi-hdd-rack me-1"></i>{{ t('systemHealth.storage') }}</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>{{ t('table.status') }}</span>
                <span :class="data?.storage?.reachable ? 'text-success' : 'text-danger'">
                  {{ data?.storage?.reachable ? t('systemHealth.reachable') : t('systemHealth.unreachable') }}
                </span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.files') }}</span>
                <span>{{ data?.storage?.file_count ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.volume') }}</span>
                <span>{{ data?.storage?.total_mb != null ? t('systemHealth.megabytes', { value: data.storage.total_mb }) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Errors -->
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2"><i class="bi bi-exclamation-triangle me-1"></i>{{ t('systemHealth.apiErrors') }}</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.lastHour') }}</span>
                <span :class="countClass(data?.errors?.last_hour)">{{ data?.errors?.last_hour ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>{{ t('systemHealth.lastDay') }}</span>
                <span :class="countClass(data?.errors?.last_24h)">{{ data?.errors?.last_24h ?? '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiGet } from '../utils/api'

const { t } = useI18n({ useScope: 'global' })

const loading = ref(false)
const error = ref(null)
const data = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await apiGet('/admin/system/metrics')
    if (res.status === 'success') {
      data.value = res.data
    } else {
      error.value = res.message || t('systemHealth.loadError')
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function fmtPercent(v) {
  return v != null ? `${v}%` : '—'
}

function pctClass(v) {
  if (v == null) return ''
  if (v >= 90) return 'text-danger fw-semibold'
  if (v >= 75) return 'text-warning fw-semibold'
  return 'text-success'
}

function countClass(v) {
  if (v == null) return ''
  return v > 0 ? 'text-danger fw-semibold' : 'text-success'
}

onMounted(load)

defineExpose({ load })
</script>
