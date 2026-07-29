import { useSyncExternalStore } from 'react'

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
  type?: NotifyType
  /** мс до автозакриття, 0 = не закривати автоматично */
  duration?: number
  /** кнопка всередині тоста (напр. "Скасувати") */
  action?: NotifyAction | null
}

// Глобальний стан поза React (модульний singleton — той самий підхід, що й у Vue-версії),
// щоб notify() можна було викликати звідки завгодно: з хуків, з утиліт, з обробників помилок,
// не прокидуючи пропси чи провайдери.
let notifications: Notification[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Масив замінюється новим, а не мутується — інакше useSyncExternalStore
// не побачить зміни (порівнює за посиланням).
function getSnapshot() {
  return notifications
}

/**
 * Показати тост. Повертає id — для ручного dismiss().
 */
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

export function dismiss(id: number) {
  notifications = notifications.filter(n => n.id !== id)
  emit()
}

/** Підписка на список тостів — для ToastContainer */
export function useNotifications(): Notification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Форма, як у Vue-композабла */
export function useNotify() {
  return { notify, dismiss }
}
