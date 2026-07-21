# URL Filters - синхронизация фильтров с URL

## Описание

Composable `useUrlFilters` обеспечивает автоматическую синхронизацию фильтров и параметров сортировки с URL.

**Возможности:**
- ✅ Автоматическое сохранение фильтров в URL query параметры
- ✅ Восстановление фильтров при перезагрузке страницы
- ✅ Синхронизация сортировки (поле и направление)
- ✅ Поддержка пользовательских преобразователей значений
- ✅ Автоматическое определение типов (number, boolean, string)

## Использование

### Базовый пример

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useUrlFilters } from '@/composables/useUrlFilters'

// Создаем ref'ы для фильтров
const search = ref('')
const status = ref('')
const page = ref(1)
const sortKey = ref('created_at')
const sortDir = ref('DESC')

// Настраиваем синхронизацию
const { initFromUrl } = useUrlFilters({
  filters: {
    search,           // будет в URL как ?search=...
    status,           // будет в URL как ?status=...
    page             // будет в URL как ?page=...
  },
  sorting: {
    sortKey,          // будет в URL как ?sort_by=...
    sortDir           // будет в URL как ?sort_dir=...
  }
})

onMounted(() => {
  // Инициализируем фильтры из URL перед загрузкой данных
  initFromUrl()
  loadData()
})
</script>
```

### Пример с пользовательскими преобразователями

```vue
<script setup>
const dateFrom = ref('')
const isActive = ref(false)

const { initFromUrl } = useUrlFilters({
  filters: {
    date_from: dateFrom,
    active: isActive
  },
  mappers: {
    // Преобразование для дат
    date_from: {
      toUrl: (value) => value || undefined,  // не добавляем пустые даты
      fromUrl: (value) => value || ''
    },
    // Преобразование для boolean
    active: {
      toUrl: (value) => value ? '1' : undefined,
      fromUrl: (value) => value === '1' || value === 'true'
    }
  }
})
</script>
```

## API

### useUrlFilters(config)

**Параметры config:**

- `filters` (Object) - объект с реактивными фильтрами
  - Ключ - имя параметра в URL
  - Значение - ref с значением фильтра
  
- `sorting` (Object, optional) - объект с параметрами сортировки
  - `sortKey` - ref с именем поля сортировки
  - `sortDir` - ref с направлением (ASC/DESC)
  
- `mappers` (Object, optional) - пользовательские преобразователи
  - Ключ - имя фильтра
  - Значение - объект с функциями `toUrl(value)` и `fromUrl(value)`

**Возвращает:**

- `initFromUrl()` - инициализирует фильтры из URL (вызывать в onMounted)
- `updateUrl()` - обновляет URL (вызывается автоматически при изменении фильтров)
- `resetFilters(defaults)` - сбрасывает фильтры к дефолтным значениям

## Как это работает

1. При монтировании компонента вызываете `initFromUrl()` - восстанавливаются значения из URL
2. При изменении любого фильтра - автоматически обновляется URL через `router.replace()`
3. Пустые значения (`''`, `null`, `undefined`) автоматически удаляются из URL

## Примеры URL

```
# Только поиск
/analytics?search=error

# Поиск + фильтр + сортировка
/analytics?search=api&status=active&sort_by=created_at&sort_dir=DESC

# Несколько фильтров + пагинация
/users?search=john&status=active&page=2

# Фильтры с датами
/error-logs?level=error&date_from=2026-01-01&date_to=2026-01-31
```

## Страницы с включенной синхронизацией

- ✅ Analytics (`/analytics`)
- ✅ Users (`/users`)
- ✅ Error Logs (`/error-logs`)
- ✅ Feedback (`/feedback`)
- ✅ STO List (`/sto`)

## Преимущества

1. **Удобство** - можно делиться ссылками с фильтрами
2. **UX** - фильтры сохраняются при перезагрузке страницы
3. **Навигация** - кнопки "назад/вперёд" браузера работают корректно
4. **Единообразие** - все страницы работают одинаково
