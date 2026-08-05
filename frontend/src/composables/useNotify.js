import { ref } from 'vue'
import {
  notify as coreNotify,
  dismiss as coreDismiss,
  getNotifications,
  subscribeNotifications,
} from '@core/notifications'

// Глобальний реактивний стан (модульний singleton — той самий підхід, що й у
// useAuth.js). Стор і сама логіка notify/dismiss — в ядрі (@core/notifications),
// спільні з React; тут лише реактивна обгортка над ним.
const notifications = ref(getNotifications())
subscribeNotifications(() => {
  notifications.value = getNotifications()
})

export function useNotify() {
  return { notifications, notify: coreNotify, dismiss: coreDismiss }
}
