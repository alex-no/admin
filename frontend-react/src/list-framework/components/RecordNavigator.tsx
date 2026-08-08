import { useTranslation } from 'react-i18next'

interface RecordNavigatorProps {
  position: number | null
  totalCount: number
  hasPrev: boolean
  hasNext: boolean
  busy: boolean
  onPrev: () => void
  onNext: () => void
}

export default function RecordNavigator({
  position,
  totalCount,
  hasPrev,
  hasNext,
  busy,
  onPrev,
  onNext,
}: RecordNavigatorProps) {
  const { t } = useTranslation()
  return (
    <div className="d-inline-flex align-items-center" style={{ gap: '0.125rem', marginRight: '2rem' }}>
      <button
        className="btn btn-sm btn-outline-secondary py-0 px-2"
        disabled={!hasPrev || busy}
        title={t('common.prevRecord')}
        onClick={onPrev}
      >
        ‹
      </button>
      <span
        className="text-muted small font-monospace"
        style={{ minWidth: '4rem', textAlign: 'center' }}
      >
        {busy ? (
          <span
            className="spinner-border spinner-border-sm"
            style={{ width: '0.7rem', height: '0.7rem' }}
          />
        ) : (
          `${position ?? '—'} / ${totalCount}`
        )}
      </span>
      <button
        className="btn btn-sm btn-outline-secondary py-0 px-2"
        disabled={!hasNext || busy}
        title={t('common.nextRecord')}
        onClick={onNext}
      >
        ›
      </button>
    </div>
  )
}
