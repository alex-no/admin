# Швидкий старт

## Запуск React-версії адмінки

### Варіант 1: Docker (рекомендовано)

```bash
# З кореневої директорії проекту admin
cd h:\V-hosts\docker\admin

# Запустити React frontend + backend
docker-compose up -d backend frontend-react

# Або запустити ВСІ сервіси (Vue + React + Backend)
docker-compose up -d
```

**Доступ:**
- React адмінка: http://localhost:5174
- Vue адмінка: http://localhost:5173
- Backend API: http://localhost:8080

### Варіант 2: Локально (без Docker)

```bash
# Перейти в директорію React проекту
cd h:\V-hosts\docker\admin\frontend-react

# Встановити залежності
npm install

# Запустити dev-сервер
npm run dev
```

**Важливо:** Backend має бути запущений окремо на http://localhost:8080

## Логін

За замовчуванням (якщо backend використовує mock auth):
- Username: `admin`
- Password: `admin`

## Перша перевірка

1. Відкрити http://localhost:5174
2. Увійти через форму логіну
3. Побачити Dashboard з placeholder-даними
4. Перевірити навігаційне меню зверху

## Що працює

✅ Авторизація (login/logout)  
✅ Routing (React Router)  
✅ Layout з навігацією  
✅ Dashboard  
✅ API integration (fetch wrapper)  
✅ 401 interceptor (auto logout)

## Що в розробці

🚧 List framework (таблиці з фільтрами)  
🚧 CRUD операції  
🚧 Модальні вікна  
🚧 Bulk actions  
🚧 Інші сторінки (STO, Users, Analytics тощо)

## Наступні кроки

1. Реалізувати DataTable компонент
2. Додати фільтри і пагінацію
3. Створити BaseModal
4. Додати сторінку STO List
5. Реалізувати CRUD для STO

---

**Питання?** Дивіться [README.md](./README.md) для детальної інформації.
