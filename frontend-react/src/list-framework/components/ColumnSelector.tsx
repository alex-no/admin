import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnConfig } from '../types'

interface ColumnSelectorProps {
  /** Повний конфіг колонок таблиці; показуємо лише hideable !== false */
  columns: ColumnConfig[]
  isVisible: (key: string) => boolean
  hasHidden: boolean
  onToggle: (key: string) => void
  onReset: () => void
}

/**
 * Дзеркало Vue-версії frontend/src/components/ColumnSelector.vue —
 * та сама розмітка Bootstrap і та сама поведінка.
 * Дропдаун рукописний: Bootstrap JS ним не керує.
 */
export default function ColumnSelector({
  columns,
  isVisible,
  hasHidden,
  onToggle,
  onReset,
}: ColumnSelectorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  // Унікальний префікс для id чекбоксів: на сторінці може бути кілька таблиць
  const uid = useId()

  const hideableColumns = columns.filter(c => c.hideable !== false)
  const hiddenCount = hideableColumns.filter(c => !isVisible(c.key)).length

  // Окремої утиліти click-outside у проєкті немає — слухаємо document тут.
  useEffect(() => {
    if (!open) return

    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="position-relative d-inline-block">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title={hasHidden ? 'Колонки таблиці (частина прихована)' : 'Колонки таблиці'}
        onClick={() => setOpen(v => !v)}
      >
        <i className="bi bi-layout-three-columns" />
        {hiddenCount > 0 && (
          <span className="badge bg-secondary ms-1 py-0" style={{ fontSize: '.65em' }}>
            {hiddenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="dropdown-menu show p-2"
          style={{
            top: '100%',
            left: 'auto',
            right: 0,
            minWidth: '210px',
            maxHeight: '320px',
            overflowY: 'auto',
            zIndex: 1050,
          }}
        >
          {hideableColumns.map(col => (
            <div key={col.key} className="form-check mb-1">
              <input
                id={`colsel-${uid}-${col.key}`}
                className="form-check-input"
                type="checkbox"
                checked={isVisible(col.key)}
                onChange={() => onToggle(col.key)}
              />
              <label className="form-check-label small" htmlFor={`colsel-${uid}-${col.key}`}>
                {col.label}
              </label>
            </div>
          ))}

          {hideableColumns.length === 0 && (
            <div className="text-muted small px-1">Немає колонок, які можна приховати</div>
          )}

          {hideableColumns.length > 0 && (
            <>
              <hr className="my-2" />
              <button
                type="button"
                className="btn btn-sm btn-link p-0 small text-decoration-none"
                disabled={!hasHidden}
                onClick={onReset}
              >
                {t('table.resetColumns')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
