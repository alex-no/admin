<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="service-modal"
    :default-width="700"
    :min-width="550"
    :max-width="900"
    :default-height="600"
    :min-height="450"
    :max-height="800"
  >
    <template #title>
      <h6 class="mb-0">{{ modalMode === 'create' ? 'Нова послуга' : 'Редагування послуги' }}</h6>
    </template>

    <div class="row g-3">

      <div v-if="modalMode === 'edit'" class="col-sm-2">
        <label class="form-label small mb-1">ID</label>
        <div class="readonly-field">{{ modalData.id }}</div>
      </div>

      <!-- Group -->
      <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
        <label class="form-label small mb-1">Група <span class="text-danger">*</span></label>
        <select v-if="canEdit" v-model="modalForm.service_group_id" class="form-select form-select-sm">
          <option :value="null" disabled>— оберіть групу —</option>
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name_uk }}</option>
        </select>
        <div v-else class="readonly-field">{{ modalData.group_name ?? '—' }}</div>
      </div>

      <!-- Slug -->
      <div :class="modalMode === 'edit' ? 'col-sm-5' : 'col-sm-6'">
        <label class="form-label small mb-1">Slug <span class="text-danger">*</span></label>
        <input v-if="canEdit" v-model="modalForm.slug" type="text" class="form-control form-control-sm" />
        <div v-else class="readonly-field">{{ modalData.slug }}</div>
      </div>

      <!-- Names -->
      <div class="col-sm-12">
        <label class="form-label small mb-1">Назва [UA] <span class="text-danger">*</span></label>
        <input v-if="canEdit" v-model="modalForm.name_uk" type="text" class="form-control form-control-sm" />
        <div v-else class="readonly-field">{{ modalData.name_uk }}</div>
      </div>
      <div class="col-sm-6">
        <label class="form-label small mb-1">Назва [EN] <span class="text-danger">*</span></label>
        <input v-if="canEdit" v-model="modalForm.name_en" type="text" class="form-control form-control-sm" />
        <div v-else class="readonly-field">{{ modalData.name_en }}</div>
      </div>
      <div class="col-sm-6">
        <label class="form-label small mb-1">Назва [RU]</label>
        <input v-if="canEdit" v-model="modalForm.name_ru" type="text" class="form-control form-control-sm" />
        <div v-else class="readonly-field">{{ modalData.name_ru ?? '—' }}</div>
      </div>

      <template v-if="modalMode === 'edit'">
        <div class="col-sm-6">
          <label class="form-label small mb-1">Створено</label>
          <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
        </div>
        <div class="col-sm-6">
          <label class="form-label small mb-1">Оновлено</label>
          <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
        </div>
      </template>

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
import { ref, computed, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'

const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  },
  filterGroup: {
    type: Number,
    default: null
  }
})

const API = '/api/admin/catalog/services'

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)

const canEdit = computed(() => can('catalog.services.edit') || can('catalog.services.create'))

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає close() нижче —
// тому подія "closed" винесена сюди, в один watcher на будь-яке закриття.
watch(visible, (val, wasVisible) => {
  if (wasVisible && !val) {
    window.dispatchEvent(new CustomEvent('service-edit-closed'))
  }
})

const emptyForm = () => ({
  service_group_id: props.filterGroup,
  slug: '', name_uk: '', name_en: '', name_ru: '',
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
    service_group_id: row.service_group_id,
    slug: row.slug, name_uk: row.name_uk, name_en: row.name_en, name_ru: row.name_ru ?? '',
  }
  saveError.value = null
  visible.value = true
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    if (!modalForm.value.service_group_id) { saveError.value = 'Оберіть групу послуг'; return }
    if (!modalForm.value.slug?.trim())     { saveError.value = 'Вкажіть slug'; return }
    if (!modalForm.value.name_uk?.trim())  { saveError.value = 'Вкажіть назву [UA]'; return }
    if (!modalForm.value.name_en?.trim())  { saveError.value = 'Вкажіть назву [EN]'; return }

    const payload = {
      service_group_id: modalForm.value.service_group_id,
      slug:    modalForm.value.slug.trim(),
      name_uk: modalForm.value.name_uk.trim(),
      name_en: modalForm.value.name_en.trim(),
      name_ru: modalForm.value.name_ru?.trim() ?? '',
    }

    if (modalMode.value === 'create') {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('service-created', { detail: json.data }))
    } else {
      const res = await fetch(`${API}/${modalData.value.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
      window.dispatchEvent(new CustomEvent('service-updated', { detail: { id: modalData.value.id, data: json.data } }))
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
  window.addEventListener('open-service-create', () => {
    openCreate()
  })
  window.addEventListener('open-service-edit', (e) => {
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
