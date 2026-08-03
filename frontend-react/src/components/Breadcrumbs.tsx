import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { findMenuLocation } from '@/utils/menuLocation'

/**
 * Хлібні крихти з menu.json. Дзеркало Vue: components/Breadcrumbs.vue.
 *
 * Дублювання з `<h5>` на сторінці — свідоме: заголовок називає сторінку, а
 * крихти дають те, чого він не дає, — **розділ**. Компонент живе в BaseLayout,
 * тобто лише під авторизацією — на логіні його немає взагалі.
 */
export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { can } = useAuth()

  const found = findMenuLocation(pathname)
  // Розділ/пункт, закритий правами, не називаємо — навіть якщо адмін якось
  // опинився на URL. Тоді лишиться сама «Головна».
  const location =
    found &&
    (!found.section.permission || can(found.section.permission)) &&
    (!found.item.permission || can(found.item.permission))
      ? found
      : null

  const recordId = searchParams.get('id')

  return (
    <nav aria-label="breadcrumb" className="px-4 py-2 border-bottom flex-shrink-0" style={{ backgroundColor: 'var(--bs-secondary-bg)' }}>
      <ol className="breadcrumb mb-0 small">
        <li className="breadcrumb-item">
          <Link to="/">Головна</Link>
        </li>

        {/* Розділ — навмисно не посилання: у menu.json розділи не мають власного
            `to`, це чисті групи для випадайки. */}
        {location && (
          <li className="breadcrumb-item text-muted">
            {location.section.icon && <i className={`bi ${location.section.icon} me-1`} />}
            {location.section.label}
          </li>
        )}

        {location && (
          <li className="breadcrumb-item active" aria-current="page">
            {location.item.label}
          </li>
        )}

        {/* Відкритий запис. Номер, а не назва: запису може не бути на поточній
            сторінці списку (перехід по прямому посиланню). */}
        {recordId && (
          <li className="breadcrumb-item active" aria-current="page">
            #{recordId}
          </li>
        )}
      </ol>
    </nav>
  )
}
