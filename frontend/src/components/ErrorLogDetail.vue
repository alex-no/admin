<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
  </div>
  <div v-else-if="error" class="alert alert-danger small">{{ error }}</div>
  <div v-else-if="data">
    <div class="row g-3">
      <!-- Basic Info -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header bg-light py-2">
            <strong class="small">Основна інформація</strong>
          </div>
          <div class="card-body p-2">
            <table class="table table-sm mb-0 small">
              <tbody>
                <tr>
                  <th style="width:140px">ID:</th>
                  <td>{{ data.id }}</td>
                </tr>
                <tr>
                  <th>Рівень:</th>
                  <td><span :class="levelBadge(data.level)">{{ data.level }}</span></td>
                </tr>
                <tr>
                  <th>Категорія:</th>
                  <td>{{ data.category || '—' }}</td>
                </tr>
                <tr>
                  <th>Дата:</th>
                  <td>{{ data.created_at }}</td>
                </tr>
                <tr v-if="data.user_id">
                  <th>Користувач:</th>
                  <td>
                    #{{ data.user_id }}
                    <span v-if="data.username" class="text-muted">— {{ data.username }}</span>
                    <span v-if="data.email" class="text-muted">({{ data.email }})</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Request Info -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header bg-light py-2">
            <strong class="small">HTTP запит</strong>
          </div>
          <div class="card-body p-2">
            <table class="table table-sm mb-0 small">
              <tbody>
                <tr>
                  <th style="width:140px">URL:</th>
                  <td class="small">{{ data.url || '—' }}</td>
                </tr>
                <tr>
                  <th>Метод:</th>
                  <td>
                    <span v-if="data.method" class="badge bg-info">{{ data.method }}</span>
                    <span v-else>—</span>
                  </td>
                </tr>
                <tr>
                  <th>IP:</th>
                  <td>{{ data.ip || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Message -->
      <div class="col-12">
        <div class="card">
          <div class="card-header bg-light py-2">
            <strong class="small">Повідомлення</strong>
          </div>
          <div class="card-body p-2">
            <pre class="mb-0 small" style="white-space: pre-wrap; word-break: break-word;">{{ data.message }}</pre>
          </div>
        </div>
      </div>

      <!-- Exception -->
      <div v-if="data.exception_class" class="col-12">
        <div class="card">
          <div class="card-header bg-light py-2">
            <strong class="small">Exception</strong>
          </div>
          <div class="card-body p-2">
            <table class="table table-sm mb-0 small">
              <tbody>
                <tr>
                  <th style="width:140px">Клас:</th>
                  <td><code>{{ data.exception_class }}</code></td>
                </tr>
                <tr v-if="data.file">
                  <th>Файл:</th>
                  <td><code>{{ data.file }}</code></td>
                </tr>
                <tr v-if="data.line">
                  <th>Рядок:</th>
                  <td><code>{{ data.line }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Stack Trace -->
      <div v-if="data.stack_trace" class="col-12">
        <div class="card">
          <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
            <strong class="small">Stack Trace</strong>
            <button class="btn btn-sm btn-outline-secondary" @click="copyStackTrace">
              <i class="bi bi-clipboard"></i> Копіювати
            </button>
          </div>
          <div class="card-body p-2">
            <pre class="mb-0 small" style="max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;">{{ formatStackTrace(data.stack_trace) }}</pre>
          </div>
        </div>
      </div>

      <!-- Context -->
      <div v-if="data.context" class="col-12">
        <div class="card">
          <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
            <strong class="small">Контекст (додаткові дані)</strong>
            <button class="btn btn-sm btn-outline-secondary" @click="$emit('toggle-context-format')">
              <i class="bi bi-code"></i> {{ contextFormatted ? 'Raw JSON' : 'Formatted' }}
            </button>
          </div>
          <div class="card-body p-2">
            <pre v-if="contextFormatted" class="mb-0 small" style="max-height: 300px; overflow-y: auto;">{{ JSON.stringify(data.context, null, 2) }}</pre>
            <pre v-else class="mb-0 small" style="max-height: 300px; overflow-y: auto; white-space: pre-wrap;">{{ JSON.stringify(data.context) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotify } from '@/composables/useNotify'

const { notify } = useNotify()

const props = defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  data: { type: Object, default: null },
  contextFormatted: { type: Boolean, default: true },
})

defineEmits(['toggle-context-format'])

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

function formatStackTrace(trace) {
  if (typeof trace === 'string') return trace
  if (trace && typeof trace === 'object') {
    return trace.trace || JSON.stringify(trace, null, 2)
  }
  return 'Немає даних'
}

function copyStackTrace() {
  const text = formatStackTrace(props.data.stack_trace)
  navigator.clipboard.writeText(text).then(() => {
    notify('Stack trace скопійовано в буфер обміну', { type: 'success' })
  })
}
</script>
