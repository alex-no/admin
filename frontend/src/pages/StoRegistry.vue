<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <ListPageWrapper>
    <DataListPage
      ref="listRef"
      title="Реєстр даних"
      :api-list="cfg.apiList"
      :api-update="cfg.apiUpdate"
      :api-delete="cfg.apiDelete"
      :filter-config="filterConfig"
      :columns-config="columnsConfig"
      :actions="cfg.actions"
      @row-action="onRowAction"
    />
  </ListPageWrapper>

  <BaseModal
    v-model:visible="detailOpen"
    storage-key="sto-registry-detail"
    :default-width="700"
    :min-width="480"
    :max-width="1000"
    :default-height="520"
    :min-height="380"
    :max-height="800"
    :close-on-backdrop="false"
  >
    <template #title>
      <h5 class="mb-0">
        СТО <span class="text-muted fw-normal fs-6">#{{ detailRow?.id }}</span>
        <span v-if="detailRow?.name_uk" class="text-primary fw-normal fs-6 ms-2">{{ detailRow.name_uk }}</span>
      </h5>
    </template>

    <!-- П'ять вкладок навмисно (а не дві) — щоб на вузькому floating-вікні/докері
         було видно, як панель вкладок переноситься на другий рядок (flex-wrap
         у Bootstrap .nav-tabs, нічого додатково писати не довелось). -->
    <ModalTabs v-model="activeTab" :tabs="TABS" />

    <div v-if="detailRow">
      <div v-if="saveError" class="alert alert-danger py-2 small">{{ saveError }}</div>

      <!-- ── Основне ───────────────────────────────────────────────────── -->
      <template v-if="activeTab === 'general'">
        <div class="row g-3">
          <div class="col-sm-8">
            <label class="form-label small mb-1">Назва</label>
            <input v-model="form.name_uk" type="text" class="form-control form-control-sm" />
          </div>
          <div class="col-sm-4">
            <label class="form-label small mb-1">Тип</label>
            <select v-model="form.sto_type" class="form-select form-select-sm">
              <option value="service">СТО</option>
              <option value="tire">Шиномонтаж</option>
              <option value="wash">Автомийка</option>
            </select>
          </div>
        </div>
        <div class="mt-3">
          <div class="form-check form-switch">
            <input
              id="sto-active-switch"
              v-model="form.is_active"
              class="form-check-input"
              type="checkbox"
              role="switch"
            />
            <label class="form-check-label small" for="sto-active-switch">
              {{ form.is_active ? 'Активне' : 'Неактивне' }}
            </label>
          </div>
        </div>
      </template>

      <!-- ── Контакти ──────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'contacts'">
        <div class="mb-3">
          <label class="form-label small mb-1">Адреса</label>
          <input v-model="form.address" type="text" class="form-control form-control-sm" />
        </div>
        <div>
          <label class="form-label small mb-1">Телефони</label>
          <PhoneListCell
            :field="{}"
            :model-value="form.phones"
            :readonly="false"
            @update:model-value="(v) => (form.phones = v)"
          />
        </div>
      </template>

      <!-- ── Опис ──────────────────────────────────────────────────────── -->
      <template v-else-if="activeTab === 'description'">
        <label class="form-label small mb-1">Опис</label>
        <textarea v-model="form.description" class="form-control form-control-sm" rows="7"></textarea>
      </template>

      <!-- ── Рейтинг (тільки перегляд — своїх полів для збереження немає) ── -->
      <template v-else-if="activeTab === 'rating'">
        <div class="text-muted small mb-2">
          Рейтинг розраховується автоматично на основі відгуків користувачів і тут не редагується.
        </div>
        <div class="fs-3">
          <i class="bi bi-star-fill text-warning me-2"></i>{{ detailRow.rating ?? '—' }}
        </div>
      </template>

      <!-- ── Країна (тільки перегляд, дані — з того ж кешу useRemoteOptions,
             що й фільтр "Країна" у списку; повторного запиту не буде) ─────── -->
      <template v-else-if="activeTab === 'country'">
        <div class="text-muted small mb-1">Країна реєстрації</div>
        <div>{{ countryName }}</div>
      </template>

      <!-- ── Фото: демо аплоаду файлів (з диска напряму або за URL) без
             MinIO/S3 — файли лежать у public/api/media/ бекенду, метадані —
             у фейковій таблиці sto_media. Обидва скидаються при рестарті
             контейнера, як і решта даних тут. Своїх кнопок "Зберегти" немає —
             кожна дія (аплоад/обкладинка/підпис/видалення) зберігається одразу. ── -->
      <template v-else-if="activeTab === 'photos'">
        <div class="mb-3">
          <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
            <label class="btn btn-sm btn-outline-primary mb-0" style="cursor:pointer">
              <i class="bi bi-upload me-1"></i>Завантажити фото
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style="display:none"
                @change="uploadPhotos($event)"
              />
            </label>
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="showUrlUpload = !showUrlUpload; photosError = null"
            >
              <i class="bi bi-link-45deg me-1"></i>Завантажити з URL
            </button>
            <span v-if="photosUploading" class="text-muted small">
              <span class="spinner-border spinner-border-sm me-1"></span>Завантаження...
            </span>
          </div>
          <div v-if="photosError" class="text-danger small mb-2">{{ photosError }}</div>

          <div v-if="showUrlUpload" class="card border-secondary" style="max-width:600px">
            <div class="card-body p-3">
              <div class="mb-2">
                <label class="form-label small mb-1">URL зображення</label>
                <input
                  v-model="photoUrl"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="https://example.com/image.jpg"
                  @keydown.enter.prevent="uploadPhotoFromUrl"
                />
                <div class="text-muted small mt-1">Підтримуються формати: JPG, PNG, WebP.</div>
              </div>
              <div class="d-flex gap-2">
                <button
                  class="btn btn-sm btn-primary"
                  :disabled="!photoUrl.trim() || photosUploading"
                  @click="uploadPhotoFromUrl"
                >
                  <i class="bi bi-download me-1"></i>Завантажити
                </button>
                <button
                  class="btn btn-sm btn-secondary"
                  @click="showUrlUpload = false; photoUrl = ''; photosError = null"
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="photosLoading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
        </div>
        <div v-else-if="!photosList.length" class="text-muted text-center py-5">
          <i class="bi bi-images" style="font-size:2rem"></i>
          <div class="mt-2">Фото відсутні</div>
        </div>
        <div v-else class="row g-3">
          <div v-for="photo in photosList" :key="photo.id" class="col-6 col-md-4">
            <div class="card h-100 shadow-sm" :class="{ 'border-primary': photo.is_cover }">
              <div class="position-relative">
                <img
                  :src="photo.url"
                  :alt="photo.caption ?? ''"
                  class="card-img-top"
                  style="width:100%; height:140px; object-fit:cover; cursor:pointer"
                  @click="openPhotoPreview(photo)"
                  loading="lazy"
                />
                <span
                  v-if="photo.is_cover"
                  class="badge bg-primary position-absolute"
                  style="top:6px;left:6px;font-size:.65rem"
                >
                  <i class="bi bi-star-fill me-1"></i>Обкладинка
                </span>
              </div>
              <div class="card-body p-2">
                <input
                  :value="photo.caption ?? ''"
                  type="text"
                  class="form-control form-control-sm mb-2"
                  placeholder="Підпис..."
                  @change="updatePhotoCaption(photo, $event.target.value)"
                />
                <div class="d-flex gap-1">
                  <button
                    v-if="!photo.is_cover"
                    class="btn btn-sm btn-outline-primary py-0 px-1 flex-fill"
                    title="Зробити обкладинкою"
                    @click="setCover(photo)"
                  >
                    <i class="bi bi-star"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-outline-danger py-0 px-1 flex-fill"
                    title="Видалити"
                    @click="deletePhoto(photo)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template v-if="TAB_FIELDS[activeTab]?.length" #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-secondary btn-sm" @click="detailOpen = false">Закрити</button>
        <button class="btn btn-outline-primary btn-sm" :disabled="saving" @click="saveTab(false)">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>Зберегти
        </button>
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveTab(true)">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>Зберегти та закрити
        </button>
      </div>
    </template>
    <template v-else #footer>
      <div></div>
      <button class="btn btn-secondary btn-sm" @click="detailOpen = false">Закрити</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import BaseModal from '@/components/BaseModal.vue'
import ModalTabs from '@/components/ModalTabs.vue'
import DataListPage from '@/list-framework/DataListPage.vue'
import PhoneListCell from '@/list-framework/cells/PhoneListCell.vue'
import { useAuth } from '@/composables/useAuth'
import { useUrlFilters } from '@/composables/useUrlFilters'
import { useRemoteOptions } from '@/list-framework/composables/useRemoteOptions'
import { normalizePhoneE164 } from '@/utils/phone'
import filterConfig from './sto-registry.filter.json'
import columnsConfig from './sto-registry.columns.json'
import cfg from './sto-registry.config.json'

const auth = useAuth()
const listRef = ref(null)

// Субменю картки деталей — той самий підхід, що і в AllSTO (StoList.vue):
// sticky-панель вкладок + кнопки "Зберегти"/"Зберегти та закрити" знизу
// (останні показуються лише для вкладок, у яких є що зберігати).
// Підписи навмисно довші, ніж мінімально потрібно (не просто "Опис", а "Опис та деталі") —
// щоб рядок вкладок переповнювався й переносився на другий рядок вже на не надто вузькій
// ширині вікна, без зміни паддингів/шрифту.
const TABS = [
  { key: 'general', label: 'Основна інформація', icon: 'bi-info-circle' },
  { key: 'contacts', label: 'Контактні дані', icon: 'bi-telephone' },
  { key: 'description', label: 'Опис та деталі', icon: 'bi-card-text' },
  { key: 'rating', label: 'Рейтинг та відгуки', icon: 'bi-star' },
  { key: 'country', label: 'Країна реєстрації', icon: 'bi-flag' },
  { key: 'photos', label: 'Фото', icon: 'bi-images' },
]

// Які поля належать якій вкладці — визначає, що саме відправляти при "Зберегти"
// (тільки поточна вкладка) проти "Зберегти та закрити" (усі вкладки одразу).
// Порожній масив = вкладка тільки для перегляду, кнопки збереження на ній сховані.
const TAB_FIELDS = {
  general: ['name_uk', 'sto_type', 'is_active'],
  contacts: ['address', 'phones'],
  description: ['description'],
  rating: [],
  country: [],
  photos: [],
}

const activeTab = ref('general')
const detailOpen = ref(false)
const detailRow = ref(null)
const saving = ref(false)
const saveError = ref(null)

const form = reactive({
  name_uk: '',
  sto_type: 'service',
  is_active: true,
  address: '',
  phones: [],
  description: '',
})
let originalForm = { ...form }
let suppressUnsavedCheck = false

const hasUnsavedChanges = computed(
  () => JSON.stringify(form) !== JSON.stringify(originalForm)
)

// Той самий довідник, що й у фільтрі "Країна" (sto-registry.filter.json) —
// useRemoteOptions кешує за URL, тому другого запиту до бекенду не буде.
const { options: countryOptions } = useRemoteOptions('/api/admin/geography/countries', {
  valueKey: 'id',
  labelKey: 'name_uk',
})
const countryName = computed(() => {
  const found = countryOptions.value.find((o) => String(o.value) === String(detailRow.value?.country_id))
  return found ? found.label : '—'
})

// ── Фото ──────────────────────────────────────────────────────────────────
const photosLoading   = ref(false)
const photosList      = ref([])
const photosUploading = ref(false)
const photosError     = ref(null)
const showUrlUpload   = ref(false)
const photoUrl        = ref('')

async function loadPhotos() {
  if (!detailRow.value) return

  photosLoading.value = true
  photosError.value = null
  try {
    const res = await fetch(`${cfg.apiUpdate}/${detailRow.value.id}/media`, { headers: auth.authHeaders() })
    const json = await res.json()
    photosList.value = json.data ?? []
  } catch (e) {
    photosError.value = "Помилка з'єднання з сервером"
  } finally {
    photosLoading.value = false
  }
}

// Вкладка відкривається лише по кліку — фото вантажимо лише коли вона активна,
// а не одразу при відкритті картки (як і решта тут, щоб не робити зайвих запитів).
watch(activeTab, (tab) => {
  if (tab === 'photos') loadPhotos()
})

async function uploadPhotos(event) {
  const files = Array.from(event.target.files ?? [])
  event.target.value = ''
  if (!files.length || !detailRow.value) return

  photosUploading.value = true
  photosError.value = null
  try {
    for (const file of files) {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch(`${cfg.apiUpdate}/${detailRow.value.id}/media`, {
        method: 'POST',
        headers: auth.authHeaders(),
        body: fd,
      })
      const json = await res.json()
      if (json.status === 'error') throw new Error(json.message)
      photosList.value.push(json.data)
    }
  } catch (e) {
    photosError.value = e.message
  } finally {
    photosUploading.value = false
  }
}

async function uploadPhotoFromUrl() {
  const url = photoUrl.value.trim()
  if (!url || !detailRow.value) return

  photosUploading.value = true
  photosError.value = null
  try {
    const res = await fetch(`${cfg.apiUpdate}/${detailRow.value.id}/media/from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
      body: JSON.stringify({ url }),
    })
    const json = await res.json()
    if (json.status === 'error') throw new Error(json.message ?? 'Помилка завантаження')

    photosList.value.push(json.data)
    photoUrl.value = ''
    showUrlUpload.value = false
  } catch (e) {
    photosError.value = e.message
  } finally {
    photosUploading.value = false
  }
}

async function setCover(photo) {
  await fetch(`${cfg.apiUpdate}/${detailRow.value.id}/media/${photo.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
    body: JSON.stringify({ is_cover: true }),
  })
  photosList.value.forEach((p) => { p.is_cover = p.id === photo.id })
}

async function updatePhotoCaption(photo, caption) {
  await fetch(`${cfg.apiUpdate}/${detailRow.value.id}/media/${photo.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
    body: JSON.stringify({ caption }),
  })
  photo.caption = caption
}

async function deletePhoto(photo) {
  if (!confirm('Видалити фото?')) return
  await fetch(`${cfg.apiUpdate}/${detailRow.value.id}/media/${photo.id}`, {
    method: 'DELETE',
    headers: auth.authHeaders(),
  })
  photosList.value = photosList.value.filter((p) => p.id !== photo.id)
}

function openPhotoPreview(photo) {
  window.open(photo.url, '_blank')
}

function populateForm(row) {
  detailRow.value = row
  Object.assign(form, {
    name_uk: row.name_uk,
    sto_type: row.sto_type,
    is_active: row.is_active,
    address: row.address,
    phones: row.phones ?? [],
    description: row.description ?? '',
  })
  originalForm = { ...form }

  photosList.value = []
  photosError.value = null
  showUrlUpload.value = false
  photoUrl.value = ''
  if (activeTab.value === 'photos') loadPhotos()
}

function onRowAction({ type, row, tab }) {
  if (type !== 'detail') return

  populateForm(row)
  activeTab.value = tab || 'general'
  detailId.value = row.id
  detailOpen.value = true
}

// Хрестик/фон/Escape у BaseModal лише міняють detailOpen — перехоплюємо тут,
// щоб попередити про незбережені зміни (як у AllSTO: підтвердження + відкат закриття).
watch(detailOpen, (val, wasOpen) => {
  if (wasOpen && !val) {
    if (!suppressUnsavedCheck && hasUnsavedChanges.value) {
      const confirmed = confirm('Є незбережені зміни. Закрити без збереження?')
      if (!confirmed) {
        nextTick(() => { detailOpen.value = true })
        return
      }
    }
    suppressUnsavedCheck = false
    detailId.value = null
  }
})

// Синхронізація з URL: активна вкладка (tab) — звичайний фільтр, id відкритого
// запису — спеціальний параметр detail (той самий підхід, що й у StoList.vue).
// Завдяки цьому посилання на сторінку з відкритою деталькою — при перезавантаженні
// чи передачі іншій людині — відкриває саме той запис і саме ту вкладку.
const detailId = ref(null)

const { initFromUrl } = useUrlFilters({
  filters: { tab: activeTab },
  detail: {
    id: detailId,
    onOpen: async (id) => {
      try {
        const res = await fetch(`${cfg.apiUpdate}/${id}`, { headers: auth.authHeaders() })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.data) return
        populateForm(json.data)
        detailOpen.value = true
      } catch (e) {
        console.error('Failed to load STO:', e)
      }
    },
  },
})

onMounted(() => {
  initFromUrl()
})

async function saveTab(close) {
  if (!detailRow.value) return

  saving.value = true
  saveError.value = null

  try {
    const fields = close ? Object.values(TAB_FIELDS).flat() : TAB_FIELDS[activeTab.value]
    const payload = {}
    for (const f of fields) {
      payload[f] = f === 'phones'
        ? form.phones.map(normalizePhoneE164).filter((p) => p)
        : form[f]
    }

    const res = await fetch(`${cfg.apiUpdate}/${detailRow.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')

    originalForm = { ...form }
    listRef.value?.reload()

    if (close) {
      suppressUnsavedCheck = true
      detailOpen.value = false
    }
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}
</script>
