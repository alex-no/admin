import { ref, computed, watch } from 'vue'

/**
 * Композабл для управления модальным окном с возможностью перемещения и ресайза
 * @param {Object} options
 * @param {String} options.mode - 'floating' | 'docked-right' | 'docked-bottom'
 * @param {String} options.storageKey - ключ для сохранения настроек в localStorage
 * @param {Number} options.defaultWidth - начальная ширина для docked-right
 * @param {Number} options.defaultHeight - начальная высота для docked-bottom
 * @param {Number} options.minWidth - минимальная ширина для docked-right
 * @param {Number} options.maxWidth - максимальная ширина для docked-right
 * @param {Number} options.minHeight - минимальная высота для docked-bottom
 * @param {Number} options.maxHeight - максимальная высота для docked-bottom
 */
export function useModalWindow(options = {}) {
  const storageKey = options.storageKey || 'modal-window-settings'

  // Загрузить сохраненные настройки
  const savedSettings = localStorage.getItem(storageKey)
  const settings = savedSettings ? JSON.parse(savedSettings) : {}

  // Миграция старых значений 'modal' → 'floating', 'side-panel' → 'docked-right'
  if (settings.mode === 'modal') settings.mode = 'floating'
  if (settings.mode === 'side-panel') settings.mode = 'docked-right'

  const mode = ref(settings.mode || options.mode || 'floating') // 'floating', 'docked-right', 'docked-bottom'
  const isDragging = ref(false)
  const isResizing = ref(false)

  // Позиция для плавающего окна
  const position = ref({ x: null, y: null })
  const dragStart = ref({ x: 0, y: 0, mouseX: 0, mouseY: 0 })

  // Размеры для docked режимов
  const dockedWidth = ref(settings.dockedWidth || options.defaultWidth || 600)
  const dockedHeight = ref(settings.dockedHeight || options.defaultHeight || 400)

  const minWidth = options.minWidth || 400
  const maxWidth = options.maxWidth || 1200
  const minHeight = options.minHeight || 300
  const maxHeight = options.maxHeight || 800

  const resizeStartX = ref(0)
  const resizeStartY = ref(0)
  const resizeStartWidth = ref(0)
  const resizeStartHeight = ref(0)

  // Стили для плавающего окна
  const floatingStyle = computed(() => {
    if (mode.value !== 'floating') {
      return null
    }

    if (position.value.x !== null && position.value.y !== null) {
      return {
        left: `${position.value.x}px`,
        top: `${position.value.y}px`,
        transform: 'none',
      }
    }
    return null
  })

  // Стили для docked-right
  const dockedRightStyle = computed(() => {
    if (mode.value !== 'docked-right') {
      return null
    }

    return {
      width: `${dockedWidth.value}px`,
      minWidth: `${minWidth}px`,
      maxWidth: `${maxWidth}px`,
    }
  })

  // Стили для docked-bottom
  const dockedBottomStyle = computed(() => {
    if (mode.value !== 'docked-bottom') {
      return null
    }

    return {
      height: `${dockedHeight.value}px`,
      minHeight: `${minHeight}px`,
      maxHeight: `${maxHeight}px`,
    }
  })

  // Отступы для контента страницы (чтобы освободить место для docked окна)
  // Используем margin чтобы scrollbar был виден на границе контента
  // Вычитаем 24px (padding card-body) чтобы scrollbar был впритык к разделителю
  const contentMargin = computed(() => {
    if (mode.value === 'docked-right') {
      return { marginRight: `${dockedWidth.value - 24}px` }
    }
    if (mode.value === 'docked-bottom') {
      return { marginBottom: `${dockedHeight.value - 24}px` }
    }
    return {}
  })

  // Класс курсора
  const cursorClass = computed(() => {
    if (isDragging.value) return 'cursor-grabbing'
    if (isResizing.value) {
      if (mode.value === 'docked-right') return 'cursor-resizing-x'
      if (mode.value === 'docked-bottom') return 'cursor-resizing-y'
    }
    return ''
  })

  // Можно ли перетаскивать
  const isDraggable = computed(() => mode.value === 'floating')

  // Начало перемещения
  function startDrag(event, elementOrRef) {
    if (mode.value !== 'floating') return
    if (!elementOrRef) return

    // Если это ref - получаем .value, иначе используем как есть
    const element = elementOrRef.value || elementOrRef
    if (!element) return

    const rect = element.getBoundingClientRect()

    dragStart.value = {
      x: rect.left,
      y: rect.top,
      mouseX: event.clientX,
      mouseY: event.clientY,
    }

    position.value = {
      x: rect.left,
      y: rect.top,
    }

    isDragging.value = true

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', stopDrag)
    event.preventDefault()
  }

  function onDragMove(event) {
    if (!isDragging.value) return

    const deltaX = event.clientX - dragStart.value.mouseX
    const deltaY = event.clientY - dragStart.value.mouseY

    position.value = {
      x: dragStart.value.x + deltaX,
      y: dragStart.value.y + deltaY,
    }
  }

  function stopDrag() {
    isDragging.value = false
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', stopDrag)
  }

  // Начало изменения размера
  function startResize(event) {
    if (mode.value !== 'docked-right' && mode.value !== 'docked-bottom') return

    event.preventDefault()
    event.stopPropagation()

    isResizing.value = true

    if (mode.value === 'docked-right') {
      resizeStartX.value = event.clientX
      resizeStartWidth.value = dockedWidth.value
    } else if (mode.value === 'docked-bottom') {
      resizeStartY.value = event.clientY
      resizeStartHeight.value = dockedHeight.value
    }

    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', stopResize)
  }

  function onResizeMove(event) {
    if (!isResizing.value) return

    if (mode.value === 'docked-right') {
      const delta = resizeStartX.value - event.clientX
      const newWidth = resizeStartWidth.value + delta

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        dockedWidth.value = newWidth
      }
    } else if (mode.value === 'docked-bottom') {
      const delta = resizeStartY.value - event.clientY
      const newHeight = resizeStartHeight.value + delta

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        dockedHeight.value = newHeight
      }
    }
  }

  function stopResize() {
    isResizing.value = false
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', stopResize)
  }

  // Сброс позиции при смене режима
  watch(mode, (newMode) => {
    if (newMode === 'floating') {
      position.value = { x: null, y: null }
    }
  })

  // Переключение режима по кругу: floating → docked-right → docked-bottom → floating
  function cycleMode() {
    const modes = ['floating', 'docked-right', 'docked-bottom']
    const currentIndex = modes.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    mode.value = modes[nextIndex]
  }

  // Установить конкретный режим
  function setMode(newMode) {
    if (['floating', 'docked-right', 'docked-bottom'].includes(newMode)) {
      mode.value = newMode
    }
  }

  // Сохранение настроек при изменении
  watch([mode, dockedWidth, dockedHeight], () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        mode: mode.value,
        dockedWidth: dockedWidth.value,
        dockedHeight: dockedHeight.value,
      })
    )
  })

  return {
    mode,
    floatingStyle,
    dockedRightStyle,
    dockedBottomStyle,
    contentMargin,
    cursorClass,
    isDragging,
    isResizing,
    isDraggable,
    startDrag,
    startResize,
    cycleMode,
    setMode,
  }
}
