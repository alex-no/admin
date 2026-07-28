# React Version Admin Panel

## Що створено

Створено повноцінну React-версію адмін-панелі як альтернатива до існуючої Vue 3 версії.

### Структура

```
frontend-react/
├── src/
│   ├── components/
│   │   └── TopNav.tsx              # Головна навігація
│   ├── contexts/
│   │   └── AuthContext.tsx         # Контекст авторизації
│   ├── layouts/
│   │   └── BaseLayout.tsx          # Базовий layout
│   ├── pages/
│   │   ├── Login.tsx               # Сторінка входу
│   │   └── Dashboard.tsx           # Головна сторінка
│   ├── routes/
│   │   └── index.tsx               # Конфігурація роутів
│   ├── types/
│   │   └── index.ts                # TypeScript типи
│   ├── utils/
│   │   └── api.ts                  # API helpers (apiGet, apiPost тощо)
│   ├── config/
│   │   └── menu.json               # Конфігурація меню
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docker/
│   └── frontend-react.Dockerfile   # Docker образ для React
├── docker-compose.yml              # Оновлено: додано frontend-react сервіс
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── QUICKSTART.md
```

## Docker Configuration

### Додано новий сервіс

У `docker-compose.yml` додано:

```yaml
frontend-react:
  build:
    context: ./frontend-react
    dockerfile: ../docker/frontend-react.Dockerfile
  container_name: admin_frontend_react
  working_dir: /app
  ports:
    - "5174:5174"
  environment:
    - VITE_API_PROXY_TARGET=http://backend
  volumes:
    - ./frontend-react:/app
    - node_modules_react:/app/node_modules
  depends_on:
    - backend
```

### Порти

- **Vue 3 версія**: http://localhost:5173
- **React версія**: http://localhost:5174
- **Backend API**: http://localhost:8080

Обидві версії можуть працювати **одночасно** без конфліктів.

## Технології

- React 18.3
- TypeScript 5.7
- React Router 7.1
- Bootstrap 5.3
- Vite 8.0

## Останні зміни (2026-07-28)

✅ **List Framework реалізовано!**
- DataTable компонент з повним функціоналом
- Фільтри (search, select) з debounce
- Сортування (одиночне і множинне з Ctrl)
- Пагінація з багатокрапками
- Виділення рядків (checkbox)
- Responsive таблиця

✅ **Перша робоча сторінка**
- "Реєстр даних" (/data-registry)
- Демонструє всі можливості list-framework

## Що реалізовано

✅ **Базова структура проекту**
- TypeScript конфігурація
- Vite збірка
- Path aliases (@/...)
- ESLint налаштування

✅ **Авторизація**
- AuthContext
- Login сторінка
- Збереження токену в localStorage
- 401 interceptor (auto logout)
- Protected routes

✅ **Layout & Navigation**
- BaseLayout з TopNav
- Dropdown меню (аналогічно Vue версії)
- User menu (зміна пароля, вихід)
- Активна секція меню

✅ **API Integration**
- Utility функції (apiGet, apiPost, apiPatch, apiPut, apiDelete)
- Authorization headers
- TypeScript типізація response

✅ **Dashboard**
- Placeholder сторінка з stat cards
- Інформація про статус React версії

✅ **Docker**
- Окремий контейнер frontend-react
- Окремий volume node_modules_react
- Проксі на backend через Vite

## Що в розробці (TODO)

🚧 **List Framework — розширення**
- Date range фільтр
- Bulk actions (масові операції)
- CSV export
- Saved filters (збережені фільтри)

🚧 **CRUD Operations**
- STO List сторінка
- Create/Edit модальні вікна
- Inline editing
- Delete confirmation

🚧 **Components**
- BaseModal
- Filters (search, select, date range)
- Pagination
- BulkActions
- SortIcon

🚧 **Pages**
- STO List
- Users
- Geography (Countries, Cities тощо)
- Analytics
- Error Logs
- тощо

🚧 **Features**
- Permissions check
- CSV export
- Saved filters
- Inline editing tables

## Запуск

### Docker (рекомендовано)

```bash
cd h:\V-hosts\docker\admin
docker-compose up -d frontend-react backend
```

Відкрити: http://localhost:5174

### Локально

```bash
cd frontend-react
npm install
npm run dev
```

## Порівняння з Vue версією

| Функціонал | Vue 3 | React |
|-----------|-------|-------|
| Auth | ✅ | ✅ |
| Routing | ✅ | ✅ |
| Layout + Nav | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| List framework (базовий) | ✅ | ✅ |
| Filters (search, select) | ✅ | ✅ |
| Sort + Pagination | ✅ | ✅ |
| Selection (checkbox) | ✅ | ✅ |
| Modals | ✅ | 🚧 |
| CRUD operations | ✅ | 🚧 |
| Bulk actions | ✅ | 🚧 |
| CSV export | ✅ | 🚧 |
| Inline editing | ✅ | 🚧 |
| Saved filters | ✅ | 🚧 |

## REST API

Обидві версії використовують **один і той самий** REST API:

- `/api/admin/auth/login` — авторизація
- `/api/admin/sto` — список СТО
- `/api/admin/users` — користувачі
- тощо

## Наступні кроки

1. Реалізувати DataTable компонент з фільтрами
2. Створити BaseModal для CRUD операцій
3. Додати сторінку STO List з повним функціоналом
4. Реалізувати bulk actions
5. Додати CSV export
6. Реалізувати систему прав доступу

---

**Створено**: 2026-07-28  
**Автор**: Oleksandr Nosov  
**Ліцензія**: MIT
