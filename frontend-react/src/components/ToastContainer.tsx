import { useNotifications, dismiss } from '@/hooks/useNotify'
import type { Notification, NotifyType } from '@/hooks/useNotify'

function toastClass(type: NotifyType): string {
  return {
    success: 'text-bg-success',
    error: 'text-bg-danger',
    info: 'text-bg-secondary',
  }[type] ?? 'text-bg-secondary'
}

export default function ToastContainer() {
  const notifications = useNotifications()

  // Дію (напр. "Скасувати") виконуємо і одразу закриваємо тост — не чекаємо автозакриття,
  // щоб не можна було клікнути дію двічі.
  const handleAction = (n: Notification) => {
    n.action?.onClick()
    dismiss(n.id)
  }

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1090 }}>
      {notifications.map(n => (
        <div
          key={n.id}
          className={`toast show align-items-center border-0 mb-2 ${toastClass(n.type)}`}
          role="alert"
        >
          <div className="d-flex">
            <div className="toast-body" style={{ whiteSpace: 'pre-wrap' }}>{n.message}</div>
            {n.action && (
              <button
                type="button"
                className="btn btn-sm btn-link text-white text-decoration-none flex-shrink-0 align-self-center"
                onClick={() => handleAction(n)}
              >
                {n.action.label}
              </button>
            )}
            <button
              type="button"
              className="btn-close btn-close-white flex-shrink-0 align-self-center me-2"
              onClick={() => dismiss(n.id)}
            />
          </div>
          {n.duration > 0 && (
            <div className="toast-progress" style={{ animationDuration: `${n.duration}ms` }} />
          )}
        </div>
      ))}
    </div>
  )
}
