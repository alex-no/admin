<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <h5 v-if="title" class="mb-0">{{ title }}</h5>
      <div class="d-flex gap-2 flex-wrap ms-auto">
        <component
          :is="resolveFilterComponent(f)"
          v-for="f in filterConfig"
          :key="f.key"
          v-model="filters[f.key].value"
          :field="f"
        />
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
            <thead class="table-light">
              <tr>
                <th
                  v-for="col in columnsConfig"
                  :key="col.key"
                  :style="col.width ? { width: col.width } : {}"
                  :class="[col.align ? `text-${col.align}` : '', col.sortable ? 'th-sortable' : '']"
                  @click="col.sortable ? toggleSort(col.key) : null"
                >
                  {{ col.label }}
                  <SortIcon v-if="col.sortable" :col="col.key" :sort-key="sortKey ?? ''" :sort-dir="sortDir" />
                </th>
                <th v-if="actions.length" style="width:100px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row[rowKey]">
                <td v-for="col in columnsConfig" :key="col.key" :class="col.align ? `text-${col.align}` : ''">
                  <component
                    :is="resolveCellComponent(col)"
                    :field="col"
                    :model-value="row[col.key]"
                    :readonly="!col.editable"
                    :row="row"
                    @update:model-value="(v) => handleCellUpdate(row, col, v)"
                  />
                </td>
                <td v-if="actions.length" class="text-nowrap">
                  <button
                    v-for="a in actions"
                    v-show="!a.permission || auth.can(a.permission)"
                    :key="a.type"
                    class="btn btn-sm btn-outline-secondary me-1"
                    :class="a.type === 'delete' ? 'btn-outline-danger' : ''"
                    :title="a.label"
                    @click="handleAction(a, row)"
                  >
                    <i class="bi" :class="a.icon"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td :colspan="columnsConfig.length + (actions.length ? 1 : 0)" class="text-center text-muted py-4">
                  Немає даних
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">Всього: {{ total }}</span>
        <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useUrlFilters } from '@/composables/useUrlFilters'
import Pagination from '@/components/Pagination.vue'
import SortIcon from '@/components/SortIcon.vue'
import { resolveFilterType } from './filterTypes'
import { resolveCellType } from './cellTypes'

const props = defineProps({
  title: { type: String, default: '' },
  apiList: { type: String, required: true },
  apiUpdate: { type: String, default: null },
  apiDelete: { type: String, default: null },
  filterConfig: { type: Array, default: () => [] },
  columnsConfig: { type: Array, required: true },
  actions: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  perPage: { type: Number, default: 20 },
  // Мапи "ім'я типу з JSON" -> компонент, для field.type === 'custom'
  customFilterTypes: { type: Object, default: () => ({}) },
  customCellTypes: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['row-action'])

const auth = useAuth()

// ── Filters state (по одному ref на кожне поле з filterConfig) ─────────────
const filters = {}
for (const f of props.filterConfig) {
  filters[f.key] = ref(f.default ?? (f.type === 'checkbox' ? false : ''))
}

const sortKey = ref(null)
const sortDir = ref('ASC')

const urlFilters = useUrlFilters({
  filters,
  sorting: { sortKey, sortDir },
})

// ── List state ───────────────────────────────────────────────────────────
const items = ref([])
const loading = ref(true)
const error = ref(null)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)

let debounceTimer = null
function scheduleLoad(immediate) {
  clearTimeout(debounceTimer)
  if (immediate) {
    load(1)
  } else {
    debounceTimer = setTimeout(() => load(1), 350)
  }
}

for (const f of props.filterConfig) {
  watch(filters[f.key], () => scheduleLoad(f.type !== 'text'))
}
watch([sortKey, sortDir], () => load(1))

async function load(p = 1) {
  page.value = p
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('per_page', String(props.perPage))
    if (sortKey.value) {
      params.set('sort_by', sortKey.value)
      params.set('sort_dir', sortDir.value)
    }
    for (const f of props.filterConfig) {
      const v = filters[f.key].value
      if (v !== '' && v !== null && v !== undefined && v !== false) {
        params.set(f.key, v)
      }
    }
    const res = await fetch(`${props.apiList}?${params}`, { headers: auth.authHeaders() })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message ?? `Помилка завантаження (HTTP ${res.status})`)
    items.value = json.data ?? []
    total.value = json.pagination?.total ?? items.value.length
    totalPages.value = json.pagination?.total_pages ?? 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function toggleSort(key) {
  if (sortKey.value !== key) {
    sortKey.value = key
    sortDir.value = 'ASC'
  } else if (sortDir.value === 'ASC') {
    sortDir.value = 'DESC'
  } else {
    sortKey.value = null
    sortDir.value = 'ASC'
  }
}

// ── Inline cell edit ─────────────────────────────────────────────────────
async function handleCellUpdate(row, field, value) {
  const prev = row[field.key]
  row[field.key] = value
  if (!props.apiUpdate) return
  try {
    const res = await fetch(`${props.apiUpdate}/${row[props.rowKey]}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
      body: JSON.stringify({ [field.key]: value }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
  } catch (e) {
    row[field.key] = prev
    alert(e.message)
  }
}

// ── Row actions (detail / delete / custom) ──────────────────────────────
async function handleDelete(row) {
  if (!confirm(`Видалити запис #${row[props.rowKey]}?`)) return
  try {
    const res = await fetch(`${props.apiDelete}/${row[props.rowKey]}`, {
      method: 'DELETE',
      headers: auth.authHeaders(),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.message ?? 'Помилка видалення')
    }
    items.value = items.value.filter((r) => r[props.rowKey] !== row[props.rowKey])
    total.value--
  } catch (e) {
    alert(e.message)
  }
}

function handleAction(action, row) {
  if (action.type === 'delete') return handleDelete(row)
  emit('row-action', { type: action.type, row })
}

// ── Type resolution (registry + custom override) ────────────────────────
function resolveFilterComponent(field) {
  if (field.type === 'custom') return props.customFilterTypes[field.component]
  return resolveFilterType(field.type)
}
function resolveCellComponent(field) {
  if (field.type === 'custom') return props.customCellTypes[field.component]
  return resolveCellType(field.type)
}

defineExpose({ reload: () => load(page.value) })

onMounted(() => {
  urlFilters.initFromUrl()
  load(page.value)
})
</script>

<style scoped>
.th-sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.th-sortable:hover {
  background: #e9ecef;
}
</style>
