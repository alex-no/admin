<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="car-model-modal"
    :default-width="800"
    :min-width="600"
    :max-width="1000"
    :default-height="600"
    :min-height="450"
    :max-height="800"
  >
    <template #title>
      <h6 class="mb-0">{{ modalMode === 'create' ? t('carModels.newTitle') : t('carModels.editTitle') }}</h6>
    </template>

    <div class="row g-3">

      <div v-if="modalMode === 'edit'" class="col-sm-2">
        <label class="form-label small mb-1">{{ t('table.id') }}</label>
        <div class="readonly-field">{{ modalData.id }}</div>
      </div>

      <!-- Brand -->
      <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
        <label class="form-label small mb-1">{{ t('carModels.colBrand') }} <span class="text-danger">*</span></label>
        <select v-if="canEdit" v-model="modalForm.car_brand_id" class="form-select form-select-sm">
          <option :value="null" disabled>{{ t('carModels.selectBrandPlaceholder') }}</option>
          <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <div v-else class="readonly-field">{{ modalData.brand_name ?? '—' }}</div>
      </div>

      <!-- Vehicle Type -->
      <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
        <label class="form-label small mb-1">{{ t('carModels.colVehicleType') }} <span class="text-danger">*</span></label>
        <select v-if="canEdit" v-model="modalForm.vehicle_type_id" class="form-select form-select-sm">
          <option :value="null" disabled>{{ t('carModels.selectTypePlaceholder') }}</option>
          <option v-for="vt in vehicleTypes" :key="vt.id" :value="vt.id">{{ vt.name_uk }}</option>
        </select>
        <div v-else class="readonly-field">{{ modalData.vehicle_type_name ?? '—' }}</div>
      </div>

      <!-- Name -->
      <div class="col-sm-6">
        <label class="form-label small mb-1">{{ t('carModels.nameLabel') }} <span class="text-danger">*</span></label>
        <input v-if="canEdit" v-model="modalForm.name" type="text" class="form-control form-control-sm" :placeholder="t('carModels.namePlaceholderExample')" />
        <div v-else class="readonly-field">{{ modalData.name }}</div>
      </div>

      <!-- Generation -->
      <div class="col-sm-3">
        <label class="form-label small mb-1">{{ t('carModels.colGeneration') }}</label>
        <input v-if="canEdit" v-model="modalForm.generation" type="text" class="form-control form-control-sm" :placeholder="t('carModels.generationPlaceholderExample')" />
        <div v-else class="readonly-field">{{ modalData.generation ?? '—' }}</div>
      </div>

      <!-- Body type -->
      <div class="col-sm-3">
        <label class="form-label small mb-1">{{ t('carModels.colBodyType') }} <span class="text-danger">*</span></label>
        <select v-if="canEdit" v-model="modalForm.body_type" class="form-select form-select-sm">
          <option v-for="(label, val) in BODY_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
        </select>
        <div v-else class="readonly-field">{{ BODY_TYPE_LABELS[modalData.body_type] ?? modalData.body_type }}</div>
      </div>

      <!-- Production years -->
      <div class="col-sm-3">
        <label class="form-label small mb-1">{{ t('carModels.yearStartLabel') }}</label>
        <input v-if="canEdit" v-model="modalForm.production_start" type="number" min="1900" :max="new Date().getFullYear()" class="form-control form-control-sm" :placeholder="t('carModels.yearStartPlaceholder')" />
        <div v-else class="readonly-field">{{ modalData.production_start ?? '—' }}</div>
      </div>
      <div class="col-sm-3">
        <label class="form-label small mb-1">{{ t('carModels.yearEndLabel') }}</label>
        <input v-if="canEdit" v-model="modalForm.production_end" type="number" min="1900" :max="new Date().getFullYear() + 5" class="form-control form-control-sm" :placeholder="t('carModels.yearEndPlaceholder')" />
        <div v-else class="readonly-field">{{ modalData.production_end ?? t('catalog.presentDay') }}</div>
      </div>

      <!-- Timestamps (edit only) -->
      <template v-if="modalMode === 'edit'">
        <div class="col-sm-3">
          <label class="form-label small mb-1">{{ t('stoList.createdLabel') }}</label>
          <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
        </div>
        <div class="col-sm-3">
          <label class="form-label small mb-1">{{ t('stoList.updatedLabel') }}</label>
          <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
        </div>
      </template>

    </div>

    <div v-if="saveError" class="alert alert-danger small mt-3 mb-0">{{ saveError }}</div>

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-secondary" @click="close">{{ t('common.cancel') }}</button>
        <button v-if="canEdit" class="btn btn-sm btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('common.save') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'

const { t } = useI18n({ useScope: 'global' })
const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
  brands: {
    type: Array,
    default: () => []
  },
  vehicleTypes: {
    type: Array,
    default: () => []
  },
  filterBrand: {
    type: Number,
    default: null
  },
  filterVehicleType: {
    type: Number,
    default: null
  }
})

const BODY_TYPE_LABELS = computed(() => ({
  sedan:       t('catalog.bodyTypeSedan'),
  hatchback:   t('catalog.bodyTypeHatchback'),
  suv:         t('catalog.bodyTypeSuv'),
  coupe:       t('catalog.bodyTypeCoupe'),
  convertible: t('catalog.bodyTypeConvertible'),
  wagon:       t('catalog.bodyTypeWagon'),
  pickup:      t('catalog.bodyTypePickup'),
  van:         t('catalog.bodyTypeVan'),
  minivan:     t('catalog.bodyTypeMinivan'),
  other:       t('feedback.typeOther'),
}))

const API = '/api/admin/catalog/car-models'

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)

const canEdit = computed(() => can('catalog.car-models.edit') || can('catalog.car-models.create'))

const emptyForm = () => ({
  car_brand_id:    props.filterBrand,
  vehicle_type_id: props.filterVehicleType,
  name:            '',
  generation:      '',
  body_type:       'other',
  production_start: '',
  production_end:   '',
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
    car_brand_id:    row.car_brand_id,
    vehicle_type_id: row.vehicle_type_id,
    name:            row.name,
    generation:      row.generation ?? '',
    body_type:       row.body_type,
    production_start: row.production_start ?? '',
    production_end:   row.production_end   ?? '',
  }
  saveError.value = null
  visible.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    if (!modalForm.value.car_brand_id) {
      saveError.value = t('carModels.selectBrandError')
      return
    }
    if (!modalForm.value.vehicle_type_id) {
      saveError.value = t('carModels.selectTypeError')
      return
    }
    if (!modalForm.value.name?.trim()) {
      saveError.value = t('carModels.nameRequiredError')
      return
    }

    const payload = {
      car_brand_id:    modalForm.value.car_brand_id,
      vehicle_type_id: modalForm.value.vehicle_type_id,
      name:            modalForm.value.name.trim(),
      generation:      modalForm.value.generation?.trim() || null,
      body_type:       modalForm.value.body_type || 'other',
      production_start: modalForm.value.production_start || null,
      production_end:   modalForm.value.production_end   || null,
    }

    if (modalMode.value === 'create') {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? t('common.error'))
      window.dispatchEvent(new CustomEvent('car-model-created', { detail: json.data }))
    } else {
      const res = await fetch(`${API}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? t('list.saveError'))
      window.dispatchEvent(new CustomEvent('car-model-updated', { detail: { id: modalData.value.id, data: json.data } }))
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
  window.addEventListener('open-car-model-create', () => {
    openCreate()
  })
  window.addEventListener('open-car-model-edit', (e) => {
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
  background: var(--bs-secondary-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}
</style>
