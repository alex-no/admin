<template>
  <CountryModal />
  <ListPageWrapper>
    <div>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex align-items-center gap-2">
        <h5 class="mb-0">{{ t('countries.title') }}</h5>
        <button v-if="canCreate" class="btn btn-sm btn-success" @click="openCreateModal">
          <i class="bi bi-plus-lg"></i> {{ t('common.add') }}
        </button>
      </div>
      <select v-model="statusFilter" class="form-select form-select-sm" style="width:auto" @change="load(1)">
        <option value="all">{{ t('common.all') }}</option>
        <option value="active">{{ t('filter.active') }}</option>
        <option value="inactive">{{ t('filter.inactive') }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead>
              <tr>
                <th
                  v-for="col in cfg.table"
                  :key="col.key"
                  :style="col.width ? `width:${col.width}px` : ''"
                  :class="[
                    col.align === 'end' ? 'text-end' : '',
                    col.sortable ? 'th-sortable' : ''
                  ]"
                  @click="col.sortable ? toggleSort(col.key) : null"
                >
                  {{ fieldLabel(col.key) }}
                  <template v-if="col.sortable">
                    <i v-if="sortKey === col.key && sortDir === 'asc'"  class="bi bi-chevron-up   ms-1"></i>
                    <i v-else-if="sortKey === col.key && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
                    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                  </template>
                </th>
                <th style="width:60px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in countries" :key="c.id">
                <td class="text-muted text-end">{{ c.id }}</td>
                <td class="text-end">
                  <template v-if="canEdit('order_num')">
                    <input
                      v-if="inlineCell?.id === c.id && inlineCell?.field === 'order_num'"
                      :ref="el => { if (el) el.focus() }"
                      :value="inlineValue"
                      type="number"
                      class="form-control form-control-sm text-end"
                      style="width:55px"
                      @input="inlineValue = $event.target.value"
                      @blur="saveInline(c, 'order_num')"
                      @keydown.enter.prevent="saveInline(c, 'order_num')"
                      @keydown.escape="cancelInline"
                    />
                    <span
                      v-else
                      class="inline-editable text-end"
                      @click="startInline(c.id, 'order_num', c.order_num)"
                    >{{ c.order_num ?? '—' }}</span>
                  </template>
                  <template v-else>
                    <span class="text-muted">{{ c.order_num ?? '—' }}</span>
                  </template>
                </td>
                <!-- Назви: inline-редагування якщо є право -->
                <td v-for="field in ['name_uk', 'name_en', 'name_ru']" :key="field">
                  <template v-if="canEditNames">
                    <input
                      v-if="inlineCell?.id === c.id && inlineCell?.field === field"
                      :ref="el => { if (el) el.focus() }"
                      :value="inlineValue"
                      class="form-control form-control-sm"
                      @input="inlineValue = $event.target.value"
                      @blur="saveInline(c, field)"
                      @keydown.enter.prevent="saveInline(c, field)"
                      @keydown.escape="cancelInline"
                    />
                    <span
                      v-else
                      class="inline-editable"
                      @click="startInline(c.id, field, c[field])"
                    >{{ c[field] }}</span>
                  </template>
                  <template v-else>{{ c[field] }}</template>
                </td>
                <td class="text-muted">{{ c.iso3 }}</td>
                <td>
                  <button
                    v-if="canEditStatus"
                    class="badge border-0 btn p-1"
                    :class="c.is_active ? 'bg-success' : 'bg-danger'"
                    :disabled="togglingId === c.id"
                    @click="toggleStatus(c)"
                  >
                    <span v-if="togglingId === c.id" class="spinner-border spinner-border-sm"></span>
                    <span v-else>{{ c.is_active ? t('geography.activeFeminine') : t('geography.inactiveFeminine') }}</span>
                  </button>
                  <span v-else class="badge" :class="c.is_active ? 'bg-success' : 'bg-danger'">
                    {{ c.is_active ? t('geography.activeFeminine') : t('geography.inactiveFeminine') }}
                  </span>
                </td>
                <td class="text-nowrap">
                  <button
                    v-if="canOpenModal || justCreatedIds.has(c.id)"
                    class="btn btn-sm btn-outline-secondary me-1"
                    :title="t('common.edit')"
                    @click="openModal(c)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    v-if="canDelete"
                    class="btn btn-sm btn-outline-danger"
                    :title="t('common.delete')"
                    @click="deleteRow(c)"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!countries.length">
                <td colspan="8" class="text-center text-muted py-4">{{ t('common.noData') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">{{ t('analytics.totalCount', { value: total }) }}</span>
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
    </div>
  </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import CountryModal from '@/components/CountryModal.vue'
import { useAuth } from '@/composables/useAuth'
import { useNotify } from '@/composables/useNotify'
import { useUndoableDelete } from '@/composables/useUndoableDelete'
import cfg from './countries.config.json'

const { t } = useI18n({ useScope: 'global' })
const { can, authHeaders } = useAuth()
const { notify } = useNotify()
const { deleteWithUndo } = useUndoableDelete()

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

// Permissions
const canCreate     = computed(() => can(cfg.createPermission))
const canDelete     = computed(() => can(cfg.deletePermission))
const canEditNames  = computed(() => can('geography.countries.edit.names') || can('geography.countries.edit') || can('*'))
const canEditStatus = computed(() => can('geography.countries.edit.status') || can('geography.countries.edit') || can('*'))

function canEdit(key) {
  const field = cfg.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

const canOpenModal = computed(() =>
  Object.keys(cfg.fields).some(k => canEdit(k))
)

// List state
const countries      = ref([])
const loading        = ref(true)
const error          = ref(null)
const page           = ref(1)
const total          = ref(0)
const totalPages     = ref(1)
const statusFilter   = ref('all')
const sortKey        = ref(null)
const sortDir        = ref('asc')
const togglingId     = ref(null)
const justCreatedIds = ref(new Set())

// Inline editing
const inlineCell  = ref(null)
const inlineValue = ref('')
const inlineOrig  = ref('')

function toggleSort(key) {
  if (sortKey.value !== key) {
    sortKey.value = key
    sortDir.value = 'asc'
  } else if (sortDir.value === 'asc') {
    sortDir.value = 'desc'
  } else {
    sortKey.value = null
    sortDir.value = 'asc'
  }
  load(1)
}

async function load(p = 1) {
  page.value = p
  loading.value = true
  error.value = null
  try {
    const sort = sortKey.value ? `&sort_by=${sortKey.value}&sort_dir=${sortDir.value}` : ''
    const res = await fetch(
      `/api/admin/geography/countries?per_page=50&page=${p}&status=${statusFilter.value}${sort}`,
      { headers: authHeaders() }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? t('common.error'))
    countries.value = json.data ?? []
    total.value = json.pagination?.total ?? 0
    totalPages.value = json.pagination?.total_pages ?? 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function patch(id, fields) {
  const res = await fetch(`/api/admin/geography/countries/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? t('list.saveError'))
  return json.data
}

function applyToRow(id, updated) {
  const idx = countries.value.findIndex(c => c.id === id)
  if (idx !== -1) Object.assign(countries.value[idx], updated)
}

async function toggleStatus(c) {
  togglingId.value = c.id
  try {
    const updated = await patch(c.id, { is_active: !c.is_active })
    applyToRow(c.id, updated)
  } catch (e) {
    notify(e.message, { type: 'error' })
  } finally {
    togglingId.value = null
  }
}

function startInline(id, field, value) {
  inlineCell.value = { id, field }
  inlineValue.value = value ?? ''
  inlineOrig.value = value ?? ''
}

function cancelInline() {
  inlineCell.value = null
}

async function saveInline(c, field) {
  if (!inlineCell.value || inlineCell.value.id !== c.id) return
  inlineCell.value = null

  const newVal = inlineValue.value.trim()
  if (newVal === inlineOrig.value || newVal === '') return

  try {
    const updated = await patch(c.id, { [field]: newVal })
    applyToRow(c.id, updated)
  } catch (e) {
    notify(e.message, { type: 'error' })
    c[field] = inlineOrig.value
  }
}

function deleteRow(c) {
  const index = countries.value.findIndex(x => x.id === c.id)
  if (index === -1) return

  deleteWithUndo({
    message: t('countries.deletedMessage', { name: c.name_uk }),
    remove: () => {
      countries.value.splice(index, 1)
      total.value--
    },
    restore: () => {
      countries.value.splice(index, 0, c)
      total.value++
    },
    commit: async () => {
      const res = await fetch(`${cfg.apiDelete}/${c.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? t('list.deleteError'))
      }
    },
    onCommitError: () => load(page.value),
  })
}

// Modal actions
function openCreateModal() {
  window.dispatchEvent(new CustomEvent('open-country-create'))
}

function openModal(country) {
  window.dispatchEvent(new CustomEvent('open-country-edit', { detail: { country } }))
}

// Event listeners
onMounted(() => {
  load()

  window.addEventListener('country-created', (e) => {
    countries.value.unshift(e.detail)
    justCreatedIds.value = new Set([...justCreatedIds.value, e.detail.id])
    total.value++
  })

  window.addEventListener('country-updated', (e) => {
    applyToRow(e.detail.id, e.detail)
  })
})
</script>

<style scoped>
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.th-sortable:hover {
  background: var(--bs-tertiary-bg);
}

.inline-editable {
  display: inline-block;
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color .15s;
}

.inline-editable:hover {
  border-color: var(--admin-inline-hover-border);
  background: var(--bs-secondary-bg);
}
</style>
