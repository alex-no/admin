import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Композабл для управления отступами страницы при открытии docked модальных окон
 */
export function usePageLayout() {
  const contentMarginRaw = ref({})

  // Возвращаем только margin стили, overflow добавляется через CSS класс
  const contentMargin = computed(() => {
    return {
      ...contentMarginRaw.value,
      transition: 'margin 0.2s ease-out',
    }
  })

  function updateMargin(event) {
    if (event.detail) {
      contentMarginRaw.value = event.detail
    }
  }

  onMounted(() => {
    window.addEventListener('modal-content-margin-change', updateMargin)
  })

  onUnmounted(() => {
    window.removeEventListener('modal-content-margin-change', updateMargin)
  })

  return {
    contentMargin,
  }
}
