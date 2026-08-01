interface EmptyStateProps {
  /** Чи застосовано зараз хоч один фільтр (рахує той, хто рендерить) */
  filtered?: boolean
  /** Родовий відмінок множини: «населених пунктів», «користувачів» */
  entityLabel?: string
  canCreate?: boolean
  icon?: string
  onCreate?: () => void
  onResetFilters?: () => void
}

/**
 * Порожній список. Два стани, які раніше зливались в одне «Немає даних»:
 * записів справді немає (тоді пропонуємо створити) — і фільтр нічого не знайшов
 * (тоді пропонуємо його скинути). Дзеркало Vue: components/EmptyState.vue.
 */
export default function EmptyState({
  filtered = false,
  entityLabel = 'записів',
  canCreate = false,
  icon = 'bi-inbox',
  onCreate,
  onResetFilters,
}: EmptyStateProps) {
  return (
    <div className="text-center py-5">
      <i className={`bi ${filtered ? 'bi-funnel' : icon}`} style={{ fontSize: '2.5rem', opacity: 0.35 }} />

      <p className="text-muted mt-3 mb-3">
        {filtered ? 'За вибраними фільтрами нічого не знайдено' : `Ще немає ${entityLabel}`}
      </p>

      {filtered ? (
        <button className="btn btn-sm btn-outline-secondary" onClick={onResetFilters}>
          <i className="bi bi-x-circle me-1" />Скинути фільтри
        </button>
      ) : canCreate ? (
        <button className="btn btn-sm btn-primary" onClick={onCreate}>
          <i className="bi bi-plus-lg me-1" />Створити
        </button>
      ) : null}
    </div>
  )
}
