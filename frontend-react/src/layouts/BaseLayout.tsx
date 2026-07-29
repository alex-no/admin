import { Outlet } from 'react-router-dom'
import TopNav from '@/components/TopNav'
import RequirePermission from '@/components/RequirePermission'
import { usePageLayout } from '@/hooks/usePageLayout'

export default function BaseLayout() {
  const { contentMargin } = usePageLayout()

  return (
    <div className="d-flex flex-column" style={{ height: '100vh', overflow: 'hidden' }}>
      <TopNav />
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
