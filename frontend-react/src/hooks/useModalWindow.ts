import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

type ModalMode = 'floating' | 'docked-right' | 'docked-bottom'

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

interface SavedSettings {
  mode?: ModalMode
  dockedWidth?: number
  dockedHeight?: number
  floatingWidth?: number
  floatingHeight?: number
  floatingResized?: boolean
}

export function useModalWindow(options: UseModalWindowOptions = {}) {
  const storageKey = options.storageKey || 'modal-window-settings'

  // Load saved settings
  const getSavedSettings = (): SavedSettings => {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return {}
    try {
      const settings = JSON.parse(saved)
      // Migration: 'modal' → 'floating', 'side-panel' → 'docked-right'
      if (settings.mode === 'modal') settings.mode = 'floating'
      if (settings.mode === 'side-panel') settings.mode = 'docked-right'
      return settings
    } catch {
      return {}
    }
  }

  const settings = getSavedSettings()

  const [mode, setMode] = useState<ModalMode>(settings.mode || options.mode || 'floating')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)

  // Position for floating window
  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const dragStartRef = useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 })

  // Sizes for docked modes
  const [dockedWidth, setDockedWidth] = useState(settings.dockedWidth || options.defaultWidth || 600)
  const [dockedHeight, setDockedHeight] = useState(settings.dockedHeight || options.defaultHeight || 400)

  // Sizes for floating mode
  const [floatingWidth, setFloatingWidth] = useState(settings.floatingWidth || options.defaultWidth || 700)
  const [floatingHeight, setFloatingHeight] = useState(settings.floatingHeight || options.defaultHeight || 500)
  const [floatingResized, setFloatingResized] = useState(Boolean(settings.floatingResized))

  const minWidth = options.minWidth || 400
  const maxWidth = options.maxWidth || 1200
  const minHeight = options.minHeight || 300
  const maxHeight = options.maxHeight || 800

  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  // Floating style
  const floatingStyle = (): React.CSSProperties | null => {
    if (mode !== 'floating') return null

    const style: React.CSSProperties = {}

    if (floatingResized) {
      style.width = `${floatingWidth}px`
      style.height = `${floatingHeight}px`
      style.maxWidth = `${maxWidth}px`
      style.maxHeight = `${maxHeight}px`
    }

    if (position.x !== null && position.y !== null) {
      style.left = `${position.x}px`
      style.top = `${position.y}px`
      style.transform = 'none'
    }

    return Object.keys(style).length ? style : null
  }

  // Docked right style
  const dockedRightStyle = (): React.CSSProperties | null => {
    if (mode !== 'docked-right') return null

    return {
      width: `${dockedWidth}px`,
      minWidth: `${minWidth}px`,
      maxWidth: `${maxWidth}px`,
    }
  }

  // Docked bottom style
  const dockedBottomStyle = (): React.CSSProperties | null => {
    if (mode !== 'docked-bottom') return null

    return {
      height: `${dockedHeight}px`,
      minHeight: `${minHeight}px`,
      maxHeight: `${maxHeight}px`,
    }
  }

  // Content margin for page (memoized to prevent infinite loops)
  const contentMargin = useMemo((): React.CSSProperties => {
    if (mode === 'docked-right') {
      return { marginRight: `${dockedWidth}px` }
    }
    if (mode === 'docked-bottom') {
      return { marginBottom: `${dockedHeight}px` }
    }
    return {}
  }, [mode, dockedWidth, dockedHeight])

  // Cursor class
  const cursorClass = (): string => {
    if (isDragging) return 'cursor-grabbing'
    if (isResizing) {
      if (mode === 'docked-right') return 'cursor-resizing-x'
      if (mode === 'docked-bottom') return 'cursor-resizing-y'
      if (mode === 'floating') return 'cursor-resizing-both'
    }
    return ''
  }

  const isDraggable = mode === 'floating'

  // Start drag
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

  // Start resize
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
        const newWidth = Math.min(Math.max(rect.width, minWidth), maxWidth)
        const newHeight = Math.min(Math.max(rect.height, minHeight), maxHeight)
        setFloatingWidth(newWidth)
        setFloatingHeight(newHeight)

        if (position.x === null) {
          setPosition({ x: rect.left, y: rect.top })
        }

        resizeStartRef.current.width = newWidth
        resizeStartRef.current.height = newHeight
      }
      setFloatingResized(true)
    }
  }, [mode, dockedWidth, dockedHeight, floatingWidth, floatingHeight, floatingResized, position, minWidth, maxWidth, minHeight, maxHeight])

  // Mouse move handlers
  useEffect(() => {
    const onDragMove = (event: MouseEvent) => {
      if (!isDragging) return

      const deltaX = event.clientX - dragStartRef.current.mouseX
      const deltaY = event.clientY - dragStartRef.current.mouseY

      setPosition({
        x: dragStartRef.current.x + deltaX,
        y: dragStartRef.current.y + deltaY,
      })
    }

    const onResizeMove = (event: MouseEvent) => {
      if (!isResizing) return

      if (mode === 'docked-right') {
        const delta = resizeStartRef.current.x - event.clientX
        const newWidth = resizeStartRef.current.width + delta

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setDockedWidth(newWidth)
        }
      } else if (mode === 'docked-bottom') {
        const delta = resizeStartRef.current.y - event.clientY
        const newHeight = resizeStartRef.current.height + delta

        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setDockedHeight(newHeight)
        }
      } else if (mode === 'floating') {
        const newWidth = resizeStartRef.current.width + (event.clientX - resizeStartRef.current.x)
        const newHeight = resizeStartRef.current.height + (event.clientY - resizeStartRef.current.y)

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setFloatingWidth(newWidth)
        }
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setFloatingHeight(newHeight)
        }
      }
    }

    const stopDrag = () => {
      setIsDragging(false)
    }

    const stopResize = () => {
      setIsResizing(false)
    }

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

  // Cycle mode
  const cycleMode = useCallback(() => {
    const modes: ModalMode[] = ['floating', 'docked-right', 'docked-bottom']
    const currentIndex = modes.indexOf(mode)
    const nextIndex = (currentIndex + 1) % modes.length
    setMode(modes[nextIndex])
  }, [mode])

  // Save settings
  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        mode,
        dockedWidth,
        dockedHeight,
        floatingWidth,
        floatingHeight,
        floatingResized,
      })
    )
  }, [mode, dockedWidth, dockedHeight, floatingWidth, floatingHeight, floatingResized, storageKey])

  return {
    mode,
    floatingStyle: floatingStyle(),
    dockedRightStyle: dockedRightStyle(),
    dockedBottomStyle: dockedBottomStyle(),
    contentMargin,
    cursorClass: cursorClass(),
    isDragging,
    isResizing,
    isDraggable,
    startDrag,
    startResize,
    cycleMode,
    setMode,
  }
}
