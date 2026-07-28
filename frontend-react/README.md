# Admin Panel (React Version)

React-версія адмін-панелі, яка використовує той самий REST API що й Vue 3 версія.

## Технології

- **React 18** — UI бібліотека
- **TypeScript** — типізація
- **Vite** — збірка і dev-сервер
- **React Router** — маршрутизація
- **Bootstrap 5** — UI фреймворк
- **Bootstrap Icons** — іконки

## Структура проекту

```
frontend-react/
├── src/
│   ├── components/     # Переиспользуемые компоненты
│   │   └── TopNav.tsx
│   ├── contexts/       # React контексты
│   │   └── AuthContext.tsx
│   ├── hooks/          # Custom hooks
│   ├── layouts/        # Layouts
│   │   └── BaseLayout.tsx
│   ├── pages/          # Страницы-роуты
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── routes/         # Конфигурация роутинга
│   │   └── index.tsx
│   ├── types/          # TypeScript типы
│   │   └── index.ts
│   ├── utils/          # Утилиты
│   │   └── api.ts
│   ├── config/         # Конфигурационные файлы
│   │   └── menu.json
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Запуск через Docker

### 1. Запуск всех сервисов (backend + Vue + React)

```bash
cd h:\V-hosts\docker\admin
docker-compose up -d
```

### 2. Запуск только React frontend + backend

```bash
docker-compose up -d backend frontend-react
```

### 3. Доступ

- **React версия**: http://localhost:5174
- **Vue версия**: http://localhost:5173
- **Backend API**: http://localhost:8080

## Локальная разработка (без Docker)

### Установка зависимостей

```bash
cd frontend-react
npm install
```

### Запуск dev-сервера

```bash
npm run dev
```

Откроется на http://localhost:5174

### Сборка для продакшна

```bash
npm run build
```

Результат в папке `dist/`

## API

Все API запросы проксируются на backend через Vite dev-сервер:

```
/api/* → http://localhost:8080/api/*
```

Конфигурация в `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

## Авторизация

Токен хранится в `localStorage` под ключом `admin_token`.

При 401 ответе автоматически происходит logout и редирект на `/login`.

## TODO

- [ ] Реализовать list-framework аналог (DataTable, filters, pagination)
- [ ] Добавить CRUD операции для STO
- [ ] Добавить модальные окна (BaseModal)
- [ ] Реализовать bulk actions
- [ ] Добавить остальные страницы (Users, Geography, Analytics и т.д.)
- [ ] Реализовать систему прав доступа (permissions check)
- [ ] Добавить inline editing для таблиц
- [ ] Реализовать экспорт в CSV
- [ ] Добавить сохранение фильтров

## Сравнение с Vue версией

| Функционал | Vue 3 | React |
|-----------|-------|-------|
| Auth | ✅ | ✅ |
| Routing | ✅ | ✅ |
| Layout + Nav | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| List framework | ✅ | 🚧 |
| Modals | ✅ | 🚧 |
| CRUD operations | ✅ | 🚧 |
| Bulk actions | ✅ | 🚧 |
| Filters + CSV | ✅ | 🚧 |

---

**Автор**: Oleksandr Nosov  
**Ліцензія**: MIT
