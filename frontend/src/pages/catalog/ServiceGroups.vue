<template>
  <ServiceGroupModal :justCreatedIds="justCreatedIds" />
  <BaseLayout>
    <div :style="contentMargin" class="page-content-wrapper">
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">Групи послуг</h5>
          <button v-if="canCreate" class="btn btn-sm btn-success" @click="openCreateModal">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          style="width:220px"
          placeholder="Пошук..."
          @input="debounceLoad"
        />
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>
      <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-else>
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 small">
              <thead class="table-light">
                <tr>
                  <th
                    v-for="col in cfg.table" :key="col.key"
                    :style="col.width ? `width:${col.width}px` : ''"
                    :class="[col.align === 'end' ? 'text-end' : '', col.sortable ? 'th-sortable' : '']"
                    @click="col.sortable ? toggleSort(col.key) : null"
                  >
                    {{ cfg.fields[col.key].label }}
                    <template v-if="col.sortable">
                      <i v-if="sortKey === col.key && sortDir === 'asc'"       class="bi bi-chevron-up ms-1"></i>
                      <i v-else-if="sortKey === col.key && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
                      <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                    </template>
                  </th>
                  <th style="width:60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <template v-for="col in cfg.table" :key="col.key">
                    <td v-if="col.key === 'id'" class="text-muted text-end">{{ row.id }}</td>
                    <td v-else-if="col.inlineEditable && canEditField(col.key)">
                      <input
                        v-if="inlineCell?.id === row.id && inlineCell?.field === col.key"
                        :ref="el => { if (el) el.focus() }"
                        :value="inlineValue"
                        class="form-control form-control-sm"
                        @input="inlineValue = $event.target.value"
                        @blur="saveInline(row, col.key)"
                        @keydown.enter.prevent="saveInline(row, col.key)"
                        @keydown.escape="cancelInline"
                      />
                      <span v-else class="inline-editable" @click="startInline(row.id, col.key, row[col.key])">
                        {{ row[col.key] || '—' }}
                      </span>
                    </td>
                    <td v-else>{{ row[col.key] ?? '—' }}</td>
                  </template>
                  <td class="text-nowrap">
                    <button v-if="canOpenModal || justCreatedIds.has(row.id)" class="btn btn-sm btn-outline-secondary me-1" @click="openModal(row)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button v-if="canDelete" class="btn btn-sm btn-outline-danger" title="Видалити" @click="deleteRow(row)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td :colspan="cfg.table.length + 1" class="text-center text-muted py-4">Немає даних</td>
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
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import ServiceGroupModal from '@/components/ServiceGroupModal.vue'
import { useAuth } from '@/composables/useAuth'
import { usePageLayout } from '@/composables/usePageLayout'
import cfg from './service-groups.config.json'

const { can, authHeaders } = useAuth()
const { contentMargin } = usePageLayout()

function canEditField(key) {
  const field = cfg.fields[key]
  if (!field?.editable) return false
  return field.editPermissions?.some(p => can(p)) ?? false
}

const canCreate    = computed(() => can(cfg.createPermission))
const canDelete    = computed(() => can(cfg.deletePermission))
const canOpenModal = computed(() => Object.keys(cfg.fields).some(k => canEditField(k)))

const items      = ref([])
const loading    = ref(true)
const error      = ref(null)
const page       = ref(1)
const total      = ref(0)
const totalPages = ref(1)
const sortKey    = ref(null)
const sortDir    = ref('asc')
const search     = ref('')

const inlineCell     = ref(null)
const inlineValue    = ref('')
const justCreatedIds = ref(new Set())

let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 350)
}

function toggleSort(key) {
  if (sortKey.value !== key) { sortKey.value = key; sortDir.value = 'asc' }
  else if (sortDir.value === 'asc') { sortDir.value = 'desc' }
  else { sortKey.value = null; sortDir.value = 'asc' }
  load(1)
}

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const sort = sortKey.value ? `&sort_by=${sortKey.value}&sort_dir=${sortDir.value}` : ''
    const q    = search.value.trim() ? `&search=${encodeURIComponent(search.value.trim())}` : ''
    const res  = await fetch(`${cfg.apiList}?per_page=200&page=${p}${sort}${q}`, { headers: authHeaders() })
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

async function patch(id, fields) {
  const res  = await fetch(`${cfg.apiUpdate}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(fields),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
  return json.data
}

function applyToRow(id, updated) {
  const idx = items.value.findIndex(r => r.id === id)
  if (idx !== -1) Object.assign(items.value[idx], updated)
}

function startInline(id, field, value) { inlineCell.value = { id, field }; inlineValue.value = value ?? '' }

async function saveInline(row, field) {
  if (!inlineCell.value || inlineCell.value.id !== row.id) return
  const newVal = inlineValue.value
  cancelInline()
  if (newVal === (row[field] ?? '')) return
  try { applyToRow(row.id, await patch(row.id, { [field]: newVal })) }
  catch (e) { alert(e.message) }
}

function cancelInline() { inlineCell.value = null; inlineValue.value = '' }

async function deleteRow(row) {
  if (!confirm(`Видалити групу «${row.name_uk || row.slug}»?`)) return
  try {
    const res  = await fetch(`${cfg.apiDelete}/${row.id}`, { method: 'DELETE', headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка видалення')
    items.value = items.value.filter(r => r.id !== row.id)
    justCreatedIds.value.delete(row.id)
    total.value--
  } catch (e) { alert(e.message) }
}

function openCreateModal() {
  window.dispatchEvent(new CustomEvent('open-service-group-create'))
}

function openModal(row) {
  window.dispatchEvent(new CustomEvent('open-service-group-edit', { detail: { row } }))
}

onMounted(() => {
  load()

  // Listen for modal events
  window.addEventListener('service-group-created', (e) => {
    items.value.unshift(e.detail)
    justCreatedIds.value = new Set([...justCreatedIds.value, e.detail.id])
    total.value++
  })

  window.addEventListener('service-group-updated', (e) => {
    applyToRow(e.detail.id, e.detail.data)
  })
})
</script>

<style scoped>
.page-content-wrapper {
  transition: margin 0.3s ease;
}

.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: #e9ecef; }

.inline-editable {
  display: block; cursor: text; min-width: 60px;
  padding: 2px 4px; border-radius: 4px;
  border: 1px solid transparent; transition: border-color .15s;
}
.inline-editable:hover { border-color: #86b7fe; background: #f8f9fa; }
</style>
