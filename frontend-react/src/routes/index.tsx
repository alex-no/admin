import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import BaseLayout from '@/layouts/BaseLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import DataRegistry from '@/pages/DataRegistry'
import Analytics from '@/pages/Analytics'
import AnalyticsStats from '@/pages/AnalyticsStats'
import AnalyticsCharts from '@/pages/AnalyticsCharts'
import RoleManagement from '@/pages/RoleManagement'
import PermissionList from '@/pages/PermissionList'
import ErrorLogs from '@/pages/ErrorLogs'
import ErrorLogStats from '@/pages/ErrorLogStats'
import ApiDocsAdmin from '@/pages/ApiDocsAdmin'
import NotImplemented from '@/pages/NotImplemented'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Завантаження...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/** Сторінка входу залогіненому не потрібна — як requiresGuest у Vue-роутері */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <BaseLayout />
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Дані */}
        <Route path="data-registry" element={<DataRegistry />} />

        {/* Аналітика */}
        <Route path="analytics" element={<Analytics />} />
        <Route path="analytics/stats" element={<AnalyticsStats />} />
        <Route path="analytics/charts" element={<AnalyticsCharts />} />

        {/* Ролі та права */}
        <Route path="roles" element={<RoleManagement />} />
        <Route path="permissions" element={<PermissionList />} />

        {/* Система */}
        <Route path="error-logs" element={<ErrorLogs />} />
        <Route path="error-logs/stats" element={<ErrorLogStats />} />

        {/* Dev Tools */}
        <Route path="api-docs-admin" element={<ApiDocsAdmin />} />

        {/* 404 */}
        <Route path="*" element={<NotImplemented />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
