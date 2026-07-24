<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="car-brand-modal"
    :default-width="600"
    :min-width="450"
    :max-width="800"
    :default-height="550"
    :min-height="400"
    :max-height="750"
  >
    <template #title>
      <h6 class="mb-0">{{ modalMode === 'create' ? 'Нова марка авто' : 'Редагування марки' }}</h6>
    </template>

    <div v-if="modalMode === 'edit'" class="mb-3">
      <label class="form-label small mb-1">ID</label>
      <div class="readonly-field">{{ modalData.id }}</div>
    </div>

    <div class="mb-3">
      <label class="form-label small mb-1">Країна <span class="text-danger">*</span></label>
      <select v-if="canEdit" v-model="modalForm.country_id" class="form-select form-select-sm">
        <option :value="null" disabled>— оберіть країну —</option>
        <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
      </select>
      <div v-else class="readonly-field">{{ modalData.country_name ?? '—' }}</div>
    </div>

    <div class="mb-3">
      <label class="form-label small mb-1">Назва <span class="text-danger">*</span></label>
      <input v-if="canEdit" v-model="modalForm.name" type="text" class="form-control form-control-sm" />
      <div v-else class="readonly-field">{{ modalData.name }}</div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-sm-4">
        <label class="form-label small mb-1">Рік заснування</label>
        <input
          v-if="canEdit"
          v-model.number="modalForm.founded_year"
          type="number"
          min="1800"
          :max="new Date().getFullYear()"
          class="form-control form-control-sm"
          placeholder="напр. 1937"
        />
        <div v-else class="readonly-field">{{ modalData.founded_year ?? '—' }}</div>
      </div>
      <div class="col-sm-8">
        <label class="form-label small mb-1">Сайт</label>
        <input v-if="canEdit" v-model="modalForm.website" type="text" class="form-control form-control-sm" placeholder="https://..." />
        <div v-else class="readonly-field">{{ modalData.website ?? '—' }}</div>
      </div>
    </div>

    <div v-if="modalMode === 'edit'" class="row g-3">
      <div class="col-sm-6">
        <label class="form-label small mb-1">Створено</label>
        <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
      </div>
      <div class="col-sm-6">
        <label class="form-label small mb-1">Оновлено</label>
        <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
      </div>
    </div>

    <div v-if="saveError" class="alert alert-danger small mt-3 mb-0">{{ saveError }}</div>

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-secondary" @click="close">Скасувати</button>
        <button v-if="canEdit" class="btn btn-sm btn-primary" :disabled="saving" @click="save">
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
import config from '../pages/catalog/car-brands.config.json'

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
  }
})

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)

const canEdit = computed(() => can('catalog.car-brands.edit') || can(config.createPermission))

const emptyForm = () => ({
  country_id: props.filterCountry,
  name: '',
  founded_year: null,
  website: '',
})

function openCreate() {
  modalMode.value = 'create'
  modalData.value = {}
  modalForm.value = emptyForm()
  saveError.value = null
  visible.value = true
}

function openEdit(row) {
  modalMode.value = 'edit'
  modalData.value = { ...row }
  modalForm.value = {
    country_id: row.country_id,
    name: row.name,
    founded_year: row.founded_year,
    website: row.website ?? '',
  }
  saveError.value = null
  visible.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    if (!modalForm.value.country_id) {
      saveError.value = 'Оберіть країну'
      return
    }
    if (!modalForm.value.name?.trim()) {
      saveError.value = 'Вкажіть назву марки'
      return
    }

    const payload = {
      country_id: modalForm.value.country_id,
      name: modalForm.value.name.trim(),
      founded_year: modalForm.value.founded_year || null,
      website: modalForm.value.website?.trim() || null,
    }

    if (modalMode.value === 'create') {
      const res = await fetch(config.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('car-brand-created', { detail: json.data }))
    } else {
      const res = await fetch(`${config.apiUpdate}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
      window.dispatchEvent(new CustomEvent('car-brand-updated', { detail: { id: modalData.value.id, data: json.data } }))
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
  // Listen for events from parent
  window.addEventListener('open-car-brand-create', () => {
    openCreate()
  })
  window.addEventListener('open-car-brand-edit', (e) => {
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
