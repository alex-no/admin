# Development Guide

## Архітектура React-версії

Цей проект створений як **конструктор адмін-панелі з нуля**, а не доробка react-admin або іншої готової бібліотеки.

### Принципи

1. **Власний list-framework** — таблиці, фільтри, пагінація написані з нуля
2. **Bootstrap 5** — використовуємо нативні класи без wrapper-компонентів
3. **TypeScript** — строга типізація для всього
4. **Той самий API** — використовуємо існуючий REST API з Vue версії

## Поточний стан

### ✅ Готово

```
src/
├── contexts/AuthContext.tsx    # Auth state + login/logout
├── utils/api.ts                # API wrapper functions
├── routes/index.tsx            # Routing + ProtectedRoute
├── layouts/BaseLayout.tsx      # Main layout
├── components/TopNav.tsx       # Navigation menu
├── pages/
│   ├── Login.tsx               # Auth page
│   └── Dashboard.tsx           # Main page
└── types/index.ts              # Base types
```

### 🚧 TODO

#### 1. List Framework

Потрібно створити аналог Vue версії `src/list-framework/`:

```
src/list-framework/
├── DataTable.tsx               # Основна таблиця
├── useTableState.ts            # Hook для state (filters, sort, pagination)
├── Pagination.tsx              # Компонент пагінації
├── SortIcon.tsx                # Іконка сортування
├── filters/
│   ├── SearchFilter.tsx        # Пошуковий фільтр
│   ├── SelectFilter.tsx        # Dropdown фільтр
│   ├── DateRangeFilter.tsx     # Фільтр по датах
│   └── index.ts
├── cells/
│   ├── TextCell.tsx            # Звичайна комірка
│   ├── EditableCell.tsx        # Inline editing
│   ├── SelectCell.tsx          # Dropdown в комірці
│   ├── DateCell.tsx            # Форматування дати
│   └── index.ts
└── types.ts                    # Типи для list-framework
```

**Референс з Vue версії:**
- `frontend/src/list-framework/DataListPage.vue` — головний компонент
- `frontend/src/list-framework/composables/useList.js` — логіка state

#### 2. Модальні вікна

```
src/components/
├── BaseModal.tsx               # Базове модальне вікно
├── ModalTabs.tsx               # Табби в модалці
└── modals/
    ├── StoModal.tsx            # Створення/редагування СТО
    ├── UserModal.tsx           # Користувачі
    └── ...
```

**Референс з Vue версії:**
- `frontend/src/components/BaseModal.vue`
- `frontend/src/components/ModalTabs.vue`

#### 3. Bulk Actions

```
src/components/BulkActions.tsx  # Масові операції
```

**Референс з Vue версії:**
- `frontend/src/components/BulkActions.vue`

#### 4. Сторінки з CRUD

```
src/pages/
├── StoList.tsx                 # Список СТО
├── Users.tsx                   # Користувачі
├── geography/
│   ├── Countries.tsx
│   ├── Cities.tsx
│   └── ...
└── ...
```

**Референс з Vue версії:**
- `frontend/src/pages/StoList.vue` — найскладніша сторінка з інлайн-редагуванням

## Як додати нову сторінку

### 1. Створити компонент сторінки

```tsx
// src/pages/Users.tsx
export default function Users() {
  return (
    <div>
      <h4 className="mb-4">Користувачі</h4>
      {/* TODO: DataTable */}
    </div>
  )
}
```

### 2. Додати роут

```tsx
// src/routes/index.tsx
import Users from '@/pages/Users'

// В <Route path="/*"> блоці:
<Route path="users" element={<Users />} />
```

### 3. Додати в меню (якщо потрібно)

```json
// src/config/menu.json
{
  "items": [
    {
      "label": "Користувачі",
      "to": "/users",
      "icon": "bi-people",
      "permission": "users.view"
    }
  ]
}
```

## API Integration Pattern

### Fetch даних

```tsx
import { useEffect, useState } from 'react'
import { apiGet } from '@/utils/api'
import type { PaginatedResponse, STO } from '@/types'

export default function StoList() {
  const [items, setItems] = useState<STO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const response = await apiGet<PaginatedResponse<STO>>('/admin/sto?page=1&limit=20')
      setItems(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="spinner-border"></div>
  if (error) return <div className="alert alert-danger">{error}</div>

  return (
    <table className="table">
      {/* ... */}
    </table>
  )
}
```

### Update запит

```tsx
import { apiPatch } from '@/utils/api'

async function updateSto(id: number, data: Partial<STO>) {
  try {
    const response = await apiPatch(`/admin/sto/${id}`, data)
    // Оновити local state
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...response.data } : item
    ))
  } catch (err) {
    console.error(err)
  }
}
```

## Styling Guide

### Bootstrap класи

Використовуємо нативні Bootstrap 5 класи:

```tsx
<div className="card shadow-sm">
  <div className="card-body">
    <h5 className="card-title">Title</h5>
    <p className="card-text">Text</p>
  </div>
</div>
```

### Custom стилі

Тільки для специфічних речей, яких немає в Bootstrap:

```css
/* src/index.css */
.th-sortable {
  cursor: pointer;
  user-select: none;
}
```

## TypeScript Types

### Додавання нових типів

```typescript
// src/types/index.ts

export interface City {
  id: number
  name_uk: string
  name_ru?: string
  country_id: number
  created_at: string
}

export interface CityFormData {
  name_uk: string
  name_ru?: string
  country_id: number
}
```

### Generic API Response

```typescript
export interface ApiResponse<T = any> {
  status: 'success' | 'error'
  data?: T
  message?: string
}

export interface PaginatedResponse<T> {
  status: 'success'
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
```

## Testing План

(TODO: після реалізації основного функціоналу)

1. Unit tests для utils/api.ts
2. Component tests для filters/cells
3. Integration tests для CRUD flows
4. E2E tests для critical paths

## Performance

### Memo optimization

Використовувати `React.memo()` для списків:

```tsx
import React from 'react'

const TableRow = React.memo(({ item }: { item: STO }) => {
  return <tr>...</tr>
})
```

### Debounce для search

```tsx
import { useState, useEffect } from 'react'

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

## Наступні пріоритети

1. **DataTable** — найважливіший компонент, база для всіх списків
2. **Filters** — search, select, date range
3. **StoList** — реальна сторінка з даними
4. **BaseModal** — для create/edit
5. **Bulk Actions** — масові операції

---

**Питання?** Дивіться Vue версію в `frontend/src/` як референс.
