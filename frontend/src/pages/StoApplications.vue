<template>
  <BaseLayout>
    <div class="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
      <h5 class="mb-0">Заявки на управління СТО</h5>
      <div class="d-flex gap-2">
        <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="pending">Очікують</option>
          <option value="approved">Схвалені</option>
          <option value="rejected">Відхилені</option>
          <option value="">Всі</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <template v-else>
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:50px" class="text-muted text-end">ID</th>
                <th>СТО</th>
                <th>Користувач</th>
                <th>Повідомлення</th>
                <th style="width:110px">Подано</th>
                <th style="width:130px">Статус</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in items" :key="row.id">
                <tr>
                  <td class="text-muted text-end">{{ row.id }}</td>
                  <td>
                    <div class="fw-medium">{{ row.sto_name }}</div>
                    <span class="badge bg-secondary" style="font-size:.65rem">{{ typeLabel(row.sto_type) }}</span>
                    <span class="text-muted ms-1" style="font-size:.75rem">#{{ row.sto_id }}</span>
                  </td>
                  <td>
                    <div class="fw-medium">{{ row.user_name || row.username }}</div>
                    <div class="text-muted" style="font-size:.75rem">{{ row.user_email }}</div>
                  </td>
                  <td class="text-muted" style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    {{ row.user_note || '—' }}
                  </td>
                  <td class="text-muted" style="font-size:.75rem">{{ formatDateShort(row.created_at) }}</td>
                  <td>
                    <span class="badge" :class="statusBadge(row.status)">{{ statusLabel(row.status) }}</span>
                    <div v-if="row.admin_note" class="text-muted mt-1" style="font-size:.7rem;white-space:normal">{{ row.admin_note }}</div>
                  </td>
                  <td>
                    <button v-if="row.status === 'pending'"
                            class="btn btn-sm btn-outline-secondary py-0"
                            @click="openReview(row)">
                      <i class="bi bi-pencil"></i>
                    </button>
                  </td>
                </tr>
              </template>
              <tr v-if="!items.length">
                <td colspan="7" class="text-center text-muted py-4">Заявок не знайдено</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">Всього: {{ total }}</span>
        <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
      </div>
    </template>

    <!-- Review modal -->
    <Teleport to="body">
      <div v-if="reviewOpen" class="modal-backdrop-simple" @click.self="closeReview">
        <div class="card shadow" style="max-width:480px;margin:12vh auto">
          <div class="card-header d-flex justify-content-between align-items-center py-2 px-4">
            <h6 class="mb-0">Розгляд заявки #{{ reviewing?.id }}</h6>
            <button class="btn btn-sm btn-outline-secondary" @click="closeReview">✕</button>
          </div>
          <div class="card-body px-4 py-3">
            <div class="mb-2 small">
              <span class="text-muted">СТО:</span> <strong>{{ reviewing?.sto_name }}</strong>
            </div>
            <div class="mb-3 small">
              <span class="text-muted">Користувач:</span> {{ reviewing?.user_name || reviewing?.username }}
              <span class="text-muted ms-1">({{ reviewing?.user_email }})</span>
            </div>
            <div v-if="reviewing?.user_note" class="mb-3 small bg-light p-2 rounded">
              <div class="text-muted mb-1">Повідомлення від користувача:</div>
              {{ reviewing.user_note }}
            </div>
            <div class="mb-3">
              <label class="form-label small mb-1">Примітка адміністратора (необов'язково)</label>
              <textarea v-model="adminNote" class="form-control form-control-sm" rows="2"></textarea>
            </div>
            <div v-if="reviewError" class="alert alert-danger py-2 small mb-2">{{ reviewError }}</div>
          </div>
          <div class="card-footer d-flex gap-2 justify-content-end py-2 px-4">
            <button class="btn btn-sm btn-outline-secondary" @click="closeReview">Скасувати</button>
            <button class="btn btn-sm btn-danger" :disabled="saving" @click="doReview('rejected')">
              <span v-if="saving === 'rejected'" class="spinner-border spinner-border-sm me-1"></span>
              Відхилити
            </button>
            <button class="btn btn-sm btn-success" :disabled="saving" @click="doReview('approved')">
              <span v-if="saving === 'approved'" class="spinner-border spinner-border-sm me-1"></span>
              Схвалити
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import Pagination from '@/components/Pagination.vue'
import { useAuth } from '@/composables/useAuth'
import { useUrlFilters } from '@/composables/useUrlFilters'
import { formatDateShort } from '@/utils/date'

const { authHeaders } = useAuth()

const STO_TYPES = {
  individual: 'Індивідуальне', company: 'Компанія',
  network: 'Мережа', specialized: 'Спеціалізоване', mobile: 'Мобільне',
}
function typeLabel(v) { return STO_TYPES[v] ?? v ?? '—' }
function statusLabel(v) { return { pending: 'Очікує', approved: 'Схвалено', rejected: 'Відхилено' }[v] ?? v }
function statusBadge(v) { return { pending: 'bg-warning text-dark', approved: 'bg-success', rejected: 'bg-danger' }[v] ?? 'bg-secondary' }

const items       = ref([])
const loading     = ref(true)
const error       = ref(null)
const page        = ref(1)
const total       = ref(0)
const totalPages  = ref(1)
const filterStatus = ref('pending')
const detailId     = ref(null)

// Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    status: filterStatus,
    page
  },
  detail: {
    id: detailId,
    onOpen: async (id) => {
      // Находим запись в списке или загружаем её
      let row = items.value.find(r => r.id === id)
      if (!row) {
        try {
          const res = await fetch(`/api/admin/sto-applications/${id}`, { headers: authHeaders() })
          const json = await res.json()
          if (json.data) {
            row = json.data
          }
        } catch (e) {
          console.error('Failed to load application:', e)
          return
        }
      }
      if (row) {
        openReview(row)
      }
    }
  }
})

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const params = new URLSearchParams({ page: p, per_page: 50, status: filterStatus.value })
    const res  = await fetch(`/api/admin/sto-applications?${params}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    items.value      = json.data ?? []
    total.value      = json.pagination?.total ?? 0
    totalPages.value = json.pagination?.total_pages ?? 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// Review modal
const reviewOpen  = ref(false)
const reviewing   = ref(null)
const adminNote   = ref('')
const saving      = ref(null)
const reviewError = ref(null)

function openReview(row) {
  reviewing.value  = row
  adminNote.value  = ''
  reviewError.value = null
  reviewOpen.value = true
  detailId.value   = row.id
}

function closeReview() {
  reviewOpen.value = false
  detailId.value = null
}

async function doReview(status) {
  saving.value      = status
  reviewError.value = null
  try {
    const res  = await fetch(`/api/admin/sto-applications/${reviewing.value.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ status, admin_note: adminNote.value }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    reviewing.value.status      = json.data.status
    reviewing.value.admin_note  = adminNote.value
    reviewing.value.reviewed_at = json.data.reviewed_at
    closeReview()
    // Reload to reflect changes
    if (filterStatus.value === 'pending') await load(page.value)
  } catch (e) {
    reviewError.value = e.message
  } finally {
    saving.value = null
  }
}

onMounted(() => {
  initFromUrl()
  load(page.value)
})
</script>

<style scoped>
.modal-backdrop-simple {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 1050;
  overflow-y: auto;
}
</style>
