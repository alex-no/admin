# BaseModal - Универсальное модальное окно

## Использование

### Простой пример

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Моё окно"
    storage-key="my-modal"
  >
    <p>Контент модального окна</p>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const isOpen = ref(false)
</script>
```

### С кастомным заголовком

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    storage-key="my-modal"
  >
    <template #title>
      <h5 class="mb-0">
        Користувач <span class="text-muted">#{{ userId }}</span>
      </h5>
    </template>

    <p>Контент модального окна</p>
  </BaseModal>
</template>
```

### С футером

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Редагування"
    storage-key="edit-modal"
  >
    <form>
      <!-- форма -->
    </form>

    <template #footer>
      <div class="text-muted small">ID: {{ itemId }}</div>
      <div>
        <button class="btn btn-sm btn-secondary" @click="isOpen = false">
          Скасувати
        </button>
        <button class="btn btn-sm btn-primary" @click="save">
          Зберегти
        </button>
      </div>
    </template>
  </BaseModal>
</template>
```

### С кастомными размерами

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Велике вікно"
    storage-key="large-modal"
    :default-width="900"
    :min-width="600"
    :max-width="1400"
    :default-height="500"
    :min-height="400"
    :max-height="900"
  >
    <p>Большое окно с кастомными размерами</p>
  </BaseModal>
</template>
```

### С синим header (как ChangeClientTypeModal)

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Вибрати тип"
    storage-key="select-modal"
    header-class="bg-primary text-white"
    :default-width="400"
  >
    <div class="d-grid gap-2">
      <button class="btn btn-outline-secondary">Опція 1</button>
      <button class="btn btn-outline-secondary">Опція 2</button>
    </div>
  </BaseModal>
</template>
```

### Без backdrop close и без кнопки переключения режима

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Важливе повідомлення"
    storage-key="important-modal"
    :close-on-backdrop="false"
    :show-mode-switch="false"
  >
    <p>Це окно можна закрити только кнопкою ✕</p>
  </BaseModal>
</template>
```

## Props

| Prop | Type | Default | Описание |
|------|------|---------|----------|
| `visible` | Boolean | false | v-model видимости окна |
| `title` | String | '' | Заголовок окна (или используйте slot #title) |
| `storageKey` | String | **required** | Уникальный ключ для localStorage |
| `headerClass` | String | '' | Дополнительные классы для header (например 'bg-primary text-white') |
| `defaultWidth` | Number | 700 | Ширина для docked-right по умолчанию |
| `minWidth` | Number | 500 | Минимальная ширина |
| `maxWidth` | Number | 1200 | Максимальная ширина |
| `defaultHeight` | Number | 400 | Высота для docked-bottom по умолчанию |
| `minHeight` | Number | 300 | Минимальная высота |
| `maxHeight` | Number | 800 | Максимальная высота |
| `closeOnBackdrop` | Boolean | true | Закрывать ли по клику на backdrop |
| `showModeSwitch` | Boolean | true | Показывать ли кнопку переключения режимов |

## Slots

| Slot | Описание |
|------|----------|
| `title` | Кастомный заголовок (альтернатива prop title) |
| `default` | Основной контент |
| `footer` | Футер окна (опционально) |

## Events

| Event | Payload | Описание |
|-------|---------|----------|
| `update:visible` | Boolean | Изменение видимости (для v-model) |
| `close` | - | Закрытие окна |

## Автоматические функции

✅ **Drag & Drop** - перетаскивание в floating режиме  
✅ **Docked modes** - закрепление справа/снизу  
✅ **Resize** - изменение размера в docked режимах  
✅ **Auto-save** - сохранение режима и размеров в localStorage  
✅ **Content margin** - автоматическое сдвигание контента страницы  
✅ **Keyboard** - закрытие по ESC (добавьте сами если нужно)

## Миграция с старых модальных окон

### Было (старый способ):

```vue
<div v-if="isOpen" class="modal-backdrop-simple" @click.self="close">
  <div class="card shadow" style="width: 600px; margin: 100px auto">
    <div class="card-header">Заголовок</div>
    <div class="card-body">Контент</div>
    <div class="card-footer">
      <button @click="close">Закрыть</button>
    </div>
  </div>
</div>
```

### Стало (с BaseModal):

```vue
<BaseModal
  v-model:visible="isOpen"
  title="Заголовок"
  storage-key="my-modal"
  :default-width="600"
>
  Контент

  <template #footer>
    <button @click="isOpen = false">Закрыть</button>
  </template>
</BaseModal>
```

## Преимущества

- 🎯 **Единообразие** - все окна выглядят и работают одинаково
- 🔧 **Переиспользование** - один компонент для всех случаев
- 💾 **Персистентность** - настройки сохраняются автоматически
- 📱 **Гибкость** - три режима отображения
- ⚡ **Простота** - меньше кода, меньше багов
