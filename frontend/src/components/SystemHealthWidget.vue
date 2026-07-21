<template>
  <div class="mb-4">
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h6 class="mb-0">
        <i class="bi bi-hdd-network me-1"></i>
        Моніторинг системи
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
            <div class="text-muted small mb-2"><i class="bi bi-cpu me-1"></i>Сервер</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>Диск</span>
                <span :class="pctClass(data?.server?.disk_usage_percent)">
                  {{ fmtPercent(data?.server?.disk_usage_percent) }}
                </span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Load avg</span>
                <span>{{ data?.server?.load_average ? data.server.load_average.join(' / ') : '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Пам'ять</span>
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
            <div class="text-muted small mb-2"><i class="bi bi-database me-1"></i>База даних</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>З'єднання</span>
                <span>{{ data?.database?.connections ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Повільні запити</span>
                <span>{{ data?.database?.slow_queries ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Розмір</span>
                <span>{{ data?.database?.size_mb != null ? data.database.size_mb + ' МБ' : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Storage -->
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2"><i class="bi bi-hdd-rack me-1"></i>Сховище (MinIO)</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>Статус</span>
                <span :class="data?.storage?.reachable ? 'text-success' : 'text-danger'">
                  {{ data?.storage?.reachable ? 'Доступне' : 'Недоступне' }}
                </span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Файлів</span>
                <span>{{ data?.storage?.file_count ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>Обсяг</span>
                <span>{{ data?.storage?.total_mb != null ? data.storage.total_mb + ' МБ' : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Errors -->
      <div class="col-sm-6 col-lg-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="text-muted small mb-2"><i class="bi bi-exclamation-triangle me-1"></i>Помилки API</div>
            <div class="small">
              <div class="d-flex justify-content-between">
                <span>За годину</span>
                <span :class="countClass(data?.errors?.last_hour)">{{ data?.errors?.last_hour ?? '—' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span>За добу</span>
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
import { apiGet } from '../utils/api'

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
      error.value = res.message || 'Помилка завантаження метрик'
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
