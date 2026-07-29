import BaseModal from '@/components/BaseModal'

const TYPES = [
  { value: 'human', icon: '👤', label: 'Людина' },
  { value: 'bot', icon: '🤖', label: 'Бот' },
  { value: 'suspicious', icon: '⚠️', label: 'Підозрілий' },
  { value: 'unknown', icon: '❓', label: 'Невідомий' },
]

interface ChangeClientTypeModalProps {
  currentType: string | null
  onSelect: (type: string) => void
  onClose: () => void
}

export default function ChangeClientTypeModal({
  currentType,
  onSelect,
  onClose,
}: ChangeClientTypeModalProps) {
  return (
    <BaseModal
      visible={true}
      onClose={onClose}
      title={<h6 className="mb-0">Змінити тип клієнта</h6>}
      footer={
        <>
          <div />
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Скасувати</button>
        </>
      }
      storageKey="change-client-type-modal"
      defaultWidth={400}
      minWidth={320}
      maxWidth={600}
      defaultHeight={350}
      minHeight={250}
      maxHeight={600}
    >
      <div className="d-grid gap-2">
        {TYPES.map(type => (
          <button
            key={type.value}
            className={`btn text-start d-flex align-items-center gap-2 ${
              type.value === currentType ? 'btn-primary text-white' : 'btn-outline-secondary'
            }`}
            onClick={() => onSelect(type.value)}
          >
            <span style={{ fontSize: '1.2em' }}>{type.icon}</span>
            <span>{type.label}</span>
            {type.value === currentType && (
              <span className="ms-auto badge bg-light text-dark">поточний</span>
            )}
          </button>
        ))}
      </div>
    </BaseModal>
  )
}
