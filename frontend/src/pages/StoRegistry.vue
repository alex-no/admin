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
