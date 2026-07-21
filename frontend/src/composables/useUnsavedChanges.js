import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Composable для отслеживания несохраненных изменений и предупреждения при закрытии окна
 *
 * @param {Function} hasChanges - функция, возвращающая true если есть несохраненные изменения
 * @returns {Object} - объект с методами для управления состоянием
 *
 * @example
 * const { markAsSaved, markAsChanged } = useUnsavedChanges(() => isDirty.value)
 */
export function useUnsavedChanges(hasChanges) {
  const isDirty = ref(false)

  // Обработчик события beforeunload
  const handleBeforeUnload = (e) => {
    const needsWarning = typeof hasChanges === 'function' ? hasChanges() : isDirty.value

    if (needsWarning) {
      // Стандартный способ показа предупреждения
      e.preventDefault()
      e.returnValue = '' // Для Chrome
      return '' // Для старых браузеров
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  /**
   * Отметить как сохраненное (сбросить флаг изменений)
   */
  const markAsSaved = () => {
    isDirty.value = false
  }

  /**
   * Отметить как измененное
   */
  const markAsChanged = () => {
    isDirty.value = true
  }

  return {
    isDirty,
    markAsSaved,
    markAsChanged
  }
}
