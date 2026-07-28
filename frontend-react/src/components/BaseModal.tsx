import React, { useEffect, useRef } from 'react'
import { useModalWindow } from '@/hooks/useModalWindow'

interface BaseModalProps {
  visible: boolean
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  subheader?: React.ReactNode
  storageKey?: string
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  closeOnBackdrop?: boolean
}

export default function BaseModal({
  visible,
  onClose,
  title,
  children,
  footer,
  subheader,
  storageKey = 'modal-window-settings',
  defaultWidth = 700,
  defaultHeight = 500,
  minWidth = 400,
  maxWidth = 1200,
  minHeight = 300,
  maxHeight = 800,
  closeOnBackdrop = true,
}: BaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const {
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
  } = useModalWindow({
    storageKey,
    defaultWidth,
    defaultHeight,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
  })

  // Emit margin change event for page layout
  useEffect(() => {
    if (visible) {
      window.dispatchEvent(new CustomEvent('modal-margin-change', { detail: contentMargin }))
    } else {
      window.dispatchEvent(new CustomEvent('modal-margin-change', { detail: {} }))
    }
  }, [visible, contentMargin])

  // Block body scroll when modal is open
  useEffect(() => {
    if (visible) {
      document.body.classList.add('modal-open')
    } else {
      document.body.classList.remove('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [visible])

  // Escape key handler
  useEffect(() => {
    if (!visible) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [visible, onClose])

  if (!visible) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isDraggable) {
      startDrag(e, modalRef.current)
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    startResize(e, modalRef.current)
  }

  // Icon for mode toggle button
  const getModeIcon = () => {
    if (mode === 'floating') return 'bi-layout-sidebar-reverse'
    if (mode === 'docked-right') return 'bi-window-dock'
    return 'bi-window'
  }

  const getModeTitle = () => {
    if (mode === 'floating') return 'Закріпити справа'
    if (mode === 'docked-right') return 'Закріпити знизу'
    return 'Плаваюче вікно'
  }

  // Floating mode
  if (mode === 'floating') {
    return (
      <>
        <div
          className="modal-backdrop show"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={handleBackdropClick}
        />
        <div className={`modal-floating ${cursorClass}`}>
          <div
            ref={modalRef}
            className="card shadow-lg modal-floating-content"
            style={floatingStyle || undefined}
          >
            {/* Header */}
            <div
              className={`card-header d-flex justify-content-between align-items-center py-2 px-3 ${isDraggable ? 'cursor-grab' : ''}`}
              onMouseDown={handleHeaderMouseDown}
            >
              <div className="flex-grow-1">{title}</div>
              <div className="d-flex gap-1">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={cycleMode}
                  title={getModeTitle()}
                  style={{ padding: '2px 6px' }}
                >
                  <i className={`bi ${getModeIcon()}`} />
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={onClose}
                  style={{ padding: '2px 6px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Subheader (tabs) */}
            {subheader && (
              <div className="border-bottom px-2">
                {subheader}
              </div>
            )}

            {/* Body */}
            <div className="px-4 py-3" style={{ overflowY: 'auto', flex: 1 }}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="card-footer d-flex gap-2 justify-content-end py-2 px-3">
                {footer}
              </div>
            )}

            {/* Resize handle */}
            <div
              className="modal-resize-handle modal-resize-se"
              onMouseDown={handleResizeMouseDown}
              title="Змінити розмір"
            />
          </div>
        </div>
      </>
    )
  }

  // Docked right mode
  if (mode === 'docked-right') {
    return (
      <div className={`modal-docked-right ${cursorClass}`} style={dockedRightStyle || undefined}>
        <div ref={modalRef} className="card shadow-lg h-100 d-flex flex-column">
          {/* Header */}
          <div className="card-header d-flex justify-content-between align-items-center py-2 px-3">
            <div className="flex-grow-1">{title}</div>
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={cycleMode}
                title={getModeTitle()}
                style={{ padding: '2px 6px' }}
              >
                <i className={`bi ${getModeIcon()}`} />
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={onClose}
                style={{ padding: '2px 6px' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Subheader */}
          {subheader && (
            <div className="border-bottom px-2">
              {subheader}
            </div>
          )}

          {/* Body */}
          <div className="px-4 py-3" style={{ overflowY: 'auto', flex: 1 }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="card-footer d-flex gap-2 justify-content-end py-2 px-3">
              {footer}
            </div>
          )}
        </div>

        {/* Resize handle (left edge) */}
        <div
          className="modal-resize-handle modal-resize-w"
          onMouseDown={handleResizeMouseDown}
          title="Змінити ширину"
        />
      </div>
    )
  }

  // Docked bottom mode
  return (
    <div className={`modal-docked-bottom ${cursorClass}`} style={dockedBottomStyle || undefined}>
      <div ref={modalRef} className="card shadow-lg h-100 d-flex flex-column">
        {/* Header */}
        <div className="card-header d-flex justify-content-between align-items-center py-2 px-3">
          <div className="flex-grow-1">{title}</div>
          <div className="d-flex gap-1">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={cycleMode}
              title={getModeTitle()}
              style={{ padding: '2px 6px' }}
            >
              <i className={`bi ${getModeIcon()}`} />
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={onClose}
              style={{ padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Subheader */}
        {subheader && (
          <div className="border-bottom px-2">
            {subheader}
          </div>
        )}

        {/* Body */}
        <div className="px-4 py-3" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="card-footer d-flex gap-2 justify-content-end py-2 px-3">
            {footer}
          </div>
        )}
      </div>

      {/* Resize handle (top edge) */}
      <div
        className="modal-resize-handle modal-resize-n"
        onMouseDown={handleResizeMouseDown}
        title="Змінити висоту"
      />
    </div>
  )
}
