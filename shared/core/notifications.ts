/**
 * Тост-стор поза Vue/React (модульний singleton), щоб notify() можна було
 * викликати звідки завгодно — з хуків/композаблів, утиліт, обробників помилок —
 * не прокидуючи пропси чи провайдери. Кожен фронтенд підписується на зміни
 * своїм способом (Vue: ref, оновлюваний у підписці; React: useSyncExternalStore).
 */

export type NotifyType = 'info' | 'success' | 'error'

export interface NotifyAction {
  label: string
  onClick: () => void
}

export interface Notification {
  id: number
  message: string
  type: NotifyType
  duration: number
  action: NotifyAction | null
}

export interface NotifyOptions {
  /** @default 'info' */
  type?: NotifyType
  /** мс до автозакриття, 0 = не закривати автоматично. @default 4000 */
  duration?: number
  /** кнопка всередині тоста (напр. "Скасувати") */
  action?: NotifyAction | null
}

let notifications: Notification[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Підписка на зміни списку тостів. Повертає функцію відписки. */
export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Поточний список тостів (той самий масив, поки нічого не змінилось — для useSyncExternalStore). */
export function getNotifications(): Notification[] {
  return notifications
}

/** Показати тост. Повертає id — для ручного dismiss(). */
export function notify(message: string, options: NotifyOptions = {}): number {
  const { type = 'info', duration = 4000, action = null } = options
  const id = nextId++

  notifications = [...notifications, { id, message, type, duration, action }]
  emit()

  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
  return id
}

export function dismiss(id: number): void {
  notifications = notifications.filter((n) => n.id !== id)
  emit()
}

/** Лише для тестів: скидає стор між прогонами (nextId, накопичені тости). */
export function __resetNotificationsForTests(): void {
  notifications = []
  nextId = 1
  listeners.clear()
}
