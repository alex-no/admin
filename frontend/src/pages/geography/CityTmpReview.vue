<template>
  <BaseLayout>
    <div class="d-flex align-items-center gap-2 mb-3">
      <h5 class="mb-0">Обробка нових населених пунктів</h5>
      <span v-if="!loading && total" class="badge bg-warning text-dark">{{ total }}</span>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-else-if="!items.length" class="alert alert-success">
      <i class="bi bi-check-circle me-2"></i>Немає записів для обробки
    </div>

    <div v-else>
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:50px" class="text-end">ID</th>
                <th>Назва (чернетка)</th>
                <th>Країна</th>
                <th>Вихідні дані</th>
                <th style="width:120px">Дата</th>
                <th style="width:100px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id">
                <td class="text-muted text-end">{{ row.id }}</td>
                <td class="fw-semibold">{{ row.name_uk }}</td>
                <td class="text-muted">{{ row.country_name }}</td>
                <td class="text-muted small">{{ addrPreview(row.addr_data) }}</td>
                <td class="text-muted">{{ formatDateShort(row.created_at) }}</td>
                <td>
                  <button class="btn btn-sm btn-primary" @click="openModal(row)">
                    <i class="bi bi-pencil-square me-1"></i>Обробити
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">Всього: {{ total }}</span>
        <nav v-if="totalPages > 1">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: page === 1 }">
              <button class="page-link" @click="load(page - 1)">‹</button>
            </li>
            <li v-for="p in totalPages" :key="p" class="page-item" :class="{ active: p === page }">
              <button class="page-link" @click="load(p)">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: page === totalPages }">
              <button class="page-link" @click="load(page + 1)">›</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Review Modal -->
    <Teleport to="body">
      <template v-if="modalOpen">
        <div class="modal show d-block" tabindex="-1" @click.self="closeModal">
          <div class="modal-dialog modal-xl">
            <div class="modal-content">

              <div class="modal-header">
                <h5 class="modal-title">
                  Обробка: <span class="text-primary">{{ modalRow?.name_uk }}</span>
                  <span class="badge bg-secondary ms-2 fw-normal small">city_tmp #{{ modalRow?.id }}</span>
                </h5>
                <button type="button" class="btn-close" @click="closeModal"></button>
              </div>

              <div class="modal-body">
                <div v-if="modalLoading" class="text-center py-4">
                  <div class="spinner-border text-primary" role="status"></div>
                </div>
                <div v-else class="row g-3">

                  <!-- Left: reference data -->
                  <div class="col-md-4">
                    <div class="card border bg-light h-100">
                      <div class="card-header py-2 fw-semibold small">
                        <i class="bi bi-info-circle me-1"></i>Вихідні дані (з форми СТО)
                      </div>
                      <div class="card-body p-2">
                        <table class="table table-sm small mb-0">
                          <tbody>
                            <tr>
                              <td class="text-muted" style="width:40%">Назва</td>
                              <td>{{ fullData?.addr_data?.city_name || fullData?.name_uk || '—' }}</td>
                            </tr>
                            <tr>
                              <td class="text-muted">Тип НП</td>
                              <td>{{ fullData?.city_type_name || fullData?.addr_data?.city_type_text || '—' }}</td>
                            </tr>
                            <tr>
                              <td class="text-muted">Область</td>
                              <td>{{ fullData?.addr_data?.region_text || fullData?.area_region_name || '—' }}</td>
                            </tr>
                            <tr>
                              <td class="text-muted">Район</td>
                              <td>{{ fullData?.addr_data?.district_text || '—' }}</td>
                            </tr>
                            <tr>
                              <td class="text-muted">Адреса</td>
                              <td>{{ fullData?.address_record?.address_detail || '—' }}</td>
                            </tr>
                            <tr v-if="fullData?.address_record?.description">
                              <td class="text-muted">Опис</td>
                              <td>{{ fullData.address_record.description }}</td>
                            </tr>
                            <tr>
                              <td class="text-muted">СТО ID</td>
                              <td>{{ fullData?.addr_data?.sto_id ?? '—' }}</td>
                            </tr>
                            <tr>
                              <td class="text-muted">Address ID</td>
                              <td>{{ fullData?.addr_data?.address_id ?? '—' }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <!-- Right: edit form -->
                  <div class="col-md-8">

                    <!-- City fields -->
                    <div class="row g-2">

                      <div class="col-sm-5">
                        <label class="form-label small mb-1">Країна <span class="text-danger">*</span></label>
                        <select v-model.number="cityForm.country_id" class="form-select form-select-sm">
                          <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
                        </select>
                      </div>

                      <div class="col-sm-5">
                        <label class="form-label small mb-1">Тип населеного пункту</label>
                        <select v-model.number="cityForm.city_type_id" class="form-select form-select-sm">
                          <option :value="null">— не вказано —</option>
                          <option v-for="t in modalCityTypesList" :key="t.id" :value="t.id">
                            {{ t.short_name_uk }} – {{ t.long_name_uk }}
                          </option>
                        </select>
                      </div>

                      <div class="col-sm-2 d-flex align-items-end">
                        <div class="form-check mb-1">
                          <input v-model="cityForm.is_capital" type="checkbox" class="form-check-input" id="tmp-capital" />
                          <label class="form-check-label small" for="tmp-capital">Столиця</label>
                        </div>
                      </div>

                      <!-- Oblast → District cascade (col-12) -->
                      <div class="col-sm-12">
                        <div class="row g-2">
                          <div class="col-sm-6">
                            <label class="form-label small mb-1">Область</label>
                            <select v-model.number="modalFilterArea" class="form-select form-select-sm">
                              <option :value="null">— не вказано —</option>
                              <option v-for="a in modalAreasList" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
                            </select>
                          </div>
                          <div class="col-sm-6">
                            <label class="form-label small mb-1">Район</label>
                            <select v-if="modalFilterArea" v-model.number="cityForm.area_region_id" class="form-select form-select-sm">
                              <option :value="null">— не вказано —</option>
                              <option v-for="d in modalDistrictsList" :key="d.id" :value="d.id">{{ d.name_uk }}</option>
                            </select>
                            <div v-else class="readonly-field text-muted small fst-italic">спочатку оберіть область</div>
                          </div>
                        </div>
                      </div>

                      <div class="col-sm-12">
                        <label class="form-label small mb-1">Назва [UA] <span class="text-danger">*</span></label>
                        <input v-model="cityForm.name_uk" type="text" class="form-control form-control-sm" />
                      </div>
                      <div class="col-sm-6">
                        <label class="form-label small mb-1">Назва [EN]</label>
                        <input v-model="cityForm.name_en" type="text" class="form-control form-control-sm" />
                      </div>
                      <div class="col-sm-6">
                        <label class="form-label small mb-1">Назва [RU]</label>
                        <input v-model="cityForm.name_ru" type="text" class="form-control form-control-sm" />
                      </div>
                      <div class="col-sm-6">
                        <label class="form-label small mb-1">Широта</label>
                        <input v-model="cityForm.latitude" type="number" step="any" class="form-control form-control-sm" />
                      </div>
                      <div class="col-sm-6">
                        <label class="form-label small mb-1">Довгота</label>
                        <input v-model="cityForm.longitude" type="number" step="any" class="form-control form-control-sm" />
                      </div>
                    </div>

                    <!-- Address fields -->
                    <hr class="my-3" />
                    <p class="small fw-semibold mb-2">Адреса (таблиця address)</p>
                    <div class="row g-2">
                      <div class="col-sm-12">
                        <label class="form-label small mb-1">Деталі адреси</label>
                        <input v-model="addressForm.address_detail" type="text" class="form-control form-control-sm" placeholder="вул. Шевченка, 5" />
                      </div>
                      <div class="col-sm-12">
                        <label class="form-label small mb-1">Опис</label>
                        <input v-model="addressForm.description" type="text" class="form-control form-control-sm" placeholder="Поруч з АТБ" />
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="saveError" class="alert alert-danger mt-3 mb-0">{{ saveError }}</div>
              </div>

              <div class="modal-footer">
                <button class="btn btn-outline-secondary me-auto" :disabled="saving" @click="dismissRow">
                  <i class="bi bi-x-circle me-1"></i>Відхилити (прибрати з черги)
                </button>
                <button class="btn btn-secondary" @click="closeModal">Скасувати</button>
                <button class="btn btn-success" :disabled="saving || modalLoading" @click="approveModal">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check-circle me-1"></i>Затвердити та активувати
                </button>
              </div>

            </div>
          </div>
        </div>
        <div class="modal-backdrop show"></div>
      </template>
    </Teleport>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { formatDateShort } from '@/utils/date'

const { authHeaders } = useAuth()

const API = '/api/admin/geography/city-tmp'

// ── List state ────────────────────────────────────────────────────────────────
const items      = ref([])
const loading    = ref(true)
const error      = ref(null)
const page       = ref(1)
const total      = ref(0)
const totalPages = ref(1)

// ── Reference data (loaded once) ──────────────────────────────────────────────
const countriesList    = ref([])
const areaRegionsList  = ref([])
const allDistrictsList = ref([])
const cityTypesList    = ref([])
const countryCityTypeMap = ref([])

// ── Modal state ───────────────────────────────────────────────────────────────
const modalOpen    = ref(false)
const modalLoading = ref(false)
const modalRow     = ref(null)   // list-level row (for header display)
const fullData     = ref(null)   // fully loaded record with address_record

const cityForm = ref({
  country_id: null, city_type_id: null, area_region_id: null,
  name_uk: '', name_en: '', name_ru: '',
  latitude: null, longitude: null, is_capital: false,
})
const addressForm = ref({ address_detail: '', description: '' })
const modalFilterArea = ref(null)

const saving    = ref(false)
const saveError = ref(null)

// ── Cascade computed ──────────────────────────────────────────────────────────
const modalAreasList = computed(() =>
  areaRegionsList.value.filter(a =>
    !cityForm.value.country_id || a.country_id === cityForm.value.country_id
  )
)
const modalDistrictsList = computed(() =>
  allDistrictsList.value.filter(d => d.region_in_area_id === modalFilterArea.value)
)
const modalCityTypesList = computed(() => {
  if (!cityForm.value.country_id) return cityTypesList.value
  const allowed = new Set(
    countryCityTypeMap.value
      .filter(r => r.country_id === cityForm.value.country_id)
      .map(r => r.city_type_id)
  )
  return allowed.size > 0 ? cityTypesList.value.filter(t => allowed.has(t.id)) : cityTypesList.value
})

watch(() => cityForm.value.country_id, () => {
  modalFilterArea.value          = null
  cityForm.value.area_region_id  = null
})
watch(modalFilterArea, (_, oldVal) => {
  if (oldVal !== null) cityForm.value.area_region_id = null
})

// ── List ──────────────────────────────────────────────────────────────────────
async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const res  = await fetch(`${API}?per_page=50&page=${p}`, { headers: authHeaders() })
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

// ── Modal ─────────────────────────────────────────────────────────────────────
async function openModal(row) {
  modalRow.value   = row
  fullData.value   = null
  saveError.value  = null
  modalOpen.value  = true
  modalLoading.value = true
  document.body.classList.add('modal-open')

  try {
    const res  = await fetch(`${API}/${row.id}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка завантаження')
    const d = json.data
    fullData.value = d

    cityForm.value = {
      country_id:    d.country_id     ?? null,
      city_type_id:  d.city_type_id   ?? null,
      area_region_id: d.area_region_id ?? null,
      name_uk:       d.name_uk        ?? '',
      name_en:       d.name_en        ?? '',
      name_ru:       d.name_ru        ?? '',
      latitude:      d.latitude       ?? null,
      longitude:     d.longitude      ?? null,
      is_capital:    d.is_capital     ?? false,
    }
    addressForm.value = {
      address_detail: d.address_record?.address_detail ?? '',
      description:    d.address_record?.description    ?? '',
    }

    // Restore cascade state
    await nextTick()  // flush country_id watcher
    if (d.area_region_id) {
      const district = allDistrictsList.value.find(x => x.id === d.area_region_id)
      if (district) {
        modalFilterArea.value = district.region_in_area_id ?? null
      } else {
        const oblast = areaRegionsList.value.find(x => x.id === d.area_region_id)
        modalFilterArea.value          = oblast?.id ?? null
        cityForm.value.area_region_id  = null
      }
      await nextTick()  // flush modalFilterArea watcher
      if (district) cityForm.value.area_region_id = d.area_region_id
    } else {
      modalFilterArea.value = null
    }
  } catch (e) {
    saveError.value = e.message
  } finally {
    modalLoading.value = false
  }
}

function closeModal() {
  modalOpen.value = false
  document.body.classList.remove('modal-open')
}

async function approveModal() {
  saveError.value = null
  if (!cityForm.value.name_uk?.trim()) {
    saveError.value = 'Назва [UA] є обовʼязковою'
    return
  }
  if (!cityForm.value.country_id) {
    saveError.value = 'Оберіть країну'
    return
  }

  saving.value = true
  try {
    // Resolve area_region_id: district if selected, else oblast from filter
    const areaRegionId = cityForm.value.area_region_id ?? (modalFilterArea.value ?? null)

    const res  = await fetch(`${API}/${modalRow.value.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        ...cityForm.value,
        area_region_id:  areaRegionId,
        address_detail:  addressForm.value.address_detail,
        description:     addressForm.value.description,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')

    items.value = items.value.filter(r => r.id !== modalRow.value.id)
    total.value--
    closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

async function dismissRow() {
  if (!confirm('Прибрати запис з черги? Чернетка міста залишиться неактивною.')) return
  saving.value = true
  try {
    const res  = await fetch(`${API}/${modalRow.value.id}`, { method: 'DELETE', headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    items.value = items.value.filter(r => r.id !== modalRow.value.id)
    total.value--
    closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function addrPreview(d) {
  const parts = []
  if (d?.city_name)      parts.push(d.city_name)
  if (d?.region_text)    parts.push(d.region_text)
  if (d?.district_text)  parts.push(d.district_text)
  if (d?.city_type_text) parts.push(`(${d.city_type_text})`)
  return parts.join(', ') || '—'
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  const h = { headers: authHeaders() }
  const [cRes, arRes, distRes, ctRes, ctMapRes] = await Promise.all([
    fetch('/api/admin/geography/countries?per_page=300&status=active', h),
    fetch('/api/admin/geography/areas?per_page=1000&status=all',       h),
    fetch('/api/admin/geography/districts?per_page=2000&status=all',   h),
    fetch('/api/admin/geography/city-types?per_page=500',              h),
    fetch('/api/admin/geography/country-city-types',                   h),
  ])
  countriesList.value      = (await cRes.json()).data      ?? []
  areaRegionsList.value    = (await arRes.json()).data     ?? []
  allDistrictsList.value   = (await distRes.json()).data   ?? []
  cityTypesList.value      = (await ctRes.json()).data     ?? []
  countryCityTypeMap.value = (await ctMapRes.json()).data  ?? []
  load()
})
</script>

<style scoped>
.readonly-field {
  padding: 4px 8px; background: #f8f9fa;
  border: 1px solid #dee2e6; border-radius: 4px;
  min-height: 31px; line-height: 1.4;
}
</style>
