import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import menuConfig from '@/config/menu.json'
import { findMenuLocation } from '@/utils/menuLocation'

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

export default function TopNav() {
  const { user, logout, can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const menu = menuConfig as MenuSection[]

  // Розділ показуємо, якщо є право на нього або хоча б на один його пункт —
  // інакше заголовок групи висів би з порожнім списком.
  const visibleMenu = menu.filter(
    s => can(s.permission) || s.items.some(i => can(i.permission))
  )

  // Через findMenuLocation, а не голий startsWith: `/sto-managers` збігався б із
  // `/sto` і підсвічував чужий розділ (див. utils/menuLocation.ts).
  const activeSection = findMenuLocation(location.pathname)?.section.id ?? null

  const handleLogout = async () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3 py-0">
      {/* Brand */}
      <Link className="navbar-brand fw-bold me-4" to="/">
        Oleksandr Nosov <span className="text-secondary fw-normal small">Admin (React)</span>
      </Link>

      {/* Top-level menu items */}
      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          {visibleMenu.map(section => (
            <li
              key={section.id}
              className="nav-item dropdown"
              onMouseEnter={() => setOpenMenu(section.id)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <a
                className={`nav-link dropdown-toggle px-3 py-3 ${
                  activeSection === section.id ? 'active' : ''
                }`}
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setOpenMenu(openMenu === section.id ? null : section.id)
                }}
              >
                <i className={`bi ${section.icon} me-1`}></i>
                {section.label}
              </a>
              {/* Second level */}
              <ul className={`dropdown-menu mt-0 ${openMenu === section.id ? 'show' : ''}`}>
                {section.items.filter(i => can(i.permission)).map(item => (
                  <li key={item.to}>
                    <Link
                      className="dropdown-item"
                      to={item.to}
                      onClick={() => setOpenMenu(null)}
                    >
                      <i className={`bi ${item.icon} me-2 text-muted`}></i>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* User block */}
        <div className="d-flex align-items-center gap-3">
          <div className="dropdown">
            <button
              className="btn btn-sm btn-outline-secondary dropdown-toggle"
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <i className="bi bi-person-circle me-1"></i>
              {user?.username || 'User'}
            </button>
            <ul className={`dropdown-menu dropdown-menu-end ${userMenuOpen ? 'show' : ''}`}>
              <li>
                <Link
                  className="dropdown-item"
                  to="/change-password"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <i className="bi bi-key me-2"></i>Змінити пароль
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <a className="dropdown-item" href="#" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i>Вийти
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
}
