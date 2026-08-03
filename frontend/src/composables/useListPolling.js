// Copyright (c) 2026 Oleksandr Nosov. MIT License.

import { onMounted, onUnmounted, watch } from 'vue'

/**
 * Тихе автооновлення списку через polling.
 *
 * Свідомо НЕ WebSocket: для черг модерації (запис прилітає раз на кілька хвилин)
 * різниці немає, а WS вимагає нового довгоживучого сервісу в docker-compose.
 * Див. react-admin-parity/12-realtime-updates.md (Tier 2).
 *
 * @param {Object} opts
 * @param {Function} opts.revalidate      - async () => Promise<void>, обходить кеш
 * @param {number} [opts.intervalMs=60000] - інтервал між опитуваннями (мс)
 * @param {import('vue').Ref<boolean>} [opts.paused]   - пауза (модалка відкрита / є pending мутації)
 * @param {import('vue').Ref<boolean>} [opts.enabled]  - перемикач «Автооновлення»
 */
export function useListPolling({
  revalidate,
  intervalMs = 60000,
  paused,
  enabled,
}) {
  let timerId = null

  function shouldPoll() {
    if (enabled && !enabled.value) return false
    if (paused && paused.value) return false
    // Неактивна вкладка — не опитуємо (8 відкритих вкладок не довбають бекенд)
    return document.visibilityState === 'visible'
  }

  async function tick() {
    if (shouldPoll()) {
      await revalidate()
    }
  }

  function start() {
    stop()
    timerId = setInterval(tick, intervalMs)
  }

  function stop() {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }

  function onVisibility() {
    // Вкладка стала активною — опитати одразу
    if (document.visibilityState === 'visible' && shouldPoll()) {
      tick()
    }
  }

  onMounted(() => {
    start()
    document.addEventListener('visibilitychange', onVisibility)
  })

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  // Перемикач автооновлення
  if (enabled) {
    watch(enabled, (v) => (v ? start() : stop()))
  }

  return { start, stop }
}
