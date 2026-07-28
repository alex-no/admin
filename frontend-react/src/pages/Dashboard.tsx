export default function Dashboard() {
  return (
    <div>
      <h4 className="mb-4">Дашборд</h4>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-2">СТО</h6>
              <h3 className="mb-0">—</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-2">Користувачі</h6>
              <h3 className="mb-0">—</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-2">Бронювання</h6>
              <h3 className="mb-0">—</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="text-muted mb-2">Відгуки</h6>
              <h3 className="mb-0">—</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h5 className="card-title">Ласкаво просимо до React-версії адмінки!</h5>
          <p className="card-text">
            Це базова структура адмін-панелі на React + TypeScript + Bootstrap 5.
            Використовує той самий REST API що й Vue 3 версія.
          </p>
          <ul className="small text-muted">
            <li>✅ React Router для навігації</li>
            <li>✅ AuthContext для авторизації</li>
            <li>✅ Bootstrap 5 для UI</li>
            <li>✅ TypeScript для типізації</li>
            <li>✅ Vite для збірки</li>
            <li>🚧 List framework (у розробці)</li>
            <li>🚧 CRUD операції (у розробці)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
