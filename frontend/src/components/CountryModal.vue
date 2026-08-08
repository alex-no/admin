<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="country-modal-settings-v2"
    mode="docked-right"
    :default-width="600"
    :min-width="400"
    :max-width="1200"
    :default-height="400"
    :min-height="300"
    :max-height="800"
  >
    <template #title>
      <h5 class="mb-0">{{ modalMode === 'create' ? t('countries.newTitle') : t('countries.editTitle') }}</h5>
    </template>

    <div v-if="saveError" class="alert alert-danger small mb-3">{{ saveError }}</div>
    <div class="row g-3">
      <template v-for="mf in cfg.modal" :key="mf.key">
        <div :class="`col-sm-${mf.col}`">
          <template v-if="mf.key.startsWith('_')"></template>
          <label v-else class="form-label small mb-1"
                 :class="{ 'text-muted': cfg.fields[mf.key].type === 'integer' || cfg.fields[mf.key].type === 'datetime' }">
            {{ fieldLabel(mf.key) }}
          </label>

          <template v-if="mf.key.startsWith('_')"><!-- spacer --></template>

          <template v-else-if="mf.key === 'id'">
            <div class="readonly-field text-muted">{{ modalMode === 'edit' ? modalData.id : '—' }}</div>
          </template>

          <template v-else-if="mf.key === 'is_active'">
            <div v-if="canEditInModal('is_active')" class="form-check form-switch mt-1 mb-0">
              <input v-model="modalForm.is_active" type="checkbox" class="form-check-input" id="modal-active" role="switch" />
              <label class="form-check-label" for="modal-active">{{ modalForm.is_active ? t('geography.activeFeminine') : t('geography.inactiveFeminine') }}</label>
            </div>
            <div v-else>
              <span class="badge" :class="modalData.is_active ? 'bg-success' : 'bg-danger'">
                {{ modalData.is_active ? t('geography.activeFeminine') : t('geography.inactiveFeminine') }}
              </span>
            </div>
          </template>

          <template v-else-if="cfg.fields[mf.key].type === 'datetime'">
            <div class="readonly-field text-muted small">{{ modalMode === 'edit' ? (modalData[mf.key] ?? '—') : '—' }}</div>
          </template>

          <template v-else>
            <input
              v-if="canEditInModal(mf.key)"
              v-model="modalForm[mf.key]"
              :type="cfg.fields[mf.key].type === 'number' ? 'number' : 'text'"
              class="form-control form-control-sm"
              :maxlength="cfg.fields[mf.key].maxlength ?? undefined"
            />
            <div v-else class="readonly-field">{{ modalData[mf.key] ?? '—' }}</div>
          </template>
        </div>
      </template>
    </div>

    <template #footer>
      <div></div>
      <div class="d-flex gap-2">
        <button class="btn btn-secondary btn-sm" @click="close">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('common.save') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import BaseModal from './BaseModal.vue'
import cfg from '@/pages/geography/countries.config.json'

const { t } = useI18n({ useScope: 'global' })
const { can, authHeaders } = useAuth()

const FIELD_LABEL_KEYS = {
  id: 'table.id',
  order_num: 'geography.orderNumLabel',
  name_uk: 'cityTmpReview.nameUaLabel',
  name_en: 'cityTmpReview.nameEnBracketLabel',
  name_ru: 'cityTmpReview.nameRuBracketLabel',
  currency_code: 'geography.currencyLabel',
  is_active: 'filter.status',
  created_at: 'stoList.createdLabel',
  updated_at: 'stoList.updatedLabel',
}
function fieldLabel(key) {
  const k = FIELD_LABEL_KEYS[key]
  return k ? t(k) : cfg.fields[key]?.label ?? key
}

// Component state
const visible = ref(false)
const modalMode = ref('edit')
const modalData = ref({})
const modalForm = ref({})
const saving = ref(false)
const saveError = ref(null)

// Permissions
function canEditInModal(key) {
  const field = cfg.fields[key]
  if (!field?.editable) return false
  const perms = modalMode.value === 'create' ? field.createPermissions : field.editPermissions
  return perms?.some(p => can(p)) ?? false
}

// API helpers
async function patch(id, fields) {
  const res = await fetch(`${cfg.apiUpdate}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? t('list.saveError'))
  return json.data
}

// Modal actions
function openCreate() {
  modalMode.value = 'create'
  modalData.value = {}
  const form = {}
  for (const [key, field] of Object.entries(cfg.fields)) {
    if (field.editable) form[key] = 'default' in field ? field.default : ''
  }
  modalForm.value = form
  saveError.value = null
  visible.value = true
}

function openEdit(country) {
  modalMode.value = 'edit'
  modalData.value = { ...country }
  const form = {}
  for (const [key, field] of Object.entries(cfg.fields)) {
    if (field.editable) form[key] = country[key] ?? null
  }
  modalForm.value = form
  saveError.value = null
  visible.value = true
}

function close() {
  visible.value = false
}

async function save() {
  saving.value = true
  saveError.value = null
  try {
    const fields = {}
    for (const [key, field] of Object.entries(cfg.fields)) {
      if (field.editable && canEditInModal(key)) fields[key] = modalForm.value[key]
    }

    if (modalMode.value === 'create') {
      const res = await fetch(cfg.apiCreate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(fields),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? t('common.error'))

      // Dispatch event to notify parent
      window.dispatchEvent(new CustomEvent('country-created', { detail: json.data }))
    } else {
      const updated = await patch(modalData.value.id, fields)
      // Dispatch event to notify parent
      window.dispatchEvent(new CustomEvent('country-updated', { detail: updated }))
    }
    close()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// Event listeners
onMounted(() => {
  window.addEventListener('open-country-create', openCreate)
  window.addEventListener('open-country-edit', (e) => {
    if (e.detail?.country) openEdit(e.detail.country)
  })
})

onUnmounted(() => {
  window.removeEventListener('open-country-create', openCreate)
  window.removeEventListener('open-country-edit', openEdit)
})
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
