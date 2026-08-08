import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import menuConfig from '@/config/menu.json'

interface MenuItem { label: string; to: string; icon: string }
interface MenuSection { id: string; label: string; icon: string; items: MenuItem[] }

/**
 * Меню на дашборді та у верхній панелі будується з menu.json — того самого, що й
 * у Vue-версії, щоб вигляд збігався. Але маршрути в React-порті поки реалізовані
 * не всі, тож замість білої порожнечі показуємо, що саме ще не перенесено.
 */
export default function NotImplemented() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const menu = menuConfig as MenuSection[]

  const section = menu.find(s => s.items.some(i => i.to === pathname))
  const item = section?.items.find(i => i.to === pathname)

  return (
    <div className="text-center text-muted py-5">
      <i className={`bi ${item?.icon ?? 'bi-cone-striped'}`} style={{ fontSize: '2.5rem' }} />
      <h5 className="mt-3 mb-1">{item?.label ?? t('notImplemented.sectionNotFound')}</h5>
      {section && <div className="small mb-3">{section.label}</div>}
      <p className="small mb-4">
        {item
          ? t('notImplemented.notImplementedReact')
          : <>{t('notImplemented.pageNotFound')} <code>{pathname}</code></>}
      </p>
      <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
        <i className="bi bi-arrow-left me-1" />
        {t('notImplemented.backToDashboard')}
      </Link>
    </div>
  )
}
