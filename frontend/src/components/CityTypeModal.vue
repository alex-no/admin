<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="city-type-modal"
    :default-width="900"
    :min-width="700"
    :max-width="1200"
    :default-height="650"
    :min-height="500"
    :max-height="850"
  >
    <template #title>
      <h6 class="mb-0">{{ modalMode === 'create' ? 'Новий тип населеного пункту' : 'Редагування типу' }}</h6>
    </template>

    <!-- Name fields -->
    <div class="row g-3">
      <template v-for="mf in config.modal" :key="mf.key">
        <div :class="`col-sm-${mf.col}`">
          <label class="form-label small mb-1">{{ config.fields[mf.key].label }}</label>

          <template v-if="mf.key === 'id'">
            <div v-if="modalMode === 'edit'" class="readonly-field">{{ modalData.id }}</div>
            <div v-else class="readonly-field text-muted">—</div>
          </template>

          <template v-else-if="config.fields[mf.key].type === 'datetime'">
            <div v-if="modalMode === 'edit'" class="readonly-field text-muted small">{{ modalData[mf.key] }}</div>
            <div v-else class="readonly-field text-muted">—</div>
          </template>

          <template v-else>
            <input
              v-if="canEditInModal(mf.key)"
              v-model="modalForm[mf.key]"
              type="text"
              class="form-control form-control-sm"
            />
            <div v-else class="readonly-field">{{ modalData[mf.key] ?? '—' }}</div>
          </template>
        </div>
      </template>
    </div>

    <!-- Country associations -->
    <hr class="my-3" />
    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="small fw-semibold">
        Країни
        <span v-if="canEditInModal('short_name_uk')" class="text-danger">*</span>
      </span>
      <span class="badge" :class="modalCountryIds.length ? 'bg-secondary' : 'bg-danger'">
        {{ modalCountryIds.length }}
      </span>
      <input
        v-model="countrySearch"
        type="text"
        class="form-control form-control-sm ms-auto"
        style="max-width:220px"
        placeholder="Пошук країни..."
      />
    </div>
    <div class="border rounded p-2" style="max-height:200px; overflow-y:auto">
      <div v-if="loadingCountries" class="text-center text-muted small py-2">
        <span class="spinner-border spinner-border-sm"></span>
      </div>
      <template v-else>
        <div
          v-for="c in filteredCountriesList" :key="c.id"
          class="form-check form-check-inline"
          style="min-width:170px"
        >
          <input
            :id="`ct-c-${c.id}`"
            v-model="modalCountryIds"
            :value="c.id"
            :disabled="!canEditInModal('short_name_uk')"
            type="checkbox"
            class="form-check-input"
          />
          <label :for="`ct-c-${c.id}`" class="form-check-label small">{{ c.name_uk }}</label>
        </div>
        <div v-if="!filteredCountriesList.length" class="text-muted small text-center py-2">
          Нічого не знайдено
        </div>
      </template>
    </div>

    <div v-if="saveError" class="alert alert-danger small mt-3 mb-0">{{ saveError }}</div>

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-secondary" @click="close">Скасувати</button>
        <button class="btn btn-sm btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          Зберегти
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'
import config from '../pages/geography/city-types.config.json'

const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
  countriesList: {
    type: Array,
    default: () => []
  },
  filterCountry: {
    type: Number,
    default: null
  },
  justCreatedIds: {
    type: Set,
    default: () => new Set()
  }
})

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const modalCountryIds = ref([])
const loadingCountries = ref(false)
const countrySearch = ref('')
const saving = ref(false)
const saveError = ref(null)

function canEditField(key) {
  const field = config.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

function canEditInModal(key) {
  const field = config.fields[key]
  if (!field?.editable) return false
  if (modalMode.value === 'create' || props.justCreatedIds.has(modalData.value.id)) {
    if (field.createPermissions) return field.createPermissions.some(p => can(p))
    return field.type !== 'integer' && field.type !== 'datetime'
  }
  return canEditField(key)
}

const filteredCountriesList = computed(() =>
  props.countriesList.filter(c =>
    !countrySearch.value ||
    c.name_uk.toLowerCase().includes(countrySearch.value.toLowerCase())
  )
)

const emptyForm = () => ({
  short_name_uk: '', short_name_en: '', short_name_ru: '',
  long_name_uk:  '', long_name_en:  '', long_name_ru:  '',
})

function openCreate() {
  modalMode.value       = 'create'
  modalData.value       = {}
  modalForm.value       = emptyForm()
  modalCountryIds.value = props.filterCountry ? [props.filterCountry] : []
  countrySearch.value   = ''
  saveError.value       = null
  visible.value         = true
}

async function openEdit(row) {
  modalMode.value   = 'edit'
  modalData.value   = { ...row }
  modalForm.value   = {
    short_name_uk: row.short_name_uk,
    short_name_en: row.short_name_en,
    short_name_ru: row.short_name_ru,
    long_name_uk:  row.long_name_uk,
    long_name_en:  row.long_name_en,
    long_name_ru:  row.long_name_ru,
  }
  modalCountryIds.value = []
  countrySearch.value   = ''
  saveError.value       = null
  visible.value         = true

  loadingCountries.value = true
  try {
    const res  = await fetch(`${config.apiList}/${row.id}/countries`, { headers: authHeaders() })
    const json = await res.json()
    modalCountryIds.value = json.data ?? []
  } catch {
    modalCountryIds.value = []
  } finally {
    loadingCountries.value = false
  }
}

async function patch(id, fields) {
  const res = await fetch(`${config.apiUpdate}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
  return json.data
}

async function save() {
  saving.value    = true
  saveError.value = null
  try {
    if (canEditInModal('short_name_uk') && modalCountryIds.value.length === 0) {
      saveError.value = 'Оберіть хоча б одну країну'
      saving.value = false
      return
    }
    const fields = {}
    for (const key of Object.keys(emptyForm())) {
      if (canEditInModal(key)) fields[key] = modalForm.value[key]
    }
    if (canEditInModal('short_name_uk')) {
      fields.country_ids = modalCountryIds.value
    }

    if (modalMode.value === 'create') {
      const res  = await fetch(config.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('city-type-created', { detail: json.data }))
    } else {
      const updated = await patch(modalData.value.id, fields)
      window.dispatchEvent(new CustomEvent('city-type-updated', { detail: { id: modalData.value.id, data: updated } }))
    }
    close()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

function close() {
  visible.value = false
}

onMounted(() => {
  window.addEventListener('open-city-type-create', () => {
    openCreate()
  })
  window.addEventListener('open-city-type-edit', (e) => {
    if (e.detail?.row) {
      openEdit(e.detail.row)
    }
  })
})

defineExpose({ openCreate, openEdit, close })
</script>

<style scoped>
.readonly-field {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}
</style>
