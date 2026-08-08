<template>
  <ServiceModal :groups="groups" :filterGroup="filterGroup" />
  <BaseLayout>
    <div :style="contentMargin" class="page-content-wrapper">
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0">{{ t('services.title') }}</h5>
          <button v-if="canCreate" class="btn btn-sm btn-success" @click="openCreateModal">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
        <div class="d-flex gap-2">
          <input
            v-model="search"
            type="text"
            class="form-control form-control-sm"
            style="width:200px"
            :placeholder="t('feedback.searchPlaceholder')"
            @input="debounceLoad"
          />
          <select v-model="filterGroup" class="form-select form-select-sm" style="width:auto" @change="load(1)">
            <option :value="null">{{ t('services.allGroups') }}</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name_uk }}</option>
          </select>
        </div>
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
                  <th style="width:50px" class="text-end">{{ t('table.id') }}</th>
                  <th>{{ t('services.colGroup') }}</th>
                  <th class="th-sortable" @click="toggleSort('slug')">
                    Slug
                    <i v-if="sortKey==='slug'&&sortDir==='asc'"       class="bi bi-chevron-up ms-1"></i>
                    <i v-else-if="sortKey==='slug'&&sortDir==='desc'" class="bi bi-chevron-down ms-1"></i>
                    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                  </th>
                  <th class="th-sortable" @click="toggleSort('name_uk')">
                    {{ t('cityTmpReview.nameUaLabel') }}
                    <i v-if="sortKey==='name_uk'&&sortDir==='asc'"       class="bi bi-chevron-up ms-1"></i>
                    <i v-else-if="sortKey==='name_uk'&&sortDir==='desc'" class="bi bi-chevron-down ms-1"></i>
                    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                  </th>
                  <th class="th-sortable" @click="toggleSort('name_en')">
                    {{ t('cityTmpReview.nameEnBracketLabel') }}
                    <i v-if="sortKey==='name_en'&&sortDir==='asc'"       class="bi bi-chevron-up ms-1"></i>
                    <i v-else-if="sortKey==='name_en'&&sortDir==='desc'" class="bi bi-chevron-down ms-1"></i>
                    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                  </th>
                  <th class="th-sortable" @click="toggleSort('name_ru')">
                    {{ t('cityTmpReview.nameRuBracketLabel') }}
                    <i v-if="sortKey==='name_ru'&&sortDir==='asc'"       class="bi bi-chevron-up ms-1"></i>
                    <i v-else-if="sortKey==='name_ru'&&sortDir==='desc'" class="bi bi-chevron-down ms-1"></i>
                    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
                  </th>
                  <th style="width:60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in items" :key="row.id">
                  <td class="text-muted text-end">{{ row.id }}</td>
                  <td class="text-muted">{{ row.group_name ?? '—' }}</td>

                  <!-- slug inline -->
                  <td>
                    <input
                      v-if="inlineCell?.id === row.id && inlineCell?.field === 'slug' && canEdit"
                      :ref="el => { if (el) el.focus() }"
                      :value="inlineValue"
                      class="form-control form-control-sm"
                      @input="inlineValue = $event.target.value"
                      @blur="saveInline(row, 'slug')"
                      @keydown.enter.prevent="saveInline(row, 'slug')"
                      @keydown.escape="cancelInline"
                    />
                    <span v-else-if="canEdit" class="inline-editable" @click="startInline(row.id, 'slug', row.slug)">
                      {{ row.slug || '—' }}
                    </span>
                    <span v-else>{{ row.slug }}</span>
                  </td>

                  <!-- name_uk inline -->
                  <td>
                    <input
                      v-if="inlineCell?.id === row.id && inlineCell?.field === 'name_uk' && canEdit"
                      :ref="el => { if (el) el.focus() }"
                      :value="inlineValue"
                      class="form-control form-control-sm"
                      @input="inlineValue = $event.target.value"
                      @blur="saveInline(row, 'name_uk')"
                      @keydown.enter.prevent="saveInline(row, 'name_uk')"
                      @keydown.escape="cancelInline"
                    />
                    <span v-else-if="canEdit" class="inline-editable" @click="startInline(row.id, 'name_uk', row.name_uk)">
                      {{ row.name_uk || '—' }}
                    </span>
                    <span v-else>{{ row.name_uk }}</span>
                  </td>

                  <!-- name_en inline -->
                  <td>
                    <input
                      v-if="inlineCell?.id === row.id && inlineCell?.field === 'name_en' && canEdit"
                      :ref="el => { if (el) el.focus() }"
                      :value="inlineValue"
                      class="form-control form-control-sm"
                      @input="inlineValue = $event.target.value"
                      @blur="saveInline(row, 'name_en')"
                      @keydown.enter.prevent="saveInline(row, 'name_en')"
                      @keydown.escape="cancelInline"
                    />
                    <span v-else-if="canEdit" class="inline-editable" @click="startInline(row.id, 'name_en', row.name_en)">
                      {{ row.name_en || '—' }}
                    </span>
                    <span v-else>{{ row.name_en }}</span>
                  </td>

                  <!-- name_ru inline -->
                  <td>
                    <input
                      v-if="inlineCell?.id === row.id && inlineCell?.field === 'name_ru' && canEdit"
                      :ref="el => { if (el) el.focus() }"
                      :value="inlineValue"
                      class="form-control form-control-sm"
                      @input="inlineValue = $event.target.value"
                      @blur="saveInline(row, 'name_ru')"
                      @keydown.enter.prevent="saveInline(row, 'name_ru')"
                      @keydown.escape="cancelInline"
                    />
                    <span v-else-if="canEdit" class="inline-editable" @click="startInline(row.id, 'name_ru', row.name_ru)">
                      {{ row.name_ru || '—' }}
                    </span>
                    <span v-else>{{ row.name_ru }}</span>
                  </td>

                  <td class="text-nowrap">
                    <button v-if="canEdit || justCreatedIds.has(row.id)" class="btn btn-sm btn-outline-secondary me-1" @click="openModal(row)">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button v-if="canDelete" class="btn btn-sm btn-outline-danger" :title="t('common.delete')" @click="deleteRow(row)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
                <tr v-if="!items.length">
                  <td colspan="7" class="text-center text-muted py-4">{{ t('common.noData') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="text-muted small">{{ t('analytics.totalCount', { value: total }) }}</span>
          <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseLayout from '@/layouts/BaseLayout.vue'
import ServiceModal from '@/components/ServiceModal.vue'
import Pagination from '@/components/Pagination.vue'
import { useAuth } from '@/composables/useAuth'
import { useNotify } from '@/composables/useNotify'
import { useUndoableDelete } from '@/composables/useUndoableDelete'
import { usePageLayout } from '@/composables/usePageLayout'
import { useUrlFilters } from '@/composables/useUrlFilters'

const { t } = useI18n({ useScope: 'global' })
const { can, authHeaders } = useAuth()
const { notify } = useNotify()
const { deleteWithUndo } = useUndoableDelete()
const { contentMargin } = usePageLayout()

const canCreate = computed(() => can('catalog.services.create'))
const canDelete = computed(() => can('catalog.services.edit'))
const canEdit   = computed(() => can('catalog.services.edit') || can('catalog.services.create'))

const API = '/api/admin/catalog/services'

const items       = ref([])
const loading     = ref(true)
const error       = ref(null)
const page        = ref(1)
const total       = ref(0)
const totalPages  = ref(1)
const sortKey     = ref(null)
const sortDir     = ref('asc')
const search      = ref('')
const filterGroup = ref(null)
const groups      = ref([])
const detailId    = ref(null)

// Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    group: filterGroup,
    page
  },
  sorting: {
    sortKey,
    sortDir
  },
  detail: {
    id: detailId,
    onOpen: async (id) => {
      // Находим запись в списке или загружаем её
      let row = items.value.find(r => r.id === id)
      if (!row) {
        try {
          const res = await fetch(`/api/admin/catalog/services/${id}`, { headers: authHeaders() })
          const json = await res.json()
          if (json.data) {
            row = json.data
          }
        } catch (e) {
          console.error('Failed to load service:', e)
          return
        }
      }
      if (row) {
        window.dispatchEvent(new CustomEvent('open-service-edit', { detail: { row } }))
      }
    }
  }
})

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
    const gid  = filterGroup.value !== null ? `&group_id=${filterGroup.value}` : ''
    const res  = await fetch(`${API}?per_page=200&page=${p}${sort}${q}${gid}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? t('common.error'))
    items.value      = json.data ?? []
    total.value      = json.pagination?.total ?? 0
    totalPages.value = json.pagination?.total_pages ?? 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function startInline(id, field, value) { inlineCell.value = { id, field }; inlineValue.value = value ?? '' }

async function saveInline(row, field) {
  if (!inlineCell.value || inlineCell.value.id !== row.id) return
  const newVal = inlineValue.value
  cancelInline()
  if (newVal === (row[field] ?? '')) return
  try {
    const res  = await fetch(`${API}/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ [field]: newVal }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? t('common.error'))
    const idx = items.value.findIndex(r => r.id === row.id)
    if (idx !== -1) Object.assign(items.value[idx], json.data)
  } catch (e) { notify(e.message, { type: 'error' }) }
}

function cancelInline() { inlineCell.value = null; inlineValue.value = '' }

function deleteRow(row) {
  const index = items.value.findIndex(r => r.id === row.id)
  if (index === -1) return

  deleteWithUndo({
    message: t('services.deletedMessage', { name: row.name_uk || row.slug }),
    remove: () => {
      items.value.splice(index, 1)
      justCreatedIds.value.delete(row.id)
      total.value--
    },
    restore: () => {
      items.value.splice(index, 0, row)
      total.value++
    },
    commit: async () => {
      const res  = await fetch(`${API}/${row.id}`, { method: 'DELETE', headers: authHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? t('list.deleteError'))
    },
    onCommitError: () => load(page.value),
  })
}

function openCreateModal() {
  window.dispatchEvent(new CustomEvent('open-service-create'))
}

function openModal(row) {
  detailId.value = row.id
  window.dispatchEvent(new CustomEvent('open-service-edit', { detail: { row } }))
}

function applyToRow(id, updated) {
  const idx = items.value.findIndex(r => r.id === id)
  if (idx !== -1) Object.assign(items.value[idx], updated)
}

onMounted(async () => {
  initFromUrl()
  const res = await fetch('/api/admin/catalog/service-groups?per_page=200', { headers: authHeaders() })
  groups.value = (await res.json()).data ?? []
  load(page.value)

  // Listen for modal events
  window.addEventListener('service-edit-closed', () => {
    detailId.value = null
  })

  window.addEventListener('service-created', (e) => {
    items.value.unshift(e.detail)
    justCreatedIds.value = new Set([...justCreatedIds.value, e.detail.id])
    total.value++
  })

  window.addEventListener('service-updated', (e) => {
    applyToRow(e.detail.id, e.detail.data)
  })
})
</script>

<style scoped>
.page-content-wrapper {
  transition: margin 0.3s ease;
}

.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: var(--bs-tertiary-bg); }

.inline-editable {
  display: block; cursor: text; min-width: 60px;
  padding: 2px 4px; border-radius: 4px;
  border: 1px solid transparent; transition: border-color .15s;
}
.inline-editable:hover { border-color: var(--admin-inline-hover-border); background: var(--bs-secondary-bg); }
</style>
