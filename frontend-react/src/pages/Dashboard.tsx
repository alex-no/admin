import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SystemHealthWidget from '@/components/SystemHealthWidget'
import { useAuth } from '@/contexts/AuthContext'
import menuConfig from '@/config/menu.json'

interface MenuItem {
  label: string
  to: string
  icon: string
  permission: string
  roles: string[]
}

interface MenuSection {
  id: string
  label: string
  icon: string
  permission: string
  roles: string[]
  items: MenuItem[]
}

export default function Dashboard() {
  const { can } = useAuth()
  const { t } = useTranslation()
  const menu = menuConfig as MenuSection[]

  const visibleMenu = menu.filter(
    s => can(s.permission) || s.items.some(i => can(i.permission))
  )

  return (
    <div>
      <h5 className="mb-4">{t('dashboard.title')}</h5>

      {can('system.monitoring.view') && <SystemHealthWidget />}

      <div className="row g-3">
        {visibleMenu.map(section => (
          <div key={section.id} className="col-sm-6 col-lg-3">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex flex-column">
                <div className="mb-3">
                  <i className={`bi ${section.icon} fs-2 text-primary`} />
                </div>
                <h6 className="card-title">{t(section.label)}</h6>
                <ul className="list-unstyled mt-auto mb-0">
                  {section.items.filter(i => can(i.permission)).map(item => (
                    <li key={item.to}>
                      <Link to={item.to} className="text-decoration-none small">
                        <i className={`bi ${item.icon} me-1 text-muted`} />
                        {t(item.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
