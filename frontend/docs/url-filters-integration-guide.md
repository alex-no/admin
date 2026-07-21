# Руководство по интеграции URL Filters

## Быстрая интеграция в существующую страницу

### Шаг 1: Импортируйте composable

```vue
<script setup>
import { useUrlFilters } from '@/composables/useUrlFilters'
// ... остальные импорты
</script>
```

### Шаг 2: Добавьте инициализацию после определения ref'ов

```vue
<script setup>
// Существующие ref'ы
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const sortKey = ref('created_at')
const sortDir = ref('DESC')

// ✨ Добавить эту секцию
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    status: filterStatus,  // имя в URL будет 'status'
    page
  },
  sorting: {
    sortKey,
    sortDir
  }
})
</script>
```

### Шаг 3: Вызовите initFromUrl() перед загрузкой данных

```vue
<script setup>
// Было:
onMounted(() => {
  load()
})

// Стало:
onMounted(() => {
  initFromUrl()  // ✨ Добавить эту строку
  load()
})
</script>
```

**Готово!** Теперь фильтры автоматически синхронизируются с URL.

## Пример полной интеграции

```vue
<template>
  <BaseLayout>
    <div class="d-flex gap-2 mb-3">
      <!-- Поиск -->
      <input
        v-model="search"
        type="text"
        class="form-control form-control-sm"
        placeholder="Пошук..."
        @input="debounceLoad"
      />
      
      <!-- Фильтр по статусу -->
      <select v-model="filterStatus" class="form-select form-select-sm" @change="load(1)">
        <option value="">Всі статуси</option>
        <option value="active">Активні</option>
        <option value="inactive">Неактивні</option>
      </select>
      
      <!-- Фильтр по типу -->
      <select v-model="filterType" class="form-select form-select-sm" @change="load(1)">
        <option value="">Всі типи</option>
        <option value="type1">Тип 1</option>
        <option value="type2">Тип 2</option>
      </select>
    </div>

    <!-- Таблица с сортировкой -->
    <table class="table">
      <thead>
        <tr>
          <th @click="toggleSort('id')" class="cursor-pointer">
            ID <SortIcon col="id" :sortKey :sortDir />
          </th>
          <th @click="toggleSort('name')" class="cursor-pointer">
            Назва <SortIcon col="name" :sortKey :sortDir />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
        </tr>
      </tbody>
    </table>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUrlFilters } from '@/composables/useUrlFilters'
import BaseLayout from '@/layouts/BaseLayout.vue'
import SortIcon from '@/components/SortIcon.vue'

// Данные
const items = ref([])
const loading = ref(false)
const page = ref(1)

// Фильтры
const search = ref('')
const filterStatus = ref('')
const filterType = ref('')

// Сортировка
const sortKey = ref('id')
const sortDir = ref('DESC')

// 🔥 Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    status: filterStatus,
    type: filterType,
    page
  },
  sorting: {
    sortKey,
    sortDir
  }
})

// Загрузка данных
async function load(p = 1) {
  loading.value = true
  page.value = p
  
  const params = new URLSearchParams({
    page: page.value,
    sort_by: sortKey.value,
    sort_dir: sortDir.value
  })
  
  if (search.value) params.set('search', search.value)
  if (filterStatus.value) params.set('status', filterStatus.value)
  if (filterType.value) params.set('type', filterType.value)
  
  try {
    const res = await fetch(`/api/admin/your-endpoint?${params}`)
    const json = await res.json()
    items.value = json.data
  } finally {
    loading.value = false
  }
}

// Сортировка
function toggleSort(col) {
  if (sortKey.value === col) {
    sortDir.value = sortDir.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortKey.value = col
    sortDir.value = 'DESC'
  }
  load(1)
}

// Debounce для поиска
let debounceTimer
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 400)
}

// 🔥 Инициализация при монтировании
onMounted(() => {
  initFromUrl()  // Восстанавливаем фильтры из URL
  load()         // Загружаем данные
})
</script>
```

## Типичные сценарии

### Сценарий 1: Только фильтры (без сортировки)

```javascript
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    status: filterStatus
  }
})
```

### Сценарий 2: Только сортировка (без фильтров)

```javascript
const { initFromUrl } = useUrlFilters({
  sorting: {
    sortKey,
    sortDir
  }
})
```

### Сценарий 3: Фильтры с датами

```javascript
const { initFromUrl } = useUrlFilters({
  filters: {
    date_from: filterDateFrom,
    date_to: filterDateTo
  }
})
```

### Сценарий 4: Множественные фильтры

```javascript
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    status: filterStatus,
    type: filterType,
    category: filterCategory,
    date_from: filterDateFrom,
    date_to: filterDateTo,
    page
  },
  sorting: {
    sortKey,
    sortDir
  }
})
```

## Важные моменты

### ✅ Правильно

```javascript
// Инициализация ПЕРЕД загрузкой данных
onMounted(() => {
  initFromUrl()
  load()
})
```

### ❌ Неправильно

```javascript
// НЕ вызывайте load() перед initFromUrl()
onMounted(() => {
  load()
  initFromUrl()  // Уже поздно!
})
```

### ✅ Правильно - разные имена в коде и URL

```javascript
const filterStatus = ref('')  // в коде

const { initFromUrl } = useUrlFilters({
  filters: {
    status: filterStatus  // в URL будет ?status=...
  }
})
```

### ✅ Правильно - одинаковые имена

```javascript
const search = ref('')

const { initFromUrl } = useUrlFilters({
  filters: {
    search  // короткая запись, в URL будет ?search=...
  }
})
```

## Чеклист интеграции

- [ ] Импортирован `useUrlFilters`
- [ ] Добавлен вызов `useUrlFilters()` после определения ref'ов
- [ ] Добавлен вызов `initFromUrl()` в `onMounted()` ПЕРЕД `load()`
- [ ] Протестировано: фильтры появляются в URL при изменении
- [ ] Протестировано: фильтры восстанавливаются при перезагрузке страницы
- [ ] Протестировано: кнопки "назад/вперёд" браузера работают корректно

## Troubleshooting

### Проблема: Фильтры не сохраняются в URL

**Решение:** Убедитесь, что фильтры объявлены как `ref()` и переданы в `useUrlFilters`:

```javascript
const search = ref('')  // ✅ Правильно

const { initFromUrl } = useUrlFilters({
  filters: {
    search  // ✅ Передаём ref
  }
})
```

### Проблема: Фильтры не восстанавливаются при перезагрузке

**Решение:** Убедитесь, что `initFromUrl()` вызывается ПЕРЕД `load()`:

```javascript
onMounted(() => {
  initFromUrl()  // ✅ Сначала восстанавливаем
  load()         // ✅ Потом загружаем
})
```

### Проблема: Пустые значения остаются в URL

**Решение:** Используйте mapper для удаления пустых значений:

```javascript
const { initFromUrl } = useUrlFilters({
  filters: {
    search
  },
  mappers: {
    search: {
      toUrl: (value) => value || undefined  // undefined = удалить из URL
    }
  }
})
```
