import { useEffect, useRef } from 'react'

interface UseListPollingOptions {
  /** async () => Promise<void>, обходить кеш */
  revalidate: () => Promise<void>
  /** інтервал між опитуваннями (мс) */
  intervalMs?: number
  /** пауза (модалка відкрита / є pending мутації) */
  paused?: boolean
  /** перемикач «Автооновлення» */
  enabled?: boolean
}

/**
 * Тихе автооновлення списку через polling.
 *
 * Свідомо НЕ WebSocket: для черг модерації (запис прилітає раз на кілька хвилин)
 * різниці немає, а WS вимагає нового довгоживучого сервісу в docker-compose.
 */
export function useListPolling({
  revalidate,
  intervalMs = 60000,
  paused = false,
  enabled = true,
}: UseListPollingOptions) {
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const revalidateRef = useRef(revalidate)

  // Keep revalidate ref up to date
  useEffect(() => {
    revalidateRef.current = revalidate
  }, [revalidate])

  useEffect(() => {
    function shouldPoll() {
      if (!enabled) return false
      if (paused) return false
      // Неактивна вкладка — не опитуємо (8 відкритих вкладок не довбають бекенд)
      return document.visibilityState === 'visible'
    }

    async function tick() {
      if (shouldPoll()) {
        await revalidateRef.current()
      }
    }

    function onVisibility() {
      // Вкладка стала активною — опитати одразу
      if (document.visibilityState === 'visible' && shouldPoll()) {
        tick()
      }
    }

    // Start polling
    if (enabled && !paused) {
      timerIdRef.current = setInterval(tick, intervalMs)
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current)
        timerIdRef.current = null
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, paused, intervalMs])
}
