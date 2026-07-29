export default function ApiDocsAdmin() {
  const swaggerUrl = `${window.location.origin}/api/admin/doc`

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-book me-2" />
          Admin API Documentation
        </h5>
        <span className="badge bg-warning text-dark">Dev Only</span>
      </div>
      <div className="card-body p-0">
        <iframe
          src={swaggerUrl}
          style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none' }}
          title="Admin API Documentation"
        />
      </div>
    </div>
  )
}
