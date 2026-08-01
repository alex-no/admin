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
          :filter-values="filterValues"
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

        <ColumnSelector
          :columns="columnsConfig"
          :is-visible="isColumnVisible"
          :has-hidden="hasHiddenColumns"
          @toggle="toggleColumn"
          @reset="resetColumns"
        />

        <button v-if="canCreate" type="button" class="btn btn-sm btn-success" @click="openCreate">
          <i class="bi bi-plus-lg me-1"></i>Додати
        </button>

        <!-- Власні кнопки сторінки (створення через свою модалку, імпорт тощо).
             Потрібен там, де вбудованої форми створення недостатньо: сторінка не
             може домалювати кнопку до цієї панелі ззовні.
             Дзеркало React: проп headerActions. -->
        <slot name="actions" />
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

        <!-- Без жодної редагованої колонки (напр. сторінка лише з іменованими
             діями) селект був би порожнім рядком «Змінити поле...» ні про що -->
        <select v-if="editableColumns.length" v-model="bulkField" class="form-select form-select-sm" style="width:auto">
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

        <!-- Іменовані дії: одна кнопка = одна операція з фіксованим значенням
             (список — у конфізі сторінки, виконує bulk-роут одним запитом) -->
        <button
          v-for="a in visibleBulkActions"
          :key="a.action"
          class="btn btn-sm"
          :class="`btn-${a.variant ?? 'outline-primary'}`"
          :disabled="bulkApplying"
          @click="applyNamedBulk(a)"
        >
          <i v-if="a.icon" class="bi me-1" :class="a.icon"></i>{{ a.label }}
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
                  v-for="col in visibleColumns"
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
              <tr v-for="row in items" :key="row[rowKey]" :class="rowClass ? rowClass(row) : ''">
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="selected.includes(row[rowKey])"
                    @change="toggleSelect(row[rowKey])"
                  />
                </td>
                <td v-for="col in visibleColumns" :key="col.key" :class="col.align ? `text-${col.align}` : ''">
                  <!-- displayKey: у рядку вже лежить приєднана назва (country_id → country_name),
                       тому показуємо її замість голого FK, а сортування лишається по col.key -->
                  <component
                    :is="resolveCellComponent(col)"
                    :field="col"
                    :model-value="row[col.displayKey ?? col.key]"
                    :readonly="!isColumnEditable(col)"
                    :row="row"
                    @update:model-value="(v) => handleCellUpdate(row, col, v)"
                  />
                </td>
                <td v-if="actions.length" class="text-nowrap">
                  <button
                    v-for="a in actions"
                    v-show="isActionVisible(a, row)"
                    :key="`${a.type}:${a.tab ?? ''}`"
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
                <td :colspan="visibleColspan" class="text-center text-muted py-4">
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

    <!-- Форма створення: поля беруться з конфіга (createFields), а контроли — з
         того самого реєстру cellTypes, що й комірки таблиці. Тобто новий тип
         поля автоматично працює і в таблиці, і у формі. -->
    <BaseModal
      v-if="canCreate"
      v-model:visible="createOpen"
      storage-key="list-framework-create"
      :default-width="520"
      :min-width="380"
      :max-width="760"
      :default-height="420"
      :min-height="280"
      :max-height="700"
      :close-on-backdrop="false"
    >
      <template #title><h5 class="mb-0">Створення запису</h5></template>

      <div class="px-1">
        <div v-for="col in createColumns" :key="col.key" class="mb-3">
          <label class="form-label small text-muted mb-1">{{ col.label }}</label>
          <component
            :is="resolveCellComponent(col)"
            v-model="createForm[col.key]"
            :field="col"
            :readonly="false"
            :row="{}"
          />
          <div v-if="createErrors[col.key]" class="text-danger small mt-1">{{ createErrors[col.key] }}</div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="createOpen = false">Скасувати</button>
        <button type="button" class="btn btn-sm btn-primary ms-2" :disabled="creating" @click="submitCreate">
          <span v-if="creating" class="spinner-border spinner-border-sm me-1"></span>Створити
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useNotify } from '@/composables/useNotify'
import { useUndoableDelete } from '@/composables/useUndoableDelete'
import { useUrlFilters } from '@/composables/useUrlFilters'
import { useSavedFilters } from '@/composables/useSavedFilters'
import { useColumnPrefs } from '@/composables/useColumnPrefs'
import { useListCache } from '@/composables/useListCache'
import { formatPhoneUA } from '@/utils/phone'
import { rowsToCsv, downloadCsv } from '@/utils/csv'
import Pagination from '@/components/Pagination.vue'
import ColumnSelector from '@/components/ColumnSelector.vue'
import BaseModal from '@/components/BaseModal.vue'
import SortIcon from '@/components/SortIcon.vue'
import { resolveFilterType } from './filterTypes'
import { resolveCellType } from './cellTypes'
import { useRemoteOptions } from './composables/useRemoteOptions'

const props = defineProps({
  title: { type: String, default: '' },
  apiList: { type: String, required: true },
  apiUpdate: { type: String, default: null },
  apiDelete: { type: String, default: null },
  // Створення записів. Без apiCreate кнопки "Додати" немає взагалі.
  apiCreate: { type: String, default: null },
  createPermission: { type: String, default: null },
  // Ключі колонок, які показувати у формі створення (порядок = порядок полів).
  // Поле, якого тут немає, бере значення за замовчуванням із схеми БД.
  createFields: { type: Array, default: () => [] },
  // Іменовані масові дії: bulk-роут приймає { ids, action }. Без apiBulk
  // кнопок немає — видалення пачкою працює окремо, через apiDelete з undo.
  apiBulk: { type: String, default: null },
  bulkActions: { type: Array, default: () => [] },
  filterConfig: { type: Array, default: () => [] },
  columnsConfig: { type: Array, required: true },
  actions: { type: Array, default: () => [] },
  // Сортування при першому відкритті, напр. [{ key: 'created_at', dir: 'DESC' }].
  // Значення з URL має пріоритет — посилання відтворює саме те, що бачив автор.
  defaultSort: { type: Array, default: () => [] },
  // Клас рядка за його вмістом, напр. підсвітити критичні помилки.
  // Функція, тому в JSON її бути не може — сторінка передає в коді.
  rowClass: { type: Function, default: null },
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
const sortItems = ref(props.defaultSort.map((s) => ({ ...s })))

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
// Колонка редагована, якщо так сказано в конфізі І користувач має право хоч на
// один із перелічених editPermissions. Прапорця немає — достатньо editable.
// Порожній масив = редагувати не може ніхто.
// Дзеркало React: DataTable.tsx → isColumnEditable.
// ⚠️ Сервер перевіряє те саме окремо (AdminStoController::FIELD_PERMISSIONS) —
// тут лише UI, обійти його через DevTools тривіально.
function isColumnEditable(col) {
  if (!col.editable) return false
  if (!col.editPermissions) return true
  return col.editPermissions.some((p) => auth.can(p))
}

// Той самий предикат, що й для комірок: інакше поле, закрите правами, лишилось би
// доступним через "Змінити поле…" у масових операціях — і змінювалось би пачкою.
const editableColumns = computed(() => props.columnsConfig.filter(isColumnEditable))
const bulkFieldConfig = computed(() => editableColumns.value.find((c) => c.key === bulkField.value) ?? null)
const deleteAction = computed(() => props.actions.find((a) => a.type === 'delete'))
const canBulkDelete = computed(
  () => !!props.apiDelete && !!deleteAction.value && (!deleteAction.value.permission || auth.can(deleteAction.value.permission))
)
// Дзеркало React: DataTable.tsx → visibleBulkActions. Сервер перевіряє те саме
// право повторно (AdminStoController::BULK_ACTIONS) — тут лише UI.
const visibleBulkActions = computed(
  () => (props.apiBulk ? props.bulkActions.filter((a) => !a.permission || auth.can(a.permission)) : [])
)

watch(bulkField, () => { bulkValue.value = null })

// ── Вибір колонок (react-admin: SelectColumnsButton) ──────────────────────
// Колонка з прапорцем hideable: false ховатись не може. Експорт у CSV навмисно
// працює з повним columnsConfig — приховане в UI все одно попадає у вигрузку.
const {
  isVisible: isColumnVisible,
  toggle:    toggleColumn,
  reset:     resetColumns,
  hasHidden: hasHiddenColumns,
} = useColumnPrefs(props.apiList, props.columnsConfig)

const visibleColumns = computed(() => props.columnsConfig.filter((c) => isColumnVisible(c.key)))

// +1 — колонка чекбоксів; ще +1, якщо є колонка дій рядка
const visibleColspan = computed(
  () => visibleColumns.value.length + 1 + (props.actions.length ? 1 : 0)
)

// Під час applyPreset() кілька refs (фільтри + сортування + perPage) міняються
// одним синхронним блоком — без цього прапорця кожен watch нижче викликав би
// свій власний load(), і на застосування одного пресету летіло б 3-5 запитів
// замість одного.
let applyingPreset = false

// Обовʼязковий фільтр (`required: true`) — той, без значення якого запит не має
// сенсу: напр. довідник, що існує лише в межах обраної країни. Поки такий фільтр
// порожній (варіанти ще вантажаться), список не запитуємо взагалі — інакше перший
// запит пішов би без нього й показав чужі рядки, які через мить самі змінились би.
// Поточні значення всіх фільтрів одним обʼєктом — потрібні залежним фільтрам
// (`dependsOn`), щоб підставити значення батька в свій optionsUrl.
const filterValues = computed(() =>
  Object.fromEntries(props.filterConfig.map((f) => [f.key, filters[f.key].value]))
)

// Каскад: при зміні батьківського фільтра дочірній скидається — інакше в запиті
// лишився б район із попередньої області.
for (const f of props.filterConfig) {
  for (const parentKey of f.dependsOn ?? []) {
    if (!filters[parentKey]) continue
    watch(filters[parentKey], () => {
      if (filters[f.key].value !== '') filters[f.key].value = ''
    })
  }
}

const requiredFilters = props.filterConfig.filter((f) => f.required)

// `defaultFirstOption` — фільтр не обовʼязковий (порожній варіант «Всі» лишається),
// але при відкритті сторінки має бути обраний перший зі списку. Чекання тут
// одноразове: щойно фільтр підставив своє значення, користувач може повернутись
// до «Всі», і це вже нормальний стан, а не «ще не готово».
const pendingFilters = ref(
  new Set(props.filterConfig.filter((f) => f.defaultFirstOption).map((f) => f.key))
)
for (const f of props.filterConfig) {
  if (!f.defaultFirstOption) continue
  watch(filters[f.key], (v) => {
    if (v === '' || v === null || v === undefined) return
    if (!pendingFilters.value.has(f.key)) return
    const next = new Set(pendingFilters.value)
    next.delete(f.key)
    pendingFilters.value = next
  })
}

const filtersReady = computed(() =>
  pendingFilters.value.size === 0 &&
  requiredFilters.every((f) => {
    const v = filters[f.key].value
    return v !== '' && v !== null && v !== undefined
  })
)

let debounceTimer = null
function scheduleLoad(immediate) {
  clearTimeout(debounceTimer)
  if (!filtersReady.value) return
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

// ── Створення запису ─────────────────────────────────────────────────────
// Форма збирається з конфіга: поля — createFields, контроли — з реєстру
// cellTypes (той самий, що малює комірки таблиці). Нового коду на кожен тип
// поля не потрібно.
const canCreate = computed(
  () => !!props.apiCreate && (!props.createPermission || auth.can(props.createPermission))
)

const createColumns = computed(() =>
  props.createFields
    .map((key) => props.columnsConfig.find((c) => c.key === key))
    .filter(Boolean)
)

const createOpen   = ref(false)
const creating     = ref(false)
const createForm   = ref({})
const createErrors = ref({})

function blankForm() {
  const form = {}
  for (const col of createColumns.value) {
    // select без явного вибору відправив би порожнє значення, хоч у списку
    // візуально вибрано перший пункт — тому одразу беремо перший варіант
    if (col.type === 'select') form[col.key] = col.options?.[0]?.value ?? ''
    else if (col.type === 'boolean') form[col.key] = false
    else form[col.key] = ''
  }
  return form
}

function openCreate() {
  createForm.value = blankForm()
  createErrors.value = {}
  createOpen.value = true
}

async function submitCreate() {
  creating.value = true
  createErrors.value = {}
  try {
    const res = await fetch(props.apiCreate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
      body: JSON.stringify(createForm.value),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Бекенд може повернути errors: { поле: "текст" } — показуємо біля поля,
      // а не одним тостом "перевірте заповнення".
      if (json.errors && typeof json.errors === 'object') createErrors.value = json.errors
      throw new Error(json.message ?? `Помилка створення (HTTP ${res.status})`)
    }
    createOpen.value = false
    notify('Запис створено', { type: 'success' })
    await load(1)
  } catch (e) {
    notify(e.message, { type: 'error' })
  } finally {
    creating.value = false
  }
}

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
      labelTemplate: c.optionsLabelTemplate ?? null,
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
          labelTemplate: col.optionsLabelTemplate ?? null,
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
        params.set(f.param ?? f.key, v)
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
      params.set(f.param ?? f.key, v)
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

// Іменована масова дія — одним запитом на bulk-роут (на відміну від
// applyBulkUpdate, який шле PATCH на кожен id). Undo тут немає навмисно:
// activate/deactivate не деструктивні й скасовуються зворотною дією.
async function applyNamedBulk(action) {
  if (!props.apiBulk || !selected.value.length) return

  const ids = [...selected.value]
  bulkApplying.value = true
  try {
    const res = await fetch(props.apiBulk, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
      body: JSON.stringify({ ids, action: action.action }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message ?? `Помилка виконання дії (HTTP ${res.status})`)

    notify(`${action.label}: ${json.affected ?? ids.length} запис(ів)`, { type: 'success' })
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

// Видимість дії рядка: право (з JSON) плюс необовʼязковий предикат `visible(row)`,
// який сторінка додає до конфіга в коді — так само, як React додає `handler`.
// Потрібен там, де правило залежить від рядка, а не лише від ролі: напр. запис,
// який користувач щойно створив, він може відкрити на редагування й без права
// редагування взагалі.
// Дзеркало React: DataTable.tsx → isActionVisible.
function isActionVisible(action, row) {
  if (action.permission && !auth.can(action.permission)) return false
  return action.visible ? !!action.visible(row) : true
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

/**
 * Змінити значення фільтра ззовні — напр. клік по IP в комірці ставить цей IP
 * у фільтр. Перезавантаження запускає той самий watch, що й ручна зміна поля.
 */
function setFilter(key, value) {
  if (!(key in filters)) {
    console.warn(`[list-framework] setFilter: фільтра "${key}" немає в конфігу`)
    return
  }
  filters[key].value = value
}

defineExpose({ reload: () => load(page.value), setFilter })

onMounted(() => {
  urlFilters.initFromUrl()
  // Якщо обовʼязковий фільтр ще порожній — перший запит зробить watch на ньому,
  // щойно фільтр підставить своє значення (див. filtersReady вище).
  if (filtersReady.value) load(page.value)
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
