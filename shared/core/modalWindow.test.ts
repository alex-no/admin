import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampSizeFromRect,
  computeContentMargin,
  computeCursorClass,
  computeDockedBottomStyle,
  computeDockedRightStyle,
  computeDragPosition,
  computeFloatingStyle,
  computeResizedDockedHeight,
  computeResizedDockedWidth,
  computeResizedFloatingSize,
  loadModalWindowSettings,
  modalWindowStorageKey,
  nextModalMode,
  saveModalWindowSettings,
} from './modalWindow'

beforeEach(() => {
  localStorage.clear()
})

describe('modalWindowStorageKey', () => {
  it('defaults to a fixed key when none given', () => {
    expect(modalWindowStorageKey()).toBe('modal-window-settings')
  })
  it('passes through a custom key', () => {
    expect(modalWindowStorageKey('sto-detail')).toBe('sto-detail')
  })
})

describe('loadModalWindowSettings', () => {
  it('returns {} when nothing saved', () => {
    expect(loadModalWindowSettings('k')).toEqual({})
  })

  it('round-trips saved settings', () => {
    saveModalWindowSettings('k', {
      mode: 'docked-right',
      dockedWidth: 500,
      dockedHeight: 400,
      floatingWidth: 700,
      floatingHeight: 500,
      floatingResized: false,
    })
    expect(loadModalWindowSettings('k')).toMatchObject({ mode: 'docked-right', dockedWidth: 500 })
  })

  it('migrates legacy mode names', () => {
    localStorage.setItem('k', JSON.stringify({ mode: 'modal' }))
    expect(loadModalWindowSettings('k').mode).toBe('floating')
    localStorage.setItem('k', JSON.stringify({ mode: 'side-panel' }))
    expect(loadModalWindowSettings('k').mode).toBe('docked-right')
  })

  it('returns {} for corrupted JSON instead of throwing', () => {
    localStorage.setItem('k', '{bad')
    expect(loadModalWindowSettings('k')).toEqual({})
  })
})

describe('nextModalMode', () => {
  it('cycles floating -> docked-right -> docked-bottom -> floating', () => {
    expect(nextModalMode('floating')).toBe('docked-right')
    expect(nextModalMode('docked-right')).toBe('docked-bottom')
    expect(nextModalMode('docked-bottom')).toBe('floating')
  })
})

describe('computeFloatingStyle', () => {
  it('returns null when not in floating mode', () => {
    expect(
      computeFloatingStyle({
        mode: 'docked-right',
        floatingResized: false,
        floatingWidth: 700,
        floatingHeight: 500,
        maxWidth: 1200,
        maxHeight: 800,
        position: { x: null, y: null },
      })
    ).toBeNull()
  })

  it('returns null (no inline style) before the user ever resized/moved it', () => {
    expect(
      computeFloatingStyle({
        mode: 'floating',
        floatingResized: false,
        floatingWidth: 700,
        floatingHeight: 500,
        maxWidth: 1200,
        maxHeight: 800,
        position: { x: null, y: null },
      })
    ).toBeNull()
  })

  it('includes size once floatingResized is true', () => {
    const style = computeFloatingStyle({
      mode: 'floating',
      floatingResized: true,
      floatingWidth: 800,
      floatingHeight: 600,
      maxWidth: 1200,
      maxHeight: 900,
      position: { x: null, y: null },
    })
    expect(style).toMatchObject({ width: '800px', height: '600px' })
  })

  it('includes position once the window has been dragged', () => {
    const style = computeFloatingStyle({
      mode: 'floating',
      floatingResized: false,
      floatingWidth: 700,
      floatingHeight: 500,
      maxWidth: 1200,
      maxHeight: 800,
      position: { x: 100, y: 50 },
    })
    expect(style).toMatchObject({ left: '100px', top: '50px', transform: 'none' })
  })
})

describe('computeDockedRightStyle / computeDockedBottomStyle', () => {
  it('right style only applies in docked-right mode', () => {
    expect(computeDockedRightStyle({ mode: 'floating', dockedWidth: 500, minWidth: 400, maxWidth: 1200 })).toBeNull()
    expect(computeDockedRightStyle({ mode: 'docked-right', dockedWidth: 500, minWidth: 400, maxWidth: 1200 })).toEqual({
      width: '500px',
      minWidth: '400px',
      maxWidth: '1200px',
    })
  })

  it('bottom style only applies in docked-bottom mode', () => {
    expect(computeDockedBottomStyle({ mode: 'docked-bottom', dockedHeight: 400, minHeight: 300, maxHeight: 800 })).toEqual({
      height: '400px',
      minHeight: '300px',
      maxHeight: '800px',
    })
  })
})

describe('computeContentMargin', () => {
  it('defaults to no compensation (full dockedWidth/Height) when paddingCompensation is omitted', () => {
    expect(computeContentMargin({ mode: 'docked-right', dockedWidth: 500, dockedHeight: 400 })).toEqual({
      marginRight: '500px',
    })
    expect(computeContentMargin({ mode: 'docked-bottom', dockedWidth: 500, dockedHeight: 400 })).toEqual({
      marginBottom: '400px',
    })
  })

  it('subtracts an explicit paddingCompensation for docked-right', () => {
    expect(
      computeContentMargin({ mode: 'docked-right', dockedWidth: 500, dockedHeight: 400, paddingCompensation: 24 })
    ).toEqual({ marginRight: '476px' })
  })

  it('subtracts an explicit paddingCompensation for docked-bottom', () => {
    expect(
      computeContentMargin({ mode: 'docked-bottom', dockedWidth: 500, dockedHeight: 400, paddingCompensation: 24 })
    ).toEqual({ marginBottom: '376px' })
  })

  it('no margin in floating mode regardless of paddingCompensation', () => {
    expect(computeContentMargin({ mode: 'floating', dockedWidth: 500, dockedHeight: 400 })).toEqual({})
  })
})

describe('computeCursorClass', () => {
  it('dragging wins regardless of mode', () => {
    expect(computeCursorClass({ isDragging: true, isResizing: true, mode: 'docked-right' })).toBe('cursor-grabbing')
  })

  it('resizing depends on mode', () => {
    expect(computeCursorClass({ isDragging: false, isResizing: true, mode: 'docked-right' })).toBe('cursor-resizing-x')
    expect(computeCursorClass({ isDragging: false, isResizing: true, mode: 'docked-bottom' })).toBe('cursor-resizing-y')
    expect(computeCursorClass({ isDragging: false, isResizing: true, mode: 'floating' })).toBe('cursor-resizing-both')
  })

  it('empty when idle', () => {
    expect(computeCursorClass({ isDragging: false, isResizing: false, mode: 'floating' })).toBe('')
  })
})

describe('computeDragPosition', () => {
  it('applies the mouse delta to the drag-start position', () => {
    const dragStart = { x: 100, y: 50, mouseX: 200, mouseY: 150 }
    expect(computeDragPosition(dragStart, 230, 170)).toEqual({ x: 130, y: 70 })
  })
})

describe('clampSizeFromRect', () => {
  it('clamps to min/max on both dimensions', () => {
    expect(clampSizeFromRect({ width: 200, height: 2000 }, 400, 1200, 300, 800)).toEqual({ width: 400, height: 800 })
  })

  it('leaves an in-range size untouched', () => {
    expect(clampSizeFromRect({ width: 700, height: 500 }, 400, 1200, 300, 800)).toEqual({ width: 700, height: 500 })
  })
})

describe('computeResizedDockedWidth / Height', () => {
  it('grows width when dragging the right-docked handle left', () => {
    expect(computeResizedDockedWidth(1000, 500, 900, 400, 1200)).toBe(600)
  })

  it('returns null when the result would exceed max/min', () => {
    expect(computeResizedDockedWidth(1000, 500, 0, 400, 1200)).toBeNull()
  })

  it('height mirrors the same math on the Y axis', () => {
    expect(computeResizedDockedHeight(1000, 400, 900, 300, 800)).toBe(500)
  })
})

describe('computeResizedFloatingSize', () => {
  it('grows both dimensions together', () => {
    const resizeStart = { x: 500, y: 500, width: 700, height: 500 }
    expect(computeResizedFloatingSize(resizeStart, 550, 540, 400, 1200, 300, 800)).toEqual({ width: 750, height: 540 })
  })

  it('rejects a dimension outside its own min/max independently', () => {
    const resizeStart = { x: 500, y: 500, width: 700, height: 500 }
    // width goes out of max (1200), height stays valid
    const result = computeResizedFloatingSize(resizeStart, 1100, 540, 400, 1200, 300, 800)
    expect(result.width).toBeNull()
    expect(result.height).toBe(540)
  })
})
