import { ref, computed, watch } from 'vue'
import {
  loadModalWindowSettings,
  saveModalWindowSettings,
  modalWindowStorageKey,
  nextModalMode,
  computeFloatingStyle,
  computeDockedRightStyle,
  computeDockedBottomStyle,
  computeContentMargin,
  computeCursorClass,
  computeDragPosition,
  clampSizeFromRect,
  computeResizedDockedWidth,
  computeResizedDockedHeight,
  computeResizedFloatingSize,
} from '@core/modalWindow'

/**
 * Композабл для управления модальным окном с возможностью перемещения и ресайза.
 * Чисті обчислення (стилі, clamp, дельти перетягування, збереження налаштувань) —
 * в ядрі (@core/modalWindow), спільному з React; тут — стан і DOM-листенери.
 *
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
  const storageKey = modalWindowStorageKey(options.storageKey)
  const settings = loadModalWindowSettings(storageKey)

  const mode = ref(settings.mode || options.mode || 'floating')
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

  const floatingStyle = computed(() =>
    computeFloatingStyle({
      mode: mode.value,
      floatingResized: floatingResized.value,
      floatingWidth: floatingWidth.value,
      floatingHeight: floatingHeight.value,
      maxWidth,
      maxHeight,
      position: position.value,
    })
  )

  const dockedRightStyle = computed(() =>
    computeDockedRightStyle({ mode: mode.value, dockedWidth: dockedWidth.value, minWidth, maxWidth })
  )

  const dockedBottomStyle = computed(() =>
    computeDockedBottomStyle({ mode: mode.value, dockedHeight: dockedHeight.value, minHeight, maxHeight })
  )

  // Отступы для контента страницы (чтобы освободить место для docked окна)
  const contentMargin = computed(() =>
    computeContentMargin({ mode: mode.value, dockedWidth: dockedWidth.value, dockedHeight: dockedHeight.value })
  )

  const cursorClass = computed(() =>
    computeCursorClass({ isDragging: isDragging.value, isResizing: isResizing.value, mode: mode.value })
  )

  const isDraggable = computed(() => mode.value === 'floating')

  // Начало перемещения
  function startDrag(event, elementOrRef) {
    if (mode.value !== 'floating') return
    if (!elementOrRef) return

    const element = elementOrRef.value || elementOrRef
    if (!element) return

    const rect = element.getBoundingClientRect()

    dragStart.value = {
      x: rect.left,
      y: rect.top,
      mouseX: event.clientX,
      mouseY: event.clientY,
    }

    position.value = { x: rect.left, y: rect.top }
    isDragging.value = true

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', stopDrag)
    event.preventDefault()
  }

  function onDragMove(event) {
    if (!isDragging.value) return
    position.value = computeDragPosition(dragStart.value, event.clientX, event.clientY)
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
        const clamped = clampSizeFromRect(rect, minWidth, maxWidth, minHeight, maxHeight)
        floatingWidth.value = clamped.width
        floatingHeight.value = clamped.height
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
      const next = computeResizedDockedWidth(resizeStartX.value, resizeStartWidth.value, event.clientX, minWidth, maxWidth)
      if (next !== null) dockedWidth.value = next
    } else if (mode.value === 'docked-bottom') {
      const next = computeResizedDockedHeight(resizeStartY.value, resizeStartHeight.value, event.clientY, minHeight, maxHeight)
      if (next !== null) dockedHeight.value = next
    } else if (mode.value === 'floating') {
      const resizeStart = { x: resizeStartX.value, y: resizeStartY.value, width: resizeStartWidth.value, height: resizeStartHeight.value }
      const next = computeResizedFloatingSize(resizeStart, event.clientX, event.clientY, minWidth, maxWidth, minHeight, maxHeight)
      if (next.width !== null) floatingWidth.value = next.width
      if (next.height !== null) floatingHeight.value = next.height
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

  function cycleMode() {
    mode.value = nextModalMode(mode.value)
  }

  function setMode(newMode) {
    if (['floating', 'docked-right', 'docked-bottom'].includes(newMode)) {
      mode.value = newMode
    }
  }

  // Сохранение настроек при изменении
  watch([mode, dockedWidth, dockedHeight, floatingWidth, floatingHeight, floatingResized], () => {
    saveModalWindowSettings(storageKey, {
      mode: mode.value,
      dockedWidth: dockedWidth.value,
      dockedHeight: dockedHeight.value,
      floatingWidth: floatingWidth.value,
      floatingHeight: floatingHeight.value,
      floatingResized: floatingResized.value,
    })
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
