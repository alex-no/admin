<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="analytics-details-modal"
    :default-width="700"
    :min-width="500"
    :max-width="1200"
    :default-height="400"
    :min-height="300"
    :max-height="800"
  >
    <template #title>
      <h5 class="mb-0">
        Детальна інформація про візит <span class="text-muted fw-normal fs-6">#{{ pageviewId }}</span>
      </h5>
    </template>

    <template #subheader>
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
    </template>

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

    <template #footer>
      <div class="text-muted small">IP: {{ data?.ip || '—' }}</div>
      <button type="button" class="btn btn-sm btn-secondary" @click="close">Закрити</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import BaseModal from './BaseModal.vue'
import ModalContent from './AnalyticsDetailsModalContent.vue'

// Тут лишилась тільки бізнес-логіка цієї картки (завантаження даних, мережеві
// інструменти, вкладки). Все, що стосується самого вікна — floating/docked
// режими, drag, resize, зсув контенту сторінки — тепер повністю всередині
// BaseModal.vue, один раз, а не копією в кожній картці.
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

// Сповіщаємо решту сторінки, що картку закрито (Analytics.vue скидає detailId в URL) —
// незалежно від того, як саме закрили: хрестик/бекдроп/Escape всередині BaseModal,
// чи кнопка "Закрити" в футері нижче.
watch(visible, (val, wasVisible) => {
  if (wasVisible && !val) {
    window.dispatchEvent(new CustomEvent('analytics-details-closed'))
  }
})

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
}

onMounted(() => {
  window.addEventListener('show-analytics-details', (e) => {
    if (e.detail?.id) open(e.detail.id)
  })
})

defineExpose({ open, close })
</script>

<style scoped>
.nav-tabs .nav-link.active {
  background-color: #f8f9fa !important;
}
</style>

