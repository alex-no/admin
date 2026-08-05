import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  type ModalMode,
} from '@core/modalWindow'

interface UseModalWindowOptions {
  mode?: ModalMode
  storageKey?: string
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
}

/**
 * Хук для управления модальным окном з можливістю перетягування й ресайзу.
 * Чисті обчислення (стилі, clamp, дельти, збереження налаштувань) — в ядрі
 * (@core/modalWindow), спільному з Vue; тут — стан і DOM-листенери.
 *
 * Дзеркало Vue: composables/useModalWindow.js. `contentMargin` раніше НЕ мав
 * компенсації -24px (padding card-body), яка є у Vue-версії — контент був на
 * 24px вужчим, ніж мав бути. Тепер обидва рахують через те саме @core/modalWindow.
 */
export function useModalWindow(options: UseModalWindowOptions = {}) {
  const storageKey = modalWindowStorageKey(options.storageKey)
  const settings = useMemo(() => loadModalWindowSettings(storageKey), [storageKey])

  const [mode, setMode] = useState<ModalMode>(settings.mode || options.mode || 'floating')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const dragStartRef = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 })

  const [dockedWidth, setDockedWidth] = useState(settings.dockedWidth || options.defaultWidth || 600)
  const [dockedHeight, setDockedHeight] = useState(settings.dockedHeight || options.defaultHeight || 400)

  const [floatingWidth, setFloatingWidth] = useState(settings.floatingWidth || options.defaultWidth || 700)
  const [floatingHeight, setFloatingHeight] = useState(settings.floatingHeight || options.defaultHeight || 500)
  const [floatingResized, setFloatingResized] = useState(Boolean(settings.floatingResized))

  const minWidth = options.minWidth || 400
  const maxWidth = options.maxWidth || 1200
  const minHeight = options.minHeight || 300
  const maxHeight = options.maxHeight || 800

  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  const floatingStyle = computeFloatingStyle({
    mode,
    floatingResized,
    floatingWidth,
    floatingHeight,
    maxWidth,
    maxHeight,
    position,
  })

  const dockedRightStyle = computeDockedRightStyle({ mode, dockedWidth, minWidth, maxWidth })
  const dockedBottomStyle = computeDockedBottomStyle({ mode, dockedHeight, minHeight, maxHeight })

  // Content margin for page (memoized to prevent infinite loops).
  // Без paddingCompensation (0 за замовчуванням): <main class="p-4"> в
  // BaseLayout.tsx і скролиться, і має власний padding сам, на відміну від
  // Vue, де це два різні елементи — компенсацію padding віднімати не треба,
  // інакше контент/скролбар заїжджає під доковане вікно
  // (див. @core/modalWindow → computeContentMargin).
  const contentMargin = useMemo(
    () => computeContentMargin({ mode, dockedWidth, dockedHeight }),
    [mode, dockedWidth, dockedHeight]
  )

  const cursorClass = computeCursorClass({ isDragging, isResizing, mode })

  const isDraggable = mode === 'floating'

  const startDrag = useCallback((event: React.MouseEvent, element: HTMLElement | null) => {
    if (mode !== 'floating' || !element) return

    const rect = element.getBoundingClientRect()

    dragStartRef.current = {
      x: rect.left,
      y: rect.top,
      mouseX: event.clientX,
      mouseY: event.clientY,
    }

    setPosition({ x: rect.left, y: rect.top })
    setIsDragging(true)
    event.preventDefault()
  }, [mode])

  const startResize = useCallback((event: React.MouseEvent, element: HTMLElement | null) => {
    if (!['docked-right', 'docked-bottom', 'floating'].includes(mode)) return

    event.preventDefault()
    event.stopPropagation()

    setIsResizing(true)

    if (mode === 'docked-right') {
      resizeStartRef.current = { x: event.clientX, y: 0, width: dockedWidth, height: 0 }
    } else if (mode === 'docked-bottom') {
      resizeStartRef.current = { x: 0, y: event.clientY, width: 0, height: dockedHeight }
    } else if (mode === 'floating') {
      resizeStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        width: floatingWidth,
        height: floatingHeight,
      }

      if (!floatingResized && element) {
        const rect = element.getBoundingClientRect()
        const clamped = clampSizeFromRect(rect, minWidth, maxWidth, minHeight, maxHeight)
        setFloatingWidth(clamped.width)
        setFloatingHeight(clamped.height)

        if (position.x === null) {
          setPosition({ x: rect.left, y: rect.top })
        }

        resizeStartRef.current.width = clamped.width
        resizeStartRef.current.height = clamped.height
      }
      setFloatingResized(true)
    }
  }, [mode, dockedWidth, dockedHeight, floatingWidth, floatingHeight, floatingResized, position, minWidth, maxWidth, minHeight, maxHeight])

  // Mouse move handlers
  useEffect(() => {
    const onDragMove = (event: MouseEvent) => {
      if (!isDragging) return
      setPosition(computeDragPosition(dragStartRef.current, event.clientX, event.clientY))
    }

    const onResizeMove = (event: MouseEvent) => {
      if (!isResizing) return

      if (mode === 'docked-right') {
        const next = computeResizedDockedWidth(
          resizeStartRef.current.x,
          resizeStartRef.current.width,
          event.clientX,
          minWidth,
          maxWidth
        )
        if (next !== null) setDockedWidth(next)
      } else if (mode === 'docked-bottom') {
        const next = computeResizedDockedHeight(
          resizeStartRef.current.y,
          resizeStartRef.current.height,
          event.clientY,
          minHeight,
          maxHeight
        )
        if (next !== null) setDockedHeight(next)
      } else if (mode === 'floating') {
        const next = computeResizedFloatingSize(
          resizeStartRef.current,
          event.clientX,
          event.clientY,
          minWidth,
          maxWidth,
          minHeight,
          maxHeight
        )
        if (next.width !== null) setFloatingWidth(next.width)
        if (next.height !== null) setFloatingHeight(next.height)
      }
    }

    const stopDrag = () => setIsDragging(false)
    const stopResize = () => setIsResizing(false)

    if (isDragging) {
      document.addEventListener('mousemove', onDragMove)
      document.addEventListener('mouseup', stopDrag)
    }

    if (isResizing) {
      document.addEventListener('mousemove', onResizeMove)
      document.addEventListener('mouseup', stopResize)
    }

    return () => {
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('mousemove', onResizeMove)
      document.removeEventListener('mouseup', stopResize)
    }
  }, [isDragging, isResizing, mode, minWidth, maxWidth, minHeight, maxHeight])

  // Reset position on mode change
  useEffect(() => {
    if (mode === 'floating') {
      setPosition({ x: null, y: null })
    }
  }, [mode])

  const cycleMode = useCallback(() => {
    setMode(prev => nextModalMode(prev))
  }, [])

  // Save settings
  useEffect(() => {
    saveModalWindowSettings(storageKey, {
      mode,
      dockedWidth,
      dockedHeight,
      floatingWidth,
      floatingHeight,
      floatingResized,
    })
  }, [mode, dockedWidth, dockedHeight, floatingWidth, floatingHeight, floatingResized, storageKey])

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
