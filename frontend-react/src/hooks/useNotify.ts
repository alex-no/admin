import { useSyncExternalStore } from 'react'
import {
  notify,
  dismiss,
  getNotifications,
  subscribeNotifications,
  type Notification,
  type NotifyType,
  type NotifyAction,
  type NotifyOptions,
} from '@core/notifications'

export type { Notification, NotifyType, NotifyAction, NotifyOptions }
export { notify, dismiss }

/** Підписка на список тостів — для ToastContainer. Стор — @core/notifications, спільний з Vue. */
export function useNotifications(): Notification[] {
  return useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications)
}

/** Форма, як у Vue-композабла */
export function useNotify() {
  return { notify, dismiss }
}
