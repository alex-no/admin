import { ref } from 'vue'

// Глобальний реактивний стан (модульний singleton — той самий підхід, що й у useAuth.js),
// щоб будь-який компонент міг викликати notify() без прокидування пропсів/провайдерів.
const notifications = ref([])
let nextId = 1

/**
 * @param {string} message
 * @param {Object} [options]
 * @param {'info'|'success'|'error'} [options.type='info']
 * @param {number} [options.duration=4000] - мс до автозакриття, 0 = не закривати автоматично
 * @param {{ label: string, onClick: Function }} [options.action] - кнопка всередині тоста (напр. "Скасувати")
 * @returns {number} id тоста, для ручного dismiss()
 */
function notify(message, options = {}) {
  const { type = 'info', duration = 4000, action = null } = options
  const id = nextId++
  notifications.value.push({ id, message, type, duration, action })
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
  return id
}

function dismiss(id) {
  notifications.value = notifications.value.filter((n) => n.id !== id)
}

export function useNotify() {
  return { notifications, notify, dismiss }
}
