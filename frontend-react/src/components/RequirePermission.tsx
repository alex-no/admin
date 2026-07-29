import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import menuConfig from '@/config/menu.json'

interface MenuItem { to: string; permission: string; label: string }
interface MenuSection { items: MenuItem[] }

// Карта "шлях → потрібне право" будується з того самого menu.json, що малює меню.
// Це навмисно: якби гейт маршруту мав власний список прав, він міг би розійтися
// з меню — і користувач бачив би пункт, який не відкривається (або навпаки).
const PATH_PERMISSIONS: Record<string, string> = {}
for (const section of menuConfig as MenuSection[]) {
  for (const item of section.items) {
    PATH_PERMISSIONS[item.to] = item.permission
  }
}

function AccessDenied({ permission }: { permission: string }) {
  return (
    <div className="text-center text-muted py-5">
      <i className="bi bi-shield-lock" style={{ fontSize: '2.5rem' }} />
      <h5 className="mt-3 mb-1">Немає доступу</h5>
      <p className="small mb-1">Для цього розділу потрібне право:</p>
      <p className="mb-4"><code>{permission}</code></p>
      <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
        <i className="bi bi-arrow-left me-1" />
        До панелі управління
      </Link>
    </div>
  )
}

/**
 * Гейт маршруту за правами. Сторінки поза menu.json (дашборд, 404) прав не
 * потребують — для них у карті нічого немає, і вони відкриваються завжди.
 */
export default function RequirePermission({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { can } = useAuth()

  const required = PATH_PERMISSIONS[pathname]
  if (required && !can(required)) {
    return <AccessDenied permission={required} />
  }

  return <>{children}</>
}
