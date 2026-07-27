<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <div>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <h5 v-if="title" class="mb-0">{{ title }}</h5>
      <div class="d-flex gap-2 flex-wrap ms-auto align-items-center">
        <component
          :is="resolveFilterComponent(f)"
          v-for="f in filterConfig"
          :key="f.key"
          v-model="filters[f.key].value"
          :field="f"
        />

        <div v-if="filterConfig.length" class="d-flex align-items-center gap-1">
          <select
            v-model="selectedPresetName"
            class="form-select form-select-sm"
            style="width:auto"
            @change="applyPreset"
          >
            <option value="">Збережені фільтри...</option>
            <option v-for="p in savedPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            title="Зберегти поточний фільтр"
            @click="showSaveFilterInput = !showSaveFilterInput"
          >
            <i class="bi bi-bookmark-plus"></i>
          </button>
          <button
            v-if="selectedPresetName"
            type="button"
            class="btn btn-sm btn-outline-danger"
            title="Видалити збережений фільтр"
            @click="deleteSelectedPreset"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          :disabled="exporting"
          title="Експорт у CSV"
          @click="exportCsv"
        >
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-download me-1"></i>CSV
        </button>
      </div>
    </div>

    <div v-if="showSaveFilterInput" class="d-flex gap-2 align-items-center justify-content-end mb-3">
      <input
        v-model="newPresetName"
        type="text"
        class="form-control form-control-sm"
        style="width:220px"
        placeholder="Назва фільтру..."
        @keydown.enter.prevent="confirmSavePreset"
        @keydown.esc.prevent="showSaveFilterInput = false"
      />
      <button type="button" class="btn btn-sm btn-primary" @click="confirmSavePreset">Зберегти</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="showSaveFilterInput = false">Скасувати</button>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <!-- Масові операції — з'являються, коли вибрано хоч один рядок -->
      <div v-if="selected.length > 0" class="alert alert-info d-flex align-items-center gap-2 flex-wrap mb-3">
        <span><strong>{{ selected.length }}</strong> обрано</span>

        <select v-model="bulkField" class="form-select form-select-sm" style="width:auto">
          <option value="">Змінити поле...</option>
          <option v-for="col in editableColumns" :key="col.key" :value="col.key">{{ col.label }}</option>
        </select>

        <component
          :is="resolveCellComponent(bulkFieldConfig)"
          v-if="bulkFieldConfig"
          v-model="bulkValue"
          :field="bulkFieldConfig"
          :readonly="false"
          :row="{}"
        />

        <button
          v-if="bulkFieldConfig"
          class="btn btn-sm btn-primary"
          :disabled="bulkApplying"
          @click="applyBulkUpdate"
        >
          <span v-if="bulkApplying" class="spinner-border spinner-border-sm me-1"></span>Застосувати
        </button>

        <button
          v-if="canBulkDelete"
          class="btn btn-sm btn-outline-danger"
          :disabled="bulkApplying"
          @click="applyBulkDelete"
        >
          <i class="bi bi-trash"></i> Видалити
        </button>

        <button class="btn btn-sm btn-outline-secondary ms-auto" @click="clearSelection">Скасувати</button>
      </div>

      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:36px">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="isAllSelected"
                    title="Вибрати всі на сторінці"
                    @change="toggleSelectAll"
                  />
                </th>
                <th
                  v-for="col in columnsConfig"
                  :key="col.key"
                  :style="col.width ? { width: col.width } : {}"
                  :class="[col.align ? `text-${col.align}` : '', col.sortable ? 'th-sortable' : '']"
                  :title="col.sortable ? 'Клік — сортувати. Ctrl+клік — додати до сортування' : null"
                  @click="col.sortable ? toggleSort(col.key, $event) : null"
                >
                  {{ col.label }}
                  <SortIcon v-if="col.sortable" :col="col.key" :sort-items="sortItems" />
                </th>
                <th v-if="actions.length" style="width:100px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row[rowKey]">
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="selected.includes(row[rowKey])"
                    @change="toggleSelect(row[rowKey])"
                  />
                </td>
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
                <td :colspan="columnsConfig.length + 1 + (actions.length ? 1 : 0)" class="text-center text-muted py-4">
                  Немає даних
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">
          Всього: {{ total }}
          <span
            v-if="revalidating"
            class="spinner-border spinner-border-sm ms-1"
            style="width:.7rem;height:.7rem"
            title="Оновлення..."
          ></span>
        </span>
        <div class="d-flex align-items-center gap-2">
          <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
          <select v-model.number="perPage" class="form-select form-select-sm" style="width:auto">
            <option v-for="n in PER_PAGE_OPTIONS" :key="n" :value="n">{{ n }} на сторінці</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useNotify } from '@/composables/useNotify'
import { useUndoableDelete } from '@/composables/useUndoableDelete'
import { useUrlFilters } from '@/composables/useUrlFilters'
import { useSavedFilters } from '@/composables/useSavedFilters'
import { useListCache } from '@/composables/useListCache'
import { formatPhoneUA } from '@/utils/phone'
import { rowsToCsv, downloadCsv } from '@/utils/csv'
import Pagination from '@/components/Pagination.vue'
import SortIcon from '@/components/SortIcon.vue'
import { resolveFilterType } from './filterTypes'
import { resolveCellType } from './cellTypes'
import { useRemoteOptions } from './composables/useRemoteOptions'

const props = defineProps({
  title: { type: String, default: '' },
  apiList: { type: String, required: true },
  apiUpdate: { type: String, default: null },
  apiDelete: { type: String, default: null },
  filterConfig: { type: Array, default: () => [] },
  columnsConfig: { type: Array, required: true },
  actions: { type: Array, default: () => [] },
  rowKey: { type: String, default: 'id' },
  perPage: { type: Number, default: 50 },
  // Мапи "ім'я типу з JSON" -> компонент, для field.type === 'custom'
  customFilterTypes: { type: Object, default: () => ({}) },
  customCellTypes: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['row-action'])

const auth = useAuth()
const { notify } = useNotify()
const { deleteWithUndo, deleteManyWithUndo } = useUndoableDelete()

// ── Filters state (по одному ref на кожне поле з filterConfig) ─────────────
const filters = {}
for (const f of props.filterConfig) {
  filters[f.key] = ref(f.default ?? (f.type === 'checkbox' ? false : ''))
}

// Мульти-сортування: масив [{ key, dir }], порядок елементів = пріоритет
// (спочатку по type, потім по name — саме в такому порядку, як клікав користувач).
const sortItems = ref([])

// Кількість записів на сторінці — теж звичайний "фільтр" для useUrlFilters
// (той самий generic-механізм: число в URL парситься само, без додаткової мапи).
const PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 250]
const perPage = ref(props.perPage)

const urlFilters = useUrlFilters({
  filters: { ...filters, per_page: perPage },
  multiSort: sortItems,
})

// ── List state ───────────────────────────────────────────────────────────
const items = ref([])
const loading = ref(true)
const error = ref(null)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)

// ── Bulk selection (тільки в межах поточної завантаженої сторінки —
// скидається при кожному load(), щоб не тримати "невидимі" вибрані рядки) ──
const selected = ref([])
const bulkField = ref('')
const bulkValue = ref(null)
const bulkApplying = ref(false)

const isAllSelected = computed(
  () => items.value.length > 0 && items.value.every((r) => selected.value.includes(r[props.rowKey]))
)
const editableColumns = computed(() => props.columnsConfig.filter((c) => c.editable))
const bulkFieldConfig = computed(() => editableColumns.value.find((c) => c.key === bulkField.value) ?? null)
const deleteAction = computed(() => props.actions.find((a) => a.type === 'delete'))
const canBulkDelete = computed(
  () => !!props.apiDelete && !!deleteAction.value && (!deleteAction.value.permission || auth.can(deleteAction.value.permission))
)

watch(bulkField, () => { bulkValue.value = null })

// Під час applyPreset() кілька refs (фільтри + сортування + perPage) міняються
// одним синхронним блоком — без цього прапорця кожен watch нижче викликав би
// свій власний load(), і на застосування одного пресету летіло б 3-5 запитів
// замість одного.
let applyingPreset = false

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
  watch(filters[f.key], () => { if (!applyingPreset) scheduleLoad(f.type !== 'text') })
}
watch(sortItems, () => { if (!applyingPreset) load(1) }, { deep: true })
watch(perPage, () => { if (!applyingPreset) load(1) })

// ── Saved filters (react-admin: "Saved Queries") ────────────────────────
const { presets: savedPresets, save: savePresetToStorage, remove: removePresetFromStorage } =
  useSavedFilters(props.apiList)
const selectedPresetName = ref('')
const showSaveFilterInput = ref(false)
const newPresetName = ref('')

async function applyPreset() {
  if (!selectedPresetName.value) return
  const preset = savedPresets.value.find((p) => p.name === selectedPresetName.value)
  if (!preset) return

  applyingPreset = true
  for (const [key, value] of Object.entries(preset.filters ?? {})) {
    if (filters[key]) filters[key].value = value
  }
  sortItems.value = (preset.sort ?? []).map((s) => ({ ...s }))
  if (preset.perPage) perPage.value = preset.perPage
  await nextTick()
  applyingPreset = false

  load(1)
}

function confirmSavePreset() {
  const name = newPresetName.value.trim()
  if (!name) return
  const snapshot = {
    filters: Object.fromEntries(props.filterConfig.map((f) => [f.key, filters[f.key].value])),
    sort: sortItems.value.map((s) => ({ ...s })),
    perPage: perPage.value,
  }
  savePresetToStorage(name, snapshot)
  selectedPresetName.value = name
  newPresetName.value = ''
  showSaveFilterInput.value = false
  notify(`Фільтр «${name}» збережено`, { type: 'success' })
}

function deleteSelectedPreset() {
  const name = selectedPresetName.value
  if (!name) return
  removePresetFromStorage(name)
  selectedPresetName.value = ''
  notify(`Фільтр «${name}» видалено`, { type: 'info' })
}

// ── CSV export ───────────────────────────────────────────────────────────
const exporting = ref(false)
const EXPORT_PAGE_SIZE = 500
const EXPORT_MAX_ROWS = 20000

// Для select-колонок з optionsUrl чекаємо на завантаження довідника (спільний
// кеш з useRemoteOptions — якщо колонка вже відмальовувалась у таблиці, це
// миттєве попадання в кеш; безпечний таймаут — щоб експорт не завис назавжди).
async function ensureColumnOptionsLoaded() {
  const pending = props.columnsConfig
    .filter((c) => c.type === 'select' && c.optionsUrl)
    .map((c) => useRemoteOptions(c.optionsUrl, {
      valueKey: c.optionsValueKey ?? 'id',
      labelKey: c.optionsLabelKey ?? 'name_uk',
    }))
  const start = Date.now()
  while (pending.some((p) => p.loading.value) && Date.now() - start < 3000) {
    await new Promise((r) => setTimeout(r, 50))
  }
}

function formatValueForExport(col, row) {
  const v = row[col.key]
  if (col.type === 'boolean') {
    return v ? (col.trueLabel ?? 'Так') : (col.falseLabel ?? 'Ні')
  }
  if (col.type === 'phone-list') {
    return (v ?? []).map(formatPhoneUA).join(', ')
  }
  if (col.type === 'select') {
    const options = col.optionsUrl
      ? useRemoteOptions(col.optionsUrl, {
          valueKey: col.optionsValueKey ?? 'id',
          labelKey: col.optionsLabelKey ?? 'name_uk',
        }).options.value
      : (col.options ?? [])
    const found = options.find((o) => String(o.value) === String(v))
    return found ? found.label : (v ?? '')
  }
  return v ?? ''
}

async function exportCsv() {
  exporting.value = true
  try {
    await ensureColumnOptionsLoaded()

    const params = new URLSearchParams()
    params.set('per_page', String(EXPORT_PAGE_SIZE))
    if (sortItems.value.length) {
      params.set('sort_by', sortItems.value.map((s) => s.key).join(','))
      params.set('sort_dir', sortItems.value.map((s) => s.dir).join(','))
    }
    for (const f of props.filterConfig) {
      const v = filters[f.key].value
      if (v !== '' && v !== null && v !== undefined && v !== false) {
        params.set(f.key, v)
      }
    }

    let allRows = []
    let fetchPage = 1
    let fetchedTotalPages = 1
    do {
      params.set('page', String(fetchPage))
      const res = await fetch(`${props.apiList}?${params}`, { headers: auth.authHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.message ?? `Помилка експорту (HTTP ${res.status})`)
      allRows = allRows.concat(json.data ?? [])
      fetchedTotalPages = json.pagination?.total_pages ?? 1
      fetchPage++
    } while (fetchPage <= fetchedTotalPages && allRows.length < EXPORT_MAX_ROWS)

    if (allRows.length >= EXPORT_MAX_ROWS) {
      notify(`Експортовано перші ${EXPORT_MAX_ROWS} записів (забагато для одного файлу) — звузьте фільтр`, {
        type: 'info',
        duration: 8000,
      })
    }

    const headers = props.columnsConfig.map((c) => c.label)
    const csvRows = allRows.map((row) => props.columnsConfig.map((col) => formatValueForExport(col, row)))
    downloadCsv(`export-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(headers, csvRows))
    notify(`Експортовано ${allRows.length} запис(ів)`, { type: 'success' })
  } catch (e) {
    notify(e.message, { type: 'error' })
  } finally {
    exporting.value = false
  }
}

// ── List cache (stale-while-revalidate) ─────────────────────────────────
const { get: cacheGet, set: cacheSet } = useListCache()
const revalidating = ref(false)

async function load(p = 1) {
  page.value = p
  error.value = null
  selected.value = []

  const params = new URLSearchParams()
  params.set('page', String(p))
  params.set('per_page', String(perPage.value))
  if (sortItems.value.length) {
    params.set('sort_by', sortItems.value.map((s) => s.key).join(','))
    params.set('sort_dir', sortItems.value.map((s) => s.dir).join(','))
  }
  for (const f of props.filterConfig) {
    const v = filters[f.key].value
    if (v !== '' && v !== null && v !== undefined && v !== false) {
      params.set(f.key, v)
    }
  }
  const cacheKey = `${props.apiList}?${params}`

  // Stale-while-revalidate: кеш-хіт малюється миттєво (без спінера на весь
  // блок), а свіжий запит все одно летить у фоні й перезаписує і кеш, і UI.
  const cached = cacheGet(cacheKey)
  if (cached) {
    items.value = cached.items
    total.value = cached.total
    totalPages.value = cached.totalPages
    loading.value = false
    revalidating.value = true
  } else {
    loading.value = true
    revalidating.value = false
  }

  try {
    const res = await fetch(`${props.apiList}?${params}`, { headers: auth.authHeaders() })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message ?? `Помилка завантаження (HTTP ${res.status})`)
    items.value = json.data ?? []
    total.value = json.pagination?.total ?? items.value.length
    totalPages.value = json.pagination?.total_pages ?? 1
    cacheSet(cacheKey, { items: items.value, total: total.value, totalPages: totalPages.value })
  } catch (e) {
    // Кеш уже показаний — не ховаємо його за великим блоком помилки,
    // просто повідомляємо тостом і лишаємо застарілі (але не хибні) дані.
    if (cached) notify(e.message, { type: 'error' })
    else error.value = e.message
  } finally {
    loading.value = false
    revalidating.value = false
  }
}

// Звичайний клік — сортує лише по цій колонці (скидає решту).
// Ctrl/Cmd+клік — додає колонку до вже вибраного сортування (або перемикає
// її напрямок/прибирає, якщо вона вже там) — так можна сортувати спершу
// по "Тип", потім (додатково) по "Назва".
function toggleSort(key, event) {
  const additive = !!(event && (event.ctrlKey || event.metaKey))
  const idx = sortItems.value.findIndex((s) => s.key === key)

  if (!additive) {
    if (sortItems.value.length === 1 && idx === 0) {
      sortItems.value = sortItems.value[0].dir === 'ASC' ? [{ key, dir: 'DESC' }] : []
    } else {
      sortItems.value = [{ key, dir: 'ASC' }]
    }
    return
  }

  if (idx === -1) {
    sortItems.value = [...sortItems.value, { key, dir: 'ASC' }]
  } else if (sortItems.value[idx].dir === 'ASC') {
    sortItems.value = sortItems.value.map((s, i) => (i === idx ? { ...s, dir: 'DESC' } : s))
  } else {
    sortItems.value = sortItems.value.filter((_, i) => i !== idx)
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
    notify(e.message, { type: 'error' })
  }
}

// ── Row actions (detail / delete / custom) ──────────────────────────────
async function handleDelete(row) {
  const id = row[props.rowKey]
  const index = items.value.findIndex((r) => r[props.rowKey] === id)
  if (index === -1) return

  deleteWithUndo({
    message: `Запис #${id} видалено`,
    remove: () => {
      items.value.splice(index, 1)
      total.value--
    },
    restore: () => {
      items.value.splice(index, 0, row)
      total.value++
    },
    commit: async () => {
      const res = await fetch(`${props.apiDelete}/${id}`, {
        method: 'DELETE',
        headers: auth.authHeaders(),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? 'Помилка видалення')
      }
    },
    onCommitError: () => load(page.value),
  })
}

// ── Bulk selection + bulk actions ───────────────────────────────────────
function toggleSelect(id) {
  const idx = selected.value.indexOf(id)
  if (idx > -1) {
    selected.value = selected.value.filter((_, i) => i !== idx)
  } else {
    selected.value = [...selected.value, id]
  }
}

function toggleSelectAll() {
  selected.value = isAllSelected.value ? [] : items.value.map((r) => r[props.rowKey])
}

function clearSelection() {
  selected.value = []
  bulkField.value = ''
  bulkValue.value = null
}

// Той самий PATCH /{id}, що й для inline-редагування — тут просто по черзі
// (не паралельно: SQLite-подібні бекенди погано переносять пачку одночасних
// записів) для кожного вибраного id.
async function applyBulkUpdate() {
  if (!bulkFieldConfig.value || !props.apiUpdate || !selected.value.length) return
  bulkApplying.value = true
  try {
    for (const id of selected.value) {
      const res = await fetch(`${props.apiUpdate}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
        body: JSON.stringify({ [bulkField.value]: bulkValue.value }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? `Помилка оновлення запису #${id}`)
      }
    }
    clearSelection()
    await load(page.value)
  } catch (e) {
    notify(e.message, { type: 'error' })
  } finally {
    bulkApplying.value = false
  }
}

async function applyBulkDelete() {
  if (!props.apiDelete || !selected.value.length) return

  const removed = selected.value
    .map((id) => ({ id, index: items.value.findIndex((r) => r[props.rowKey] === id) }))
    .filter(({ index }) => index !== -1)
    .map(({ index }) => ({ row: items.value[index], index }))
  clearSelection()

  deleteManyWithUndo({
    items: removed,
    message: `Видалено ${removed.length} запис(ів)`,
    remove: () => {
      removed
        .slice()
        .sort((a, b) => b.index - a.index)
        .forEach(({ index }) => items.value.splice(index, 1))
      total.value -= removed.length
    },
    restore: (items_) => {
      items_
        .slice()
        .sort((a, b) => a.index - b.index)
        .forEach(({ row, index }) => {
          items.value.splice(Math.min(index, items.value.length), 0, row)
        })
      total.value += items_.length
    },
    commitOne: async ({ row }) => {
      const res = await fetch(`${props.apiDelete}/${row[props.rowKey]}`, {
        method: 'DELETE',
        headers: auth.authHeaders(),
      })
      if (!res.ok) throw new Error('Помилка видалення')
    },
    onAnyCommitError: () => load(page.value),
  })
}

function handleAction(action, row) {
  if (action.type === 'delete') return handleDelete(row)
  emit('row-action', { type: action.type, row, tab: action.tab ?? null })
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
