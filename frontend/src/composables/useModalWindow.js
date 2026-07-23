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

  // Размеры для floating режиму (за замовчуванням — як і раніше, по 90vw/88vh
  // рахує сам браузер через CSS; тут — тільки якщо користувач явно змінив розмір)
  const floatingWidth = ref(settings.floatingWidth || options.defaultWidth || 700)
  const floatingHeight = ref(settings.floatingHeight || options.defaultHeight || 500)
  const floatingResized = ref(Boolean(settings.floatingResized))

  const minWidth = options.minWidth || 400
  const maxWidth = options.maxWidth || 1200
  const minHeight = options.minHeight || 300
  const maxHeight = options.maxHeight || 800

  const resizeStartX = ref(0)
  const resizeStartY = ref(0)
  const resizeStartWidth = ref(0)
  const resizeStartHeight = ref(0)

  // Стили для плавающого окна
  const floatingStyle = computed(() => {
    if (mode.value !== 'floating') {
      return null
    }

    const style = {}

    // Поки користувач жодного разу не тягнув за ручку ресайзу — розмір
    // задає CSS-клас (90vw/88vh), щоб не міняти звичну поведінку за замовчуванням.
    if (floatingResized.value) {
      style.width = `${floatingWidth.value}px`
      style.height = `${floatingHeight.value}px`
      style.maxWidth = `${maxWidth}px`
      style.maxHeight = `${maxHeight}px`
    }

    if (position.value.x !== null && position.value.y !== null) {
      style.left = `${position.value.x}px`
      style.top = `${position.value.y}px`
      style.transform = 'none'
    }

    return Object.keys(style).length ? style : null
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
      if (mode.value === 'floating') return 'cursor-resizing-both'
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

  // Начало изменения размера. elementOrRef потрібен лише для floating —
  // щоб на перший ресайз відштовхнутися від реального (CSS 90vw/88vh) розміру.
  function startResize(event, elementOrRef) {
    if (!['docked-right', 'docked-bottom', 'floating'].includes(mode.value)) return

    event.preventDefault()
    event.stopPropagation()

    isResizing.value = true

    if (mode.value === 'docked-right') {
      resizeStartX.value = event.clientX
      resizeStartWidth.value = dockedWidth.value
    } else if (mode.value === 'docked-bottom') {
      resizeStartY.value = event.clientY
      resizeStartHeight.value = dockedHeight.value
    } else if (mode.value === 'floating') {
      resizeStartX.value = event.clientX
      resizeStartY.value = event.clientY

      const element = elementOrRef?.value || elementOrRef
      if (!floatingResized.value && element) {
        const rect = element.getBoundingClientRect()
        // Реальний CSS-розмір (90vw/88vh, до maxWidth 1100px/88vh) може перевищувати
        // minWidth/maxWidth-пропси компонента (напр. сторінка задала max-width:1000) —
        // без цього clamp перший рух миші "губився" в різниці і нічого не відбувалося.
        floatingWidth.value = Math.min(Math.max(rect.width, minWidth), maxWidth)
        floatingHeight.value = Math.min(Math.max(rect.height, minHeight), maxHeight)
        // Плаваюче вікно за замовчуванням центроване через transform: translate(-50%,-50%),
        // тому першу зміну розміру починаємо з зафіксованої поточної позиції,
        // інакше рамка "стрибне" в момент переходу з CSS-розміру на inline px.
        if (position.value.x === null) {
          position.value = { x: rect.left, y: rect.top }
        }
      }
      resizeStartWidth.value = floatingWidth.value
      resizeStartHeight.value = floatingHeight.value
      floatingResized.value = true
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
    } else if (mode.value === 'floating') {
      const newWidth = resizeStartWidth.value + (event.clientX - resizeStartX.value)
      const newHeight = resizeStartHeight.value + (event.clientY - resizeStartY.value)

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        floatingWidth.value = newWidth
      }
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        floatingHeight.value = newHeight
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
  watch([mode, dockedWidth, dockedHeight, floatingWidth, floatingHeight, floatingResized], () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        mode: mode.value,
        dockedWidth: dockedWidth.value,
        dockedHeight: dockedHeight.value,
        floatingWidth: floatingWidth.value,
        floatingHeight: floatingHeight.value,
        floatingResized: floatingResized.value,
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
