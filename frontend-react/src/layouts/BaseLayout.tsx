import { Outlet } from 'react-router-dom'
import TopNav from '@/components/TopNav'
import Breadcrumbs from '@/components/Breadcrumbs'
import RequirePermission from '@/components/RequirePermission'
import { usePageLayout } from '@/hooks/usePageLayout'

export default function BaseLayout() {
  const { contentMargin } = usePageLayout()

  return (
    <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      {/* Поза <main>: <main> прокручується, а крихти мусять лишатись на місці */}
      <Breadcrumbs />
      <main
        className="flex-grow-1 p-4 bg-light"
        style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin 0.2s',
          ...contentMargin,
        }}
      >
        <RequirePermission>
          <Outlet />
        </RequirePermission>
      </main>
    </div>
  )
}
