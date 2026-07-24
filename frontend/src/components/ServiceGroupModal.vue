<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="service-group-modal"
    :default-width="600"
    :min-width="450"
    :max-width="800"
    :default-height="500"
    :min-height="350"
    :max-height="700"
  >
    <template #title>
      <h6 class="mb-0">{{ modalMode === 'create' ? 'Нова група послуг' : 'Редагування групи' }}</h6>
    </template>

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
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'
import config from '../pages/catalog/service-groups.config.json'

const { can, authHeaders } = useAuth()

// Props
const props = defineProps({
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

const emptyForm = () => ({ slug: '', name_uk: '', name_en: '', name_ru: '' })

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
  modalForm.value = { slug: row.slug, name_uk: row.name_uk, name_en: row.name_en, name_ru: row.name_ru }
  saveError.value = null
  visible.value = true
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
  saving.value = true
  saveError.value = null
  try {
    const fields = {}
    for (const key of Object.keys(emptyForm())) {
      if (canEditInModal(key)) fields[key] = modalForm.value[key]
    }

    if (modalMode.value === 'create') {
      const res = await fetch(config.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка')
      window.dispatchEvent(new CustomEvent('service-group-created', { detail: json.data }))
    } else {
      const updated = await patch(modalData.value.id, fields)
      window.dispatchEvent(new CustomEvent('service-group-updated', { detail: { id: modalData.value.id, data: updated } }))
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
  window.addEventListener('open-service-group-create', () => {
    openCreate()
  })
  window.addEventListener('open-service-group-edit', (e) => {
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
