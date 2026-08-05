/**
 * Чисті обчислення для плаваючого/докованого вікна деталей (drag/resize/
 * стилі/збереження налаштувань). Сам drag/resize (мишеві листенери, ref/
 * useState) лишається за фронтендом — тут лише "яким має стати наступний
 * стан", без DOM-подій.
 */

export type ModalMode = 'floating' | 'docked-right' | 'docked-bottom'

export interface ModalWindowSettings {
  mode?: ModalMode
  dockedWidth?: number
  dockedHeight?: number
  floatingWidth?: number
  floatingHeight?: number
  floatingResized?: boolean
}

export function modalWindowStorageKey(key?: string): string {
  return key || 'modal-window-settings'
}

/** Читає збережені налаштування + мігрує застарілі назви режимів ('modal' → 'floating' тощо). */
export function loadModalWindowSettings(storageKey: string): ModalWindowSettings {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const settings = JSON.parse(raw)
    if (settings.mode === 'modal') settings.mode = 'floating'
    if (settings.mode === 'side-panel') settings.mode = 'docked-right'
    return settings
  } catch {
    return {}
  }
}

export function saveModalWindowSettings(storageKey: string, settings: Required<ModalWindowSettings>): void {
  localStorage.setItem(storageKey, JSON.stringify(settings))
}

/** Перемикання режиму по колу: floating → docked-right → docked-bottom → floating. */
export function nextModalMode(current: ModalMode): ModalMode {
  const modes: ModalMode[] = ['floating', 'docked-right', 'docked-bottom']
  return modes[(modes.indexOf(current) + 1) % modes.length]
}

export type StyleLike = Record<string, string>

export function computeFloatingStyle(opts: {
  mode: ModalMode
  floatingResized: boolean
  floatingWidth: number
  floatingHeight: number
  maxWidth: number
  maxHeight: number
  position: { x: number | null; y: number | null }
}): StyleLike | null {
  if (opts.mode !== 'floating') return null

  const style: StyleLike = {}

  // Поки користувач жодного разу не тягнув за ручку ресайзу — розмір задає
  // CSS-клас (90vw/88vh), щоб не міняти звичну поведінку за замовчуванням.
  if (opts.floatingResized) {
    style.width = `${opts.floatingWidth}px`
    style.height = `${opts.floatingHeight}px`
    style.maxWidth = `${opts.maxWidth}px`
    style.maxHeight = `${opts.maxHeight}px`
  }

  if (opts.position.x !== null && opts.position.y !== null) {
    style.left = `${opts.position.x}px`
    style.top = `${opts.position.y}px`
    style.transform = 'none'
  }

  return Object.keys(style).length ? style : null
}

export function computeDockedRightStyle(opts: {
  mode: ModalMode
  dockedWidth: number
  minWidth: number
  maxWidth: number
}): StyleLike | null {
  if (opts.mode !== 'docked-right') return null
  return { width: `${opts.dockedWidth}px`, minWidth: `${opts.minWidth}px`, maxWidth: `${opts.maxWidth}px` }
}

export function computeDockedBottomStyle(opts: {
  mode: ModalMode
  dockedHeight: number
  minHeight: number
  maxHeight: number
}): StyleLike | null {
  if (opts.mode !== 'docked-bottom') return null
  return { height: `${opts.dockedHeight}px`, minHeight: `${opts.minHeight}px`, maxHeight: `${opts.maxHeight}px` }
}

/**
 * Відступ контенту сторінки під докованим вікном.
 *
 * `paddingCompensation` — НЕ універсальна константа, а залежить від DOM-структури
 * конкретного фронтенда:
 *  - Vue: скролиться внутрішній `.list-page-wrapper` (без власного padding),
 *    вкладений у `<main class="p-4">` (зовнішній padding 24px). Скролбар
 *    рендериться на межі wrapper'а, тому потрібно відняти ці 24px, інакше
 *    сумарний відступ (padding + margin) перевищить ширину докованого вікна.
 *  - React: `<main class="p-4" style="overflow-y:auto">` — один і той самий
 *    елемент одночасно має padding І скролиться. Скролбар рендериться по краю
 *    border-box, padding на нього не впливає — компенсація не потрібна
 *    (paddingCompensation: 0), інакше контент (і скролбар) заїжджає під
 *    доковане вікно.
 *
 * Раніше тут була захардкоджена -24 для обох — React-версія без реального
 * власного padding-компенсуючого wrapper'а від цього ховала скролбар таблиці
 * під доковеним вікном.
 */
export function computeContentMargin(opts: {
  mode: ModalMode
  dockedWidth: number
  dockedHeight: number
  paddingCompensation?: number
}): StyleLike {
  const pad = opts.paddingCompensation ?? 0
  if (opts.mode === 'docked-right') return { marginRight: `${opts.dockedWidth - pad}px` }
  if (opts.mode === 'docked-bottom') return { marginBottom: `${opts.dockedHeight - pad}px` }
  return {}
}

export function computeCursorClass(opts: { isDragging: boolean; isResizing: boolean; mode: ModalMode }): string {
  if (opts.isDragging) return 'cursor-grabbing'
  if (opts.isResizing) {
    if (opts.mode === 'docked-right') return 'cursor-resizing-x'
    if (opts.mode === 'docked-bottom') return 'cursor-resizing-y'
    if (opts.mode === 'floating') return 'cursor-resizing-both'
  }
  return ''
}

export interface DragStart {
  x: number
  y: number
  mouseX: number
  mouseY: number
}

export function computeDragPosition(dragStart: DragStart, clientX: number, clientY: number): { x: number; y: number } {
  return {
    x: dragStart.x + (clientX - dragStart.mouseX),
    y: dragStart.y + (clientY - dragStart.mouseY),
  }
}

/**
 * Реальний CSS-розмір (90vw/88vh, до maxWidth/maxHeight) може перевищувати
 * minWidth/maxWidth-пропси компонента — без clamp перший рух миші "губився"
 * б у різниці і нічого не відбувалося.
 */
export function clampSizeFromRect(
  rect: { width: number; height: number },
  minWidth: number,
  maxWidth: number,
  minHeight: number,
  maxHeight: number
): { width: number; height: number } {
  return {
    width: Math.min(Math.max(rect.width, minWidth), maxWidth),
    height: Math.min(Math.max(rect.height, minHeight), maxHeight),
  }
}

/** null — новий розмір поза межами (min/max), тримати попереднє значення. */
export function computeResizedDockedWidth(
  resizeStartX: number,
  resizeStartWidth: number,
  clientX: number,
  minWidth: number,
  maxWidth: number
): number | null {
  const newWidth = resizeStartWidth + (resizeStartX - clientX)
  return newWidth >= minWidth && newWidth <= maxWidth ? newWidth : null
}

export function computeResizedDockedHeight(
  resizeStartY: number,
  resizeStartHeight: number,
  clientY: number,
  minHeight: number,
  maxHeight: number
): number | null {
  const newHeight = resizeStartHeight + (resizeStartY - clientY)
  return newHeight >= minHeight && newHeight <= maxHeight ? newHeight : null
}

export function computeResizedFloatingSize(
  resizeStart: { x: number; y: number; width: number; height: number },
  clientX: number,
  clientY: number,
  minWidth: number,
  maxWidth: number,
  minHeight: number,
  maxHeight: number
): { width: number | null; height: number | null } {
  const newWidth = resizeStart.width + (clientX - resizeStart.x)
  const newHeight = resizeStart.height + (clientY - resizeStart.y)
  return {
    width: newWidth >= minWidth && newWidth <= maxWidth ? newWidth : null,
    height: newHeight >= minHeight && newHeight <= maxHeight ? newHeight : null,
  }
}
