<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<!--
  Майстер CSV-імпорту: upload → map → preview → result. Поля для зіставлення —
  ті самі createColumns, що й у формі "Додати" (createFields з конфіга сторінки),
  тому новий тип поля автоматично працює і тут, без додаткового коду.
  Парсинг/зіставлення/приведення типів — @core/csv, спільні з React-версією.
-->
<template>
  <BaseModal
    v-model:visible="isVisible"
    storage-key="csv-import-modal"
    :default-width="820"
    :min-width="600"
    :max-width="1200"
    :default-height="560"
    :min-height="360"
    :max-height="800"
    :close-on-backdrop="false"
  >
    <template #title>
      <h5 class="mb-0">{{ t('import.title') }}</h5>
    </template>

    <div v-if="step === 'upload'">
      <p class="text-muted small">{{ t('import.uploadHint') }}</p>
      <input type="file" accept=".csv,text/csv" class="form-control" @change="handleFileSelected" />
      <div v-if="parseError" class="alert alert-danger mt-3 mb-0">{{ parseError }}</div>

      <div class="mt-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <div class="small text-muted">{{ t('import.allowedHeadersTitle') }}</div>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="downloadTemplate">
            <i class="bi bi-download me-1"></i>{{ t('import.downloadTemplate') }}
          </button>
        </div>
        <div class="table-responsive" style="max-height:260px">
          <table class="table table-sm align-middle mb-0">
            <tbody>
              <tr v-for="col in columns" :key="col.key">
                <td>{{ translateLabel(col.label) }}</td>
                <td><code class="text-muted">{{ col.key }}</code></td>
                <td class="text-end">
                  <span v-if="isRequired(col)" class="badge bg-danger">{{ t('import.requiredBadge') }}</span>
                  <span v-else class="badge bg-secondary">{{ t('import.optionalBadge') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="step === 'map'">
      <p class="text-muted small">{{ t('import.mapHint', { count: parsedRows.length }) }}</p>
      <div class="table-responsive" style="max-height:400px">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>{{ t('import.csvColumn') }}</th>
              <th>{{ t('import.targetField') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(header, idx) in parsedHeaders" :key="idx">
              <td><code>{{ header }}</code></td>
              <td>
                <select v-model="mapping[idx]" class="form-select form-select-sm">
                  <option :value="null">{{ t('import.ignoreColumn') }}</option>
                  <option v-for="col in columns" :key="col.key" :value="col.key">{{ translateLabel(col.label) }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="step === 'preview'">
      <p class="text-muted small">{{ t('import.previewHint', { count: previewRows.length }) }}</p>
      <div class="table-responsive" style="max-height:400px">
        <table class="table table-sm table-striped">
          <thead>
            <tr>
              <th v-for="col in mappedColumns" :key="col.key">{{ translateLabel(col.label) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in previewRows" :key="i">
              <td v-for="col in mappedColumns" :key="col.key">{{ formatPreviewValue(row[col.key]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else-if="step === 'result'">
      <div class="alert mb-3" :class="result.failed.length ? 'alert-warning' : 'alert-success'">
        {{ t('import.resultSummary', { created: result.created, total: result.created + result.failed.length }) }}
      </div>
      <div v-if="result.failed.length">
        <div class="table-responsive" style="max-height:320px">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('import.error') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in result.failed" :key="f.row">
                <td>{{ f.csvLine }}</td>
                <td class="text-danger small">{{ formatRowErrors(f.errors) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary mt-2" @click="downloadFailedRows">
          <i class="bi bi-download me-1"></i>{{ t('import.downloadFailed') }}
        </button>
      </div>
    </div>

    <template #footer>
      <div>
        <button
          v-if="step === 'map' || step === 'preview'"
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="step = step === 'map' ? 'upload' : 'map'"
        >
          {{ t('import.back') }}
        </button>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="close">
          {{ step === 'result' ? t('common.close') : t('common.cancel') }}
        </button>
        <button v-if="step === 'map'" type="button" class="btn btn-sm btn-primary" :disabled="!hasMapping" @click="step = 'preview'">
          {{ t('import.next') }}
        </button>
        <button v-if="step === 'preview'" type="button" class="btn btn-sm btn-primary" :disabled="importing" @click="submitImport">
          <span v-if="importing" class="spinner-border spinner-border-sm me-1"></span>{{ t('import.startImport') }}
        </button>
        <button v-if="step === 'result'" type="button" class="btn btn-sm btn-primary" @click="reset">
          {{ t('import.importAnother') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '@/composables/useAuth'
import { useNotify } from '@/composables/useNotify'
import BaseModal from './BaseModal.vue'
import { parseCsv, autoMapImportColumns, buildImportRows, rowsToCsv, downloadCsv } from '@core'

const props = defineProps({
  visible: { type: Boolean, default: false },
  apiImport: { type: String, required: true },
  // Той самий набір полів, що й у формі "Додати" (createColumns у DataListPage.vue).
  columns: { type: Array, required: true },
  // Підмножина ключів columns, обов'язкова для рядка (config: requiredFields) —
  // суто для довідкової таблиці на кроці "upload", саму валідацію робить бекенд.
  requiredFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible', 'imported'])

const { t } = useI18n({ useScope: 'global' })
const auth = useAuth()
const { notify } = useNotify()

const isVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
})

// Закрити хрестиком/бекдропом/Escape теж має скинути майстер — інакше наступне
// відкриття покаже попередній файл чи результат.
watch(isVisible, (val, wasVisible) => {
  if (wasVisible && !val) reset()
})

function isRequired(col) {
  return props.requiredFields.includes(col.key)
}

// Порожній шаблон: лише рядок заголовків (перекладені label, як і решта
// CSV-довідкових файлів тут — див. downloadFailedRows нижче), без рядків
// даних — адмін заповнює сам.
function downloadTemplate() {
  const headers = props.columns.map((c) => translateLabel(c.label))
  downloadCsv('import-template.csv', rowsToCsv(headers, []))
}

function translateLabel(label) {
  if (!label) return ''
  if (label.includes('.')) {
    const translated = t(label)
    return translated !== label ? translated : label
  }
  return label
}

const step = ref('upload') // upload | map | preview | result
const parseError = ref(null)
const parsedHeaders = ref([])
const parsedRows = ref([])
const mapping = ref({})
const importing = ref(false)
const result = ref({ created: 0, failed: [] })

function reset() {
  step.value = 'upload'
  parseError.value = null
  parsedHeaders.value = []
  parsedRows.value = []
  mapping.value = {}
  result.value = { created: 0, failed: [] }
}

function close() {
  isVisible.value = false
}

async function handleFileSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // дозволяє обрати той самий файл повторно (напр. після виправлення)
  if (!file) return

  parseError.value = null
  try {
    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    if (headers.length === 0 || rows.length === 0) {
      parseError.value = t('import.emptyFile')
      return
    }
    parsedHeaders.value = headers
    parsedRows.value = rows
    mapping.value = autoMapImportColumns(headers, props.columns, (col) => translateLabel(col.label))
    step.value = 'map'
  } catch (err) {
    parseError.value = err.message ?? t('import.parseError')
  }
}

const hasMapping = computed(() => Object.values(mapping.value).some((v) => v !== null))

const mappedColumns = computed(() => {
  const usedKeys = new Set(Object.values(mapping.value).filter(Boolean))
  return props.columns.filter((c) => usedKeys.has(c.key))
})

const previewRows = computed(() => buildImportRows(parsedRows.value, mapping.value, props.columns))

function formatPreviewValue(v) {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? t('common.yes') : t('common.no')
  return String(v)
}

// Індекс у previewRows — це індекс у масиві rows, який іде в тілі запиту.
// Бекенд повертає той самий індекс (0-based); у файлі це на 2 більше:
// рядок 1 — заголовок, рядок 2 — перший рядок даних (індекс 0).
function csvLineFor(rowIndex) {
  return rowIndex + 2
}

function formatRowErrors(errors) {
  return Object.values(errors ?? {}).join('; ')
}

async function submitImport() {
  importing.value = true
  try {
    const res = await fetch(props.apiImport, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
      body: JSON.stringify({ rows: previewRows.value }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.status === 'error') {
      throw new Error(json.message ?? `${t('import.importError')} (HTTP ${res.status})`)
    }

    result.value = {
      created: json.created ?? 0,
      failed: (json.failed ?? []).map((f) => ({ ...f, csvLine: csvLineFor(f.row) })),
    }
    step.value = 'result'

    if (result.value.created > 0) {
      notify(t('import.resultSummary', { created: result.value.created, total: result.value.created + result.value.failed.length }), { type: 'success' })
      emit('imported', result.value)
    }
  } catch (err) {
    notify(err.message, { type: 'error' })
  } finally {
    importing.value = false
  }
}

function downloadFailedRows() {
  const headers = [...mappedColumns.value.map((c) => translateLabel(c.label)), t('import.error')]
  const csvRows = result.value.failed.map((f) => {
    const row = previewRows.value[f.row] ?? {}
    return [...mappedColumns.value.map((c) => row[c.key]), formatRowErrors(f.errors)]
  })
  downloadCsv(`import-errors-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(headers, csvRows))
}
</script>
