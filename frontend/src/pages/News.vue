<template>
  <ListPageWrapper>
    <div>
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Новини</h5>
          <span class="badge bg-secondary">{{ total }}</span>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <input
            v-model="search"
            type="text"
            class="form-control form-control-sm"
            style="width:220px"
            placeholder="Пошук за заголовком..."
            @input="debounceLoad"
          />
          <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option value="">Всі статуси</option>
            <option value="draft">Чернетки</option>
            <option value="scheduled">Заплановані</option>
            <option value="published">Опубліковані</option>
            <option value="archived">Архівні</option>
          </select>
          <button v-if="can('news.create')" class="btn btn-sm btn-primary" @click="openCreate">
            <i class="bi bi-plus-lg me-1"></i>Додати новину
          </button>
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
                  <th style="width:56px"></th>
                  <th>Заголовок (укр.)</th>
                  <th style="width:110px">Статус</th>
                  <th style="width:160px">Заплановано на</th>
                  <th style="width:160px">Опубліковано</th>
                  <th style="width:90px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <td class="text-muted text-end">{{ row.id }}</td>
                  <td>
                    <img v-if="row.cover_image_url" :src="row.cover_image_url" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px" />
                  </td>
                  <td>{{ row.title_uk }}</td>
                  <td>
                    <select
                      v-if="can('news.edit')"
                      class="form-select form-select-sm border-0 fw-medium badge"
                      :class="statusBadge(row.status)"
                      style="width:auto; background:transparent; font-size:.75rem; cursor:pointer; padding:.35rem .6rem"
                      :disabled="changingStatusId === row.id"
                      :value="row.status"
                      @change="changeStatus(row, $event.target.value)"
                    >
                      <option value="draft">Чернетка</option>
                      <option value="scheduled">Заплановано</option>
                      <option value="published">Опубліковано</option>
                      <option value="archived">Архів</option>
                    </select>
                    <span v-else class="badge" :class="statusBadge(row.status)">{{ statusLabel(row.status) }}</span>
                    <span v-if="changingStatusId === row.id" class="spinner-border spinner-border-sm ms-1" style="width:.7rem;height:.7rem"></span>
                  </td>
                  <td class="text-muted" style="white-space:nowrap">{{ formatDate(row.scheduled_at) }}</td>
                  <td class="text-muted" style="white-space:nowrap">{{ formatDate(row.published_at) }}</td>
                  <td class="text-nowrap">
                    <button v-if="can('news.edit')" class="btn btn-sm btn-outline-secondary" title="Редагувати" @click="openEdit(row)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button v-if="can('news.delete')" class="btn btn-sm btn-outline-danger" title="Видалити" @click="removeItem(row)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="7" class="text-center text-muted py-4">Немає новин</td>
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

      <!-- Create / Edit modal -->
      <BaseModal
        v-model:visible="modalOpen"
        storage-key="news-edit-modal"
        :title="modalData.id ? 'Редагування новини' : 'Нова новина'"
        :default-width="800"
        :min-width="600"
      >
        <div v-if="saveError" class="alert alert-danger py-2 small">{{ saveError }}</div>

        <div class="mb-3">
          <label class="form-label fw-semibold">Заголовок (укр.) <span class="text-danger">*</span></label>
          <input v-model="form.title_uk" type="text" class="form-control" />
        </div>
        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <label class="form-label">Заголовок (англ.)</label>
            <input v-model="form.title_en" type="text" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Заголовок (рос.)</label>
            <input v-model="form.title_ru" type="text" class="form-control" />
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">Короткий опис (укр.)</label>
          <textarea v-model="form.excerpt_uk" class="form-control" rows="2"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label fw-semibold">Текст новини (укр.) <span class="text-danger">*</span></label>
          <textarea v-model="form.content_uk" class="form-control" rows="6"></textarea>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <label class="form-label">Текст новини (англ.)</label>
            <textarea v-model="form.content_en" class="form-control" rows="4"></textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label">Текст новини (рос.)</label>
            <textarea v-model="form.content_ru" class="form-control" rows="4"></textarea>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">Обкладинка</label>
          <div class="d-flex align-items-center gap-3">
            <img
              v-if="coverPreviewUrl"
              :src="coverPreviewUrl"
              alt=""
              style="width:80px;height:80px;object-fit:cover;border-radius:6px"
            />
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                class="form-control form-control-sm"
                :disabled="coverUploading"
                @change="uploadCover"
              />
              <div v-if="coverUploading" class="small text-muted mt-1">
                <span class="spinner-border spinner-border-sm me-1"></span>Завантаження...
              </div>
              <div v-if="coverError" class="small text-danger mt-1">{{ coverError }}</div>
              <button
                v-if="form.cover_image_id"
                type="button"
                class="btn btn-sm btn-link text-danger p-0 mt-1"
                @click="removeCover"
              >
                Прибрати обкладинку
              </button>
            </div>
          </div>
        </div>

        <div class="row g-2">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Статус</label>
            <select v-model="form.status" class="form-select">
              <option value="draft">Чернетка</option>
              <option value="scheduled">Запланована публікація</option>
              <option value="published">Опубліковано</option>
              <option value="archived">Архів</option>
            </select>
          </div>
          <div class="col-md-6" v-if="form.status === 'scheduled'">
            <label class="form-label fw-semibold">Опублікувати о</label>
            <input v-model="form.scheduled_at" type="datetime-local" class="form-control" />
          </div>
        </div>

        <template #footer>
          <button class="btn btn-secondary" :disabled="saving" @click="modalOpen = false">Скасувати</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
            Зберегти
          </button>
        </template>
      </BaseModal>
    </div>
  </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import Pagination from '@/components/Pagination.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useAuth } from '@/composables/useAuth'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/utils/api'

const { can, authHeaders } = useAuth()

const loading = ref(false)
const error = ref(null)
const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(20)
const search = ref('')
const filterStatus = ref('')

const totalPages = computed(() => Math.ceil(total.value / perPage.value))

let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 400)
}

async function load(p = 1) {
  loading.value = true
  error.value = null
  page.value = p

  const params = new URLSearchParams({ page: p, per_page: perPage.value })
  if (search.value.trim()) params.set('search', search.value.trim())
  if (filterStatus.value) params.set('status', filterStatus.value)

  try {
    const res = await apiGet(`/admin/news?${params}`)
    if (res.success) {
      items.value = res.data
      total.value = res.pagination.total
    } else {
      error.value = res.message || 'Помилка завантаження'
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const changingStatusId = ref(null)

async function changeStatus(row, newStatus) {
  if (newStatus === row.status) return

  if (newStatus === 'scheduled' && !row.scheduled_at) {
    alert('Для запланованої публікації потрібно вказати дату — відкрийте редагування новини (олівець).')
    return
  }

  changingStatusId.value = row.id
  try {
    const res = await apiPatch(`/admin/news/${row.id}`, { status: newStatus })
    if (!res.success) {
      alert(res.message || 'Помилка зміни статусу')
      return
    }
    await load(page.value)
  } catch (err) {
    alert(err.message)
  } finally {
    changingStatusId.value = null
  }
}

function statusLabel(status) {
  return { draft: 'Чернетка', scheduled: 'Заплановано', published: 'Опубліковано', archived: 'Архів' }[status] || status
}

function statusBadge(status) {
  return {
    draft: 'bg-secondary',
    scheduled: 'bg-warning text-dark',
    published: 'bg-success',
    archived: 'bg-dark',
  }[status] || 'bg-secondary'
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('uk-UA', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ── Modal ─────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const modalData = ref({})
const saving = ref(false)
const saveError = ref(null)

const emptyForm = () => ({
  title_uk: '', title_en: '', title_ru: '',
  excerpt_uk: '',
  content_uk: '', content_en: '', content_ru: '',
  cover_image_id: null,
  status: 'draft',
  scheduled_at: '',
})

const form = ref(emptyForm())
const coverPreviewUrl = ref('')
const coverUploading = ref(false)
const coverError = ref(null)

function openCreate() {
  modalData.value = {}
  form.value = emptyForm()
  coverPreviewUrl.value = ''
  coverError.value = null
  saveError.value = null
  modalOpen.value = true
}

async function openEdit(row) {
  saveError.value = null
  try {
    const res = await apiGet(`/admin/news/${row.id}`)
    if (!res.success) throw new Error(res.message || 'Помилка завантаження')
    const item = res.data
    modalData.value = item
    form.value = {
      title_uk: item.title_uk ?? '',
      title_en: item.title_en ?? '',
      title_ru: item.title_ru ?? '',
      excerpt_uk: item.excerpt_uk ?? '',
      content_uk: item.content_uk ?? '',
      content_en: item.content_en ?? '',
      content_ru: item.content_ru ?? '',
      cover_image_id: item.cover_image_id ?? null,
      status: item.status,
      scheduled_at: item.scheduled_at ? item.scheduled_at.replace(' ', 'T').slice(0, 16) : '',
    }
    coverPreviewUrl.value = item.cover_image_url ?? ''
    coverError.value = null
    modalOpen.value = true
  } catch (err) {
    error.value = err.message
  }
}

async function uploadCover(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  coverUploading.value = true
  coverError.value = null
  try {
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/admin/news/cover-image', {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message || 'Помилка завантаження')
    form.value.cover_image_id = json.data.media_id
    coverPreviewUrl.value = json.data.url
  } catch (err) {
    coverError.value = err.message
  } finally {
    coverUploading.value = false
  }
}

function removeCover() {
  form.value.cover_image_id = null
  coverPreviewUrl.value = ''
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    const payload = { ...form.value }
    if (payload.status === 'scheduled' && payload.scheduled_at) {
      payload.scheduled_at = payload.scheduled_at.replace('T', ' ') + ':00'
    } else {
      delete payload.scheduled_at
    }

    const res = modalData.value.id
      ? await apiPatch(`/admin/news/${modalData.value.id}`, payload)
      : await apiPost('/admin/news', payload)

    if (!res.success) {
      saveError.value = res.message || 'Помилка збереження'
      return
    }
    modalOpen.value = false
    await load(page.value)
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
}

async function removeItem(row) {
  if (!window.confirm(`Видалити новину "${row.title_uk}"?`)) return
  try {
    const res = await apiDelete(`/admin/news/${row.id}`)
    if (!res.success) {
      alert(res.message || 'Помилка видалення')
      return
    }
    await load(page.value)
  } catch (err) {
    alert(err.message)
  }
}

onMounted(() => load(1))
</script>
