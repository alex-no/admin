<template>
  <Teleport to="body">
    <!-- Backdrop только для floating режима -->
    <div
      v-if="visible && mode === 'floating'"
      class="modal-backdrop-simple"
      @click="close"
    ></div>

    <!-- Модальное окно -->
    <div
      v-if="visible"
      ref="modalRef"
      class="modal-window"
      :class="[
        `modal-window--${mode}`,
        cursorClass,
      ]"
      :style="mode === 'floating' ? floatingStyle : mode === 'docked-right' ? dockedRightStyle : dockedBottomStyle"
    >
      <!-- Resize handle для docked режимов -->
      <div
        v-if="mode === 'docked-right'"
        class="resize-handle resize-handle--left"
        @mousedown="startResize"
      ></div>
      <div
        v-if="mode === 'docked-bottom'"
        class="resize-handle resize-handle--top"
        @mousedown="startResize"
      ></div>

      <div class="card shadow h-100 d-flex flex-column" style="overflow:hidden; border-radius: 0;">
        <div
          class="card-header d-flex justify-content-between align-items-center py-2 px-4"
          :class="isDraggable ? 'cursor-grab' : ''"
          @mousedown="isDraggable && modalRef ? startDrag($event, modalRef) : null"
        >
          <h5 class="mb-0">
            Детальна інформація про візит <span class="text-muted fw-normal fs-6">#{{ pageviewId }}</span>
          </h5>
          <div class="d-flex gap-2 align-items-center">
            <button
              class="btn btn-sm btn-outline-secondary"
              @mousedown.stop
              @click="cycleMode"
              :title="getModeSwitchTitle()"
            >
              <i :class="getModeIcon()"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" @mousedown.stop @click="close">✕</button>
          </div>
        </div>

        <div class="border-bottom px-3 pt-1" style="flex-shrink:0; background:#fff">
          <ul class="nav nav-tabs border-0">
            <li class="nav-item">
              <button class="nav-link py-2 px-2 small text-nowrap" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">
                <i class="bi bi-info-circle me-1"></i>Інформація
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link py-2 px-2 small text-nowrap" :class="{ active: activeTab === 'network' }" @click="activeTab = 'network'">
                <i class="bi bi-hdd-network me-1"></i>Мережа
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link py-2 px-2 small text-nowrap" :class="{ active: activeTab === 'tools' }" @click="activeTab = 'tools'">
                <i class="bi bi-tools me-1"></i>Діагностика
              </button>
            </li>
          </ul>
        </div>

        <div class="card-body px-4 py-3" style="flex:1; overflow-y:auto">
          <ModalContent
            :loading="loading"
            :error="error"
            :data="data"
            :activeTab="activeTab"
            :ipInfo="ipInfo"
            :loadingIpInfo="loadingIpInfo"
            :pingResult="pingResult"
            :loadingPing="loadingPing"
            :tracerouteResult="tracerouteResult"
            :loadingTraceroute="loadingTraceroute"
            :reverseDnsResult="reverseDnsResult"
            :loadingReverseDns="loadingReverseDns"
            :blacklistResult="blacklistResult"
            :loadingBlacklist="loadingBlacklist"
            :httpHeadersResult="httpHeadersResult"
            :loadingHttpHeaders="loadingHttpHeaders"
            @run-ping="runPing"
            @run-traceroute="runTraceroute"
            @run-reverse-dns="runReverseDns"
            @run-blacklist="runBlacklistCheck"
            @run-http-headers="runHttpHeaders"
            @filter-by-ip="filterByThisIp"
          />
        </div>

        <div class="card-footer px-4 py-2 bg-light d-flex justify-content-between align-items-center">
          <div class="text-muted small">IP: {{ data?.ip || '—' }}</div>
          <button type="button" class="btn btn-sm btn-secondary" @click="close">Закрити</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useModalWindow } from '../composables/useModalWindow'
import ModalContent from './AnalyticsDetailsModalContent.vue'

// Component state
const visible = ref(false)
const pageviewId = ref(null)
const loading = ref(false)
const error = ref('')
const data = ref(null)
const activeTab = ref('info')
const ipInfo = ref(null)
const loadingIpInfo = ref(false)
const pingResult = ref('')
const loadingPing = ref(false)
const tracerouteResult = ref('')
const loadingTraceroute = ref(false)
const reverseDnsResult = ref(null)
const loadingReverseDns = ref(false)
const blacklistResult = ref(null)
const loadingBlacklist = ref(false)
const httpHeadersResult = ref(null)
const loadingHttpHeaders = ref(false)
const modalRef = ref(null)

// Modal window composable
const {
  mode,
  floatingStyle,
  dockedRightStyle,
  dockedBottomStyle,
  contentMargin,
  cursorClass,
  isDragging,
  isDraggable,
  startDrag,
  startResize,
  cycleMode,
} = useModalWindow({
  storageKey: 'analytics-details-modal',
  mode: 'floating',
  defaultWidth: 700,
  minWidth: 500,
  maxWidth: 1200,
  defaultHeight: 400,
  minHeight: 300,
  maxHeight: 800,
})

// Отправляем событие об изменении margin для родительской страницы
watch([visible, contentMargin], () => {
  if (visible.value) {
    window.dispatchEvent(
      new CustomEvent('modal-content-margin-change', {
        detail: contentMargin.value,
      })
    )
  } else {
    // Сбрасываем margin при закрытии
    window.dispatchEvent(
      new CustomEvent('modal-content-margin-change', {
        detail: {},
      })
    )
  }
}, { deep: true })

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function loadPageview() {
  if (!pageviewId.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/admin/analytics/pageview/${pageviewId.value}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.status === 'success') {
      data.value = json.data
      if (json.data.ip) loadIpInfo(json.data.ip)
    } else {
      error.value = json.message || 'Помилка'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function isPrivateIP(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false

  // 10.0.0.0 – 10.255.255.255
  if (parts[0] === 10) return true

  // 172.16.0.0 – 172.31.255.255
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true

  // 192.168.0.0 – 192.168.255.255
  if (parts[0] === 192 && parts[1] === 168) return true

  // 127.0.0.0 – 127.255.255.255 (localhost)
  if (parts[0] === 127) return true

  return false
}

async function loadIpInfo(ip) {
  loadingIpInfo.value = true
  ipInfo.value = null

  // Перевіряємо чи це приватний IP - не робимо запит взагалі
  if (isPrivateIP(ip)) {
    ipInfo.value = {
      error: true,
      message: 'Приватний IP (локальна мережа)'
    }
    loadingIpInfo.value = false
    return
  }

  try {
    const res = await fetch(`/api/admin/network-tools/ip-info/${ip}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.status === 'success') {
      ipInfo.value = json.data
    } else {
      ipInfo.value = {
        error: true,
        message: json.message
      }
    }
  } catch (e) {
    ipInfo.value = { error: true, message: e.message }
  } finally {
    loadingIpInfo.value = false
  }
}

async function runPing() {
  if (!data.value?.ip) return
  loadingPing.value = true
  try {
    const res = await fetch(`/api/admin/network-tools/ping/${data.value.ip}`, { headers: authHeaders() })
    const json = await res.json()
    pingResult.value = json.data?.output || json.message || 'Помилка'
  } finally {
    loadingPing.value = false
  }
}

async function runTraceroute() {
  if (!data.value?.ip) return
  loadingTraceroute.value = true
  try {
    const res = await fetch(`/api/admin/network-tools/traceroute/${data.value.ip}`, { headers: authHeaders() })
    const json = await res.json()
    tracerouteResult.value = json.data?.output || json.message || 'Помилка'
  } finally {
    loadingTraceroute.value = false
  }
}

async function runReverseDns() {
  if (!data.value?.ip) return
  loadingReverseDns.value = true
  reverseDnsResult.value = null
  try {
    const res = await fetch(`/api/admin/network-tools/reverse-dns/${data.value.ip}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.status === 'success') {
      reverseDnsResult.value = json.data
    } else {
      reverseDnsResult.value = { ip: data.value.ip, hostname: null, error: json.message }
    }
  } finally {
    loadingReverseDns.value = false
  }
}

async function runBlacklistCheck() {
  if (!data.value?.ip) return
  loadingBlacklist.value = true
  blacklistResult.value = null
  try {
    const res = await fetch(`/api/admin/network-tools/blacklist-check/${data.value.ip}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.status === 'success') {
      blacklistResult.value = json.data
    } else {
      alert(json.message || 'Помилка перевірки blacklist')
    }
  } finally {
    loadingBlacklist.value = false
  }
}

async function runHttpHeaders() {
  if (!data.value?.ip) return
  loadingHttpHeaders.value = true
  httpHeadersResult.value = null
  try {
    const res = await fetch(`/api/admin/network-tools/http-headers/${data.value.ip}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.status === 'success') {
      httpHeadersResult.value = json.data
    } else {
      // Показуємо помилку як об'єкт з повідомленням
      httpHeadersResult.value = {
        error: true,
        message: json.message || 'Помилка отримання HTTP headers',
        ip: data.value.ip
      }
    }
  } catch (e) {
    httpHeadersResult.value = {
      error: true,
      message: e.message,
      ip: data.value.ip
    }
  } finally {
    loadingHttpHeaders.value = false
  }
}

function filterByThisIp() {
  if (!data.value?.ip) return
  window.dispatchEvent(new CustomEvent('filter-analytics-by-ip', { detail: { ip: data.value.ip } }))
  close()
}

function open(id) {
  pageviewId.value = id
  visible.value = true
  activeTab.value = 'info'
  // Clear previous diagnostic results
  pingResult.value = ''
  tracerouteResult.value = ''
  reverseDnsResult.value = null
  blacklistResult.value = null
  httpHeadersResult.value = null
  loadPageview()
}

function close() {
  visible.value = false
  window.dispatchEvent(new CustomEvent('analytics-details-closed'))
}

function getModeIcon() {
  if (mode.value === 'floating') return 'bi bi-layout-sidebar-reverse'
  if (mode.value === 'docked-right') return 'bi bi-window-dock'
  if (mode.value === 'docked-bottom') return 'bi bi-window'
  return 'bi bi-window'
}

function getModeSwitchTitle() {
  if (mode.value === 'floating') return 'Закріпити справа'
  if (mode.value === 'docked-right') return 'Закріпити знизу'
  if (mode.value === 'docked-bottom') return 'Відкріпити (плаваюче вікно)'
  return 'Змінити режим'
}

onMounted(() => {
  window.addEventListener('show-analytics-details', (e) => {
    if (e.detail?.id) open(e.detail.id)
  })
})

defineExpose({ open, close })
</script>

<style scoped>
/* Backdrop для floating режима */
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1049;
}

/* Базовые стили модального окна */
.modal-window {
  position: fixed;
  z-index: 1050;
}

/* Floating режим */
.modal-window--floating {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 1100px;
  max-height: 88vh;
  width: 90vw;
}

/* Docked right */
.modal-window--docked-right {
  top: 0;
  right: 0;
  bottom: 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

/* Docked bottom */
.modal-window--docked-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* Resize handles */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle--left {
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle--top {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle:hover {
  background: rgba(13, 110, 253, 0.3);
}

.resize-handle:active {
  background: rgba(13, 110, 253, 0.5);
}

/* Курсоры */
.cursor-grab {
  cursor: grab;
  user-select: none;
}

.cursor-grabbing,
.cursor-grabbing * {
  cursor: grabbing !important;
  user-select: none;
}

.cursor-resizing-x,
.cursor-resizing-x * {
  cursor: ew-resize !important;
  user-select: none;
}

.cursor-resizing-y,
.cursor-resizing-y * {
  cursor: ns-resize !important;
  user-select: none;
}

.card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.nav-tabs .nav-link.active {
  background-color: #f8f9fa !important;
}
</style>
