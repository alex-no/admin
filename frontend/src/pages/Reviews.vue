<template>
  <ReviewDetailModal />
  <ListPageWrapper>
    <div>
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Модерація відгуків</h5>
          <span class="badge bg-secondary">{{ total }}</span>
          <span v-if="stats.pending > 0" class="badge bg-warning text-dark">{{ stats.pending }} на модерації</span>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">Всі статуси</option>
            <option value="pending">На модерації</option>
            <option value="published">Опубліковані</option>
            <option value="rejected">Відхилені</option>
            <option value="hidden">Приховані</option>
            <option value="spam">Спам</option>
          </select>
          <select v-model="filterIsGuest" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">Всі користувачі</option>
            <option value="1">Гості</option>
            <option value="0">Зареєстровані</option>
          </select>
          <button class="btn btn-sm btn-outline-primary" @click="loadStats" title="Оновити статистику">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <!-- Статистика -->
      <div v-if="stats" class="row g-2 mb-3">
        <div class="col-auto">
          <div class="card shadow-sm">
            <div class="card-body py-2 px-3">
              <div class="small text-muted">Всього</div>
              <div class="h6 mb-0">{{ stats.total }}</div>
            </div>
          </div>
        </div>
        <div class="col-auto">
          <div class="card shadow-sm">
            <div class="card-body py-2 px-3">
              <div class="small text-muted">На модерації</div>
              <div class="h6 mb-0 text-warning">{{ stats.pending }}</div>
            </div>
          </div>
        </div>
        <div class="col-auto">
          <div class="card shadow-sm">
            <div class="card-body py-2 px-3">
              <div class="small text-muted">Опубліковано</div>
              <div class="h6 mb-0 text-success">{{ stats.published }}</div>
            </div>
          </div>
        </div>
        <div class="col-auto">
          <div class="card shadow-sm">
            <div class="card-body py-2 px-3">
              <div class="small text-muted">Гостьові</div>
              <div class="h6 mb-0">{{ stats.guest_reviews }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 small">
              <thead class="table-light">
                <tr>
                  <th style="width:60px" class="text-end">ID</th>
                  <th style="width:100px">Статус</th>
                  <th>СТО</th>
                  <th>Автор</th>
                  <th style="width:100px" class="text-center">Оцінка</th>
                  <th>Відгук</th>
                  <th style="width:140px">Дата</th>
                  <th style="width:150px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <td class="text-muted text-end">{{ row.id }}</td>
                  <td><span :class="statusBadge(row.status)">{{ statusLabel(row.status) }}</span></td>
                  <td>
                    <div class="text-truncate" style="max-width: 200px" :title="row.sto_name">
                      {{ row.sto_name }}
                    </div>
                    <div class="text-muted small">#{{ row.sto_id }}</div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-1">
                      <span>{{ row.author_name }}</span>
                      <span v-if="row.is_guest" class="badge badge-sm bg-info text-dark" title="Гостьовий відгук">
                        <i class="bi bi-person"></i>
                      </span>
                      <span v-if="row.is_verified_purchase" class="badge badge-sm bg-success" title="Підтверджена покупка">
                        <i class="bi bi-check-circle"></i>
                      </span>
                    </div>
                    <div v-if="row.guest_email" class="text-muted small">{{ row.guest_email }}</div>
                  </td>
                  <td class="text-center">
                    <div class="fw-bold">{{ row.rating_overall.toFixed(1) }}</div>
                    <div class="small text-muted">
                      <i v-for="n in 5" :key="n"
                         :class="n <= Math.round(row.rating_overall) ? 'bi-star-fill text-warning' : 'bi-star text-muted'"
                         class="bi"></i>
                    </div>
                    <span v-if="!row.rating_moderated" class="badge badge-sm bg-warning text-dark">Не модер.</span>
                  </td>
                  <td>
                    <div v-if="row.title" class="fw-semibold text-truncate" style="max-width: 300px" :title="row.title">
                      {{ row.title }}
                    </div>
                    <div class="text-muted small text-truncate" style="max-width: 300px" :title="row.text">
                      {{ row.text }}
                    </div>
                  </td>
                  <td class="text-muted" style="white-space:nowrap">
                    {{ formatDate(row.created_at) }}
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" @click="openDetail(row.id)" title="Переглянути">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button
                        v-if="row.status === 'pending'"
                        class="btn btn-outline-success"
                        @click="approve(row.id)"
                        title="Схвалити">
                        <i class="bi bi-check-lg"></i>
                      </button>
                      <button
                        v-if="row.status === 'pending'"
                        class="btn btn-outline-danger"
                        @click="reject(row.id)"
                        title="Відхилити">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="8" class="text-center text-muted py-4">Немає даних</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="text-muted small">Всього: {{ total }}</span>
          <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
        </div>
      </div>
    </div>
  </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '../components/ListPageWrapper.vue'
import Pagination from '../components/Pagination.vue'
import ReviewDetailModal from '../components/ReviewDetailModal.vue'
import { apiGet, apiPost } from '../utils/api'
import { useUrlFilters } from '../composables/useUrlFilters'

const loading = ref(false)
const error = ref(null)
const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const filterStatus = ref('')
const filterIsGuest = ref('')
const detailId = ref(null)
const stats = ref({
  total: 0,
  pending: 0,
  published: 0,
  rejected: 0,
  hidden: 0,
  spam: 0,
  guest_reviews: 0
})

// Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    status: filterStatus,
    is_guest: filterIsGuest,
    page
  },
  detail: {
    id: detailId,
    onOpen: (id) => {
      window.dispatchEvent(new CustomEvent('open-review-detail', { detail: { id } }))
    }
  }
})

const totalPages = computed(() => Math.ceil(total.value / perPage.value))

async function load(newPage = 1) {
  loading.value = true
  error.value = null
  page.value = newPage

  try {
    const params = {
      page: page.value,
      per_page: perPage.value
    }

    if (filterStatus.value) params.status = filterStatus.value
    if (filterIsGuest.value) params.is_guest = filterIsGuest.value

    const query = new URLSearchParams(params).toString()
    const response = await apiGet(`/admin/reviews?${query}`)

    if (response.success) {
      items.value = response.data.reviews
      total.value = response.data.total
    } else {
      error.value = response.message || 'Помилка завантаження даних'
    }
  } catch (err) {
    console.error('Error loading reviews:', err)
    error.value = 'Помилка завантаження даних'
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const response = await apiGet('/admin/reviews/stats')
    if (response.success) {
      stats.value = response.data
    }
  } catch (err) {
    console.error('Error loading stats:', err)
  }
}

async function approve(id) {
  if (!confirm('Схвалити та опублікувати цей відгук?')) return

  try {
    const response = await apiPost(`/admin/reviews/${id}/approve`)

    if (response.success) {
      // Показываем новый рейтинг СТО если он был пересчитан
      if (response.data?.sto_rating !== null && response.data?.sto_rating !== undefined) {
        console.log(`Рейтинг СТО обновлен: ${response.data.sto_rating}`)
      }
      await load(page.value)
      await loadStats()
    } else {
      alert(response.message || 'Помилка схвалення відгуку')
    }
  } catch (err) {
    console.error('Error approving review:', err)
    alert('Помилка схвалення відгуку')
  }
}

async function reject(id) {
  if (!confirm('Відхилити цей відгук?')) return

  try {
    const response = await apiPost(`/admin/reviews/${id}/reject`)

    if (response.success) {
      // Показываем новый рейтинг СТО если он был пересчитан
      if (response.data?.sto_rating !== null && response.data?.sto_rating !== undefined) {
        console.log(`Рейтинг СТО обновлен: ${response.data.sto_rating}`)
      }
      await load(page.value)
      await loadStats()
    } else {
      alert(response.message || 'Помилка відхилення відгуку')
    }
  } catch (err) {
    console.error('Error rejecting review:', err)
    alert('Помилка відхилення відгуку')
  }
}

function openDetail(id) {
  detailId.value = id
  window.dispatchEvent(new CustomEvent('open-review-detail', { detail: { id } }))
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusBadge(status) {
  const badges = {
    pending: 'badge bg-warning text-dark',
    published: 'badge bg-success',
    rejected: 'badge bg-danger',
    hidden: 'badge bg-secondary',
    spam: 'badge bg-dark'
  }
  return badges[status] || 'badge bg-secondary'
}

function statusLabel(status) {
  const labels = {
    pending: 'На модерації',
    published: 'Опубліковано',
    rejected: 'Відхилено',
    hidden: 'Приховано',
    spam: 'Спам'
  }
  return labels[status] || status
}

onMounted(async () => {
  initFromUrl()
  await loadStats()
  await load()

  // Слушаем событие закрытия модального окна для перезагрузки
  window.addEventListener('review-updated', () => {
    load(page.value)
    loadStats()
  })
})
</script>

<style scoped>
.badge-sm {
  font-size: 0.7rem;
  padding: 0.15rem 0.3rem;
}
</style>
