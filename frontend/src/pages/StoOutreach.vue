<template>
  <BaseLayout>
    <div class="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
      <h5 class="mb-0">Розсилка СТО</h5>
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <span class="text-muted small">Без менеджерів: {{ total }}</span>
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          style="width:200px"
          placeholder="Пошук за назвою / email..."
          @input="debounceLoad"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
    <template v-else>

      <!-- Table -->
      <div class="card shadow-sm mb-3">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:36px">
                  <input type="checkbox" class="form-check-input" :checked="allChecked" :indeterminate.prop="someChecked" @change="toggleAll" />
                </th>
                <th style="width:50px" class="text-muted text-end">ID</th>
                <th>Назва СТО</th>
                <th>Email</th>
                <th>Телефон</th>
                <th style="width:130px">Остання розсилка</th>
                <th style="width:140px">Відповідь</th>
                <th style="width:36px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in items" :key="row.id">
                <tr :class="{ 'table-active': selected.has(row.id), 'text-muted': emailChannelDisabled(row) }">
                  <td>
                    <input
                      type="checkbox"
                      class="form-check-input"
                      :checked="selected.has(row.id)"
                      :disabled="emailChannelDisabled(row)"
                      :title="emailChannelDisabled(row) ? 'Email не вказано' : ''"
                      @change="toggleRow(row.id)"
                    />
                  </td>
                  <td class="text-muted text-end">{{ row.id }}</td>
                  <td>
                    <div class="fw-medium">{{ row.name_uk }}</div>
                    <span class="badge bg-secondary" style="font-size:.65rem">{{ typeLabel(row.sto_type) }}</span>
                  </td>
                  <td>
                    <span v-if="row.email" class="font-monospace" style="font-size:.8rem">{{ row.email }}</span>
                    <span v-else class="text-muted">—</span>
                  </td>
                  <td>{{ row.main_phone ?? '—' }}</td>
                  <td>
                    <template v-if="row.last_outreach_at">
                      <div style="font-size:.75rem">{{ row.last_outreach_at.slice(0,10) }}</div>
                      <span class="badge bg-secondary" style="font-size:.65rem">{{ row.outreach_count }}×</span>
                    </template>
                    <span v-else class="text-muted small">Не надсилалось</span>
                  </td>
                  <td>
                    <span v-if="row.last_response_status" class="badge" :class="responseBadge(row.last_response_status)" style="font-size:.7rem">
                      {{ responseLabel(row.last_response_status) }}
                    </span>
                    <span v-else class="text-muted small">—</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary py-0 px-1" title="Історія" @click="toggleHistory(row)">
                      <i class="bi bi-clock-history"></i>
                    </button>
                  </td>
                </tr>

                <!-- History row -->
                <tr v-if="historyOpenId === row.id">
                  <td colspan="8" class="p-0">
                    <div class="bg-light border-bottom px-4 py-3">
                      <div v-if="historyLoading" class="text-center py-2">
                        <div class="spinner-border spinner-border-sm text-secondary"></div>
                      </div>
                      <div v-else-if="!historyItems.length" class="text-muted small">Розсилок не було</div>
                      <table v-else class="table table-sm mb-0 small">
                        <thead class="table-light">
                          <tr>
                            <th style="width:110px">Дата</th>
                            <th style="width:90px">Канал</th>
                            <th style="width:100px">Контакт</th>
                            <th style="width:90px">Статус</th>
                            <th style="width:140px">Відповідь</th>
                            <th>Примітка</th>
                            <th style="width:36px"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="h in historyItems" :key="h.id">
                            <td class="text-muted">{{ formatDate(h.sent_at) }}</td>
                            <td>
                              <span class="badge" :class="channelBadge(h.channel)">{{ channelLabel(h.channel) }}</span>
                            </td>
                            <td class="text-muted" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ h.contact_value ?? '—' }}</td>
                            <td>
                              <span class="badge" :class="statusBadge(h.status)">{{ statusLabel(h.status) }}</span>
                            </td>
                            <td>
                              <template v-if="editingResponseId === h.id">
                                <select v-model="editingResponseStatus" class="form-select form-select-sm mb-1">
                                  <option v-for="s in RESPONSE_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                                </select>
                                <input v-model="editingResponseNote" type="text" class="form-control form-control-sm mb-1" placeholder="Примітка..." />
                                <div class="d-flex gap-1">
                                  <button class="btn btn-sm btn-primary py-0" :disabled="savingResponse" @click="saveResponse(h, row)">
                                    <span v-if="savingResponse" class="spinner-border spinner-border-sm"></span>
                                    <span v-else>Зберегти</span>
                                  </button>
                                  <button class="btn btn-sm btn-outline-secondary py-0" @click="editingResponseId = null">✕</button>
                                </div>
                              </template>
                              <template v-else>
                                <span class="badge" :class="responseBadge(h.response_status)">{{ responseLabel(h.response_status) }}</span>
                              </template>
                            </td>
                            <td class="text-muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                              {{ h.response_note ?? '' }}
                            </td>
                            <td>
                              <button class="btn btn-sm btn-outline-secondary py-0 px-1" title="Зафіксувати відповідь" @click="startEditResponse(h)">
                                <i class="bi bi-pencil"></i>
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="!items.length">
                <td colspan="8" class="text-center text-muted py-4">СТО не знайдено</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <span class="text-muted small">Всього: {{ total }}</span>
        <nav v-if="totalPages > 1">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: page === 1 }">
              <button class="page-link" @click="load(page - 1)">‹</button>
            </li>
            <li v-for="p in visiblePages" :key="p" class="page-item" :class="{ active: p === page }">
              <button class="page-link" @click="load(p)">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: page === totalPages }">
              <button class="page-link" @click="load(page + 1)">›</button>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Send panel -->
      <div class="card shadow-sm">
        <div class="card-header py-2 px-4">
          <div class="d-flex align-items-center justify-content-between">
            <span class="fw-semibold small">
              <i class="bi bi-send me-1"></i>
              Відправити обраним
              <span class="badge bg-primary ms-1">{{ selected.size }}</span>
            </span>
            <div class="d-flex gap-2">
              <label v-for="ch in CHANNELS" :key="ch.value" class="me-2 small">
                <input type="radio" v-model="channel" :value="ch.value" class="form-check-input me-1" />
                {{ ch.label }}
              </label>
            </div>
          </div>
        </div>
        <div class="card-body px-4 py-3">
          <div v-if="channel === 'email'" class="mb-2">
            <label class="form-label small mb-1">Тема листа</label>
            <input v-model="subject" type="text" class="form-control form-control-sm" />
          </div>
          <div class="mb-2">
            <label class="form-label small mb-1">
              <template v-if="channel === 'email'">Текст листа (HTML)</template>
              <template v-else-if="channel === 'sms'">Текст SMS</template>
              <template v-else>Нотатки до дзвінка</template>
            </label>
            <textarea v-model="message" class="form-control form-control-sm font-monospace"
                      :rows="channel === 'email' ? 6 : 3"></textarea>
          </div>

          <div v-if="sendResult" class="alert py-2 small mb-2"
               :class="sendResult.failed > 0 ? 'alert-warning' : 'alert-success'">
            <span v-if="channel !== 'phone_call'">
              Відправлено: <strong>{{ sendResult.sent }}</strong>
              <template v-if="sendResult.failed"> / Помилок: <strong>{{ sendResult.failed }}</strong></template>
            </span>
            <span v-else>Зафіксовано дзвінків: <strong>{{ sendResult.sent }}</strong></span>
            <ul v-if="failedResults.length" class="mb-0 mt-1">
              <li v-for="r in failedResults" :key="r.sto_id">СТО #{{ r.sto_id }}: {{ r.message }}</li>
            </ul>
          </div>
          <div v-if="sendError" class="alert alert-danger py-2 small mb-2">{{ sendError }}</div>

          <button
            class="btn btn-primary btn-sm"
            :disabled="sending || selected.size === 0 || !message.trim()"
            @click="doSend"
          >
            <span v-if="sending" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-send me-1"></i>
            <template v-if="channel === 'phone_call'">Зафіксувати дзвінок</template>
            <template v-else>Відправити ({{ selected.size }})</template>
          </button>
        </div>
      </div>

    </template>
  </BaseLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { formatDate } from '@/utils/date'

const { authHeaders } = useAuth()

// ── Constants ─────────────────────────────────────────────────────────────────
const STO_TYPES = {
  individual:  'Індивідуальне',
  company:     'Компанія',
  network:     'Мережа',
  specialized: 'Спеціалізоване',
  mobile:      'Мобільне',
}
function typeLabel(v) { return STO_TYPES[v] ?? v ?? '—' }

const CHANNELS = [
  { value: 'email',      label: 'Email' },
  { value: 'sms',        label: 'SMS' },
  { value: 'phone_call', label: 'Дзвінок' },
]

const RESPONSE_STATUSES = [
  { value: 'pending',            label: 'Очікує' },
  { value: 'interested',         label: 'Зацікавлений' },
  { value: 'not_interested',     label: 'Не зацікавлений' },
  { value: 'registered',         label: 'Зареєструвався' },
  { value: 'callback_requested', label: 'Передзвонити' },
  { value: 'no_response',        label: 'Не відповів' },
]

// ── List state ────────────────────────────────────────────────────────────────
const items      = ref([])
const loading    = ref(true)
const error      = ref(null)
const page       = ref(1)
const total      = ref(0)
const totalPages = ref(1)
const search     = ref('')

const selected = ref(new Set())

function emailChannelDisabled(row) {
  return channel.value === 'email' && !row.email
}

const selectableItems = computed(() => items.value.filter(r => !emailChannelDisabled(r)))
const allChecked  = computed(() => selectableItems.value.length > 0 && selectableItems.value.every(r => selected.value.has(r.id)))
const someChecked = computed(() => selectableItems.value.some(r => selected.value.has(r.id)) && !allChecked.value)

function toggleAll() {
  const s = new Set(selected.value)
  if (allChecked.value) {
    selectableItems.value.forEach(r => s.delete(r.id))
  } else {
    selectableItems.value.forEach(r => s.add(r.id))
  }
  selected.value = s
}

function toggleRow(id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}

const visiblePages = computed(() => {
  const range = 5
  const half  = Math.floor(range / 2)
  let start   = Math.max(1, page.value - half)
  let end     = Math.min(totalPages.value, start + range - 1)
  if (end - start < range - 1) start = Math.max(1, end - range + 1)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 350)
}

// Templates from API (loaded once)
const templates = ref({ email: { subject: '', body: '' }, sms: { body: '' } })

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const params = new URLSearchParams({ page: p, per_page: 50 })
    if (search.value.trim()) params.set('search', search.value.trim())
    const res  = await fetch(`/api/admin/outreach/sto?${params}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    items.value      = json.data ?? []
    total.value      = json.pagination?.total ?? 0
    totalPages.value = json.pagination?.total_pages ?? 1
    if (json.templates) {
      templates.value = json.templates
      if (!subject.value) subject.value = json.templates.email?.subject ?? ''
      if (!message.value) message.value = json.templates.email?.body    ?? ''
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── History ───────────────────────────────────────────────────────────────────
const historyOpenId  = ref(null)
const historyLoading = ref(false)
const historyItems   = ref([])

async function toggleHistory(row) {
  if (historyOpenId.value === row.id) {
    historyOpenId.value = null
    return
  }
  historyOpenId.value = row.id
  historyLoading.value = true
  historyItems.value   = []
  try {
    const res  = await fetch(`/api/admin/outreach/sto/${row.id}/history`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    historyItems.value = json.data ?? []
  } catch (e) {
    historyItems.value = []
  } finally {
    historyLoading.value = false
  }
}

// ── Response editing ──────────────────────────────────────────────────────────
const editingResponseId     = ref(null)
const editingResponseStatus = ref('pending')
const editingResponseNote   = ref('')
const savingResponse        = ref(false)

function startEditResponse(h) {
  editingResponseId.value     = h.id
  editingResponseStatus.value = h.response_status ?? 'pending'
  editingResponseNote.value   = h.response_note   ?? ''
}

async function saveResponse(h, row) {
  savingResponse.value = true
  try {
    const res  = await fetch(`/api/admin/outreach/${h.id}/response`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ response_status: editingResponseStatus.value, response_note: editingResponseNote.value }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    h.response_status = json.data.response_status
    h.response_note   = json.data.response_note
    h.response_at     = json.data.response_at
    // Update last_response_status in main list
    row.last_response_status = json.data.response_status
    editingResponseId.value  = null
  } catch (e) {
    alert('Помилка: ' + e.message)
  } finally {
    savingResponse.value = false
  }
}

// ── Send panel ────────────────────────────────────────────────────────────────
const channel    = ref('email')
const subject    = ref('')
const message    = ref('')
const sending    = ref(false)
const sendResult = ref(null)
const sendError  = ref(null)

const failedResults = computed(() => (sendResult.value?.results ?? []).filter(r => r.status === 'failed'))

// Sync message template when channel changes
function onChannelChange() {
  if (channel.value === 'email') {
    subject.value = templates.value.email?.subject ?? ''
    message.value = templates.value.email?.body    ?? ''
    // Deselect STOs without email
    const s = new Set(selected.value)
    items.value.filter(r => !r.email).forEach(r => s.delete(r.id))
    selected.value = s
  } else if (channel.value === 'sms') {
    subject.value = ''
    message.value = templates.value.sms?.body ?? ''
  } else {
    subject.value = ''
    message.value = ''
  }
  sendResult.value = null
}

// Watch channel manually via a watcher
import { watch } from 'vue'
watch(channel, onChannelChange)

async function doSend() {
  if (selected.value.size === 0 || !message.value.trim()) return
  sending.value    = true
  sendResult.value = null
  sendError.value  = null
  try {
    const res  = await fetch('/api/admin/outreach/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({
        sto_ids: [...selected.value],
        channel: channel.value,
        subject: subject.value,
        message: message.value,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    sendResult.value = json
    // Refresh list to update last_outreach_at
    await load(page.value)
    selected.value = new Set()
  } catch (e) {
    sendError.value = e.message
  } finally {
    sending.value = false
  }
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
function channelLabel(v) {
  return { email: 'Email', sms: 'SMS', phone_call: 'Дзвінок' }[v] ?? v
}
function channelBadge(v) {
  return { email: 'bg-info text-dark', sms: 'bg-warning text-dark', phone_call: 'bg-secondary' }[v] ?? 'bg-secondary'
}
function statusLabel(v) {
  return { sent: 'Надіслано', failed: 'Помилка', no_answer: 'Не відповів' }[v] ?? v
}
function statusBadge(v) {
  return { sent: 'bg-success', failed: 'bg-danger', no_answer: 'bg-secondary' }[v] ?? 'bg-secondary'
}
function responseLabel(v) {
  return RESPONSE_STATUSES.find(s => s.value === v)?.label ?? v ?? '—'
}
function responseBadge(v) {
  const map = {
    pending:            'bg-secondary',
    interested:         'bg-info text-dark',
    not_interested:     'bg-danger',
    registered:         'bg-success',
    callback_requested: 'bg-warning text-dark',
    no_response:        'bg-dark',
  }
  return map[v] ?? 'bg-secondary'
}

load()
</script>
