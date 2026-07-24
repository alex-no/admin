# BaseModal - Універсальне модальне вікно

## Використання

### Простий приклад

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Моє вікно"
    storage-key="my-modal"
  >
    <p>Контент модального вікна</p>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'

const isOpen = ref(false)
</script>
```

### З кастомним заголовком

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

    <p>Контент модального вікна</p>
  </BaseModal>
</template>
```

### З футером

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

### З кастомними розмірами

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
    <p>Велике вікно з кастомними розмірами</p>
  </BaseModal>
</template>
```

### З синім header (як ChangeClientTypeModal)

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

### Без backdrop close і без кнопки перемикання режиму

```vue
<template>
  <BaseModal
    v-model:visible="isOpen"
    title="Важливе повідомлення"
    storage-key="important-modal"
    :close-on-backdrop="false"
    :show-mode-switch="false"
  >
    <p>Це вікно можна закрити тільки кнопкою ✕</p>
  </BaseModal>
</template>
```

## Props

| Prop | Type | Default | Опис |
|------|------|---------|------|
| `visible` | Boolean | false | v-model видимості вікна |
| `title` | String | '' | Заголовок вікна (або використовуйте slot #title) |
| `storageKey` | String | **required** | Унікальний ключ для localStorage |
| `headerClass` | String | '' | Додаткові класи для header (наприклад 'bg-primary text-white') |
| `defaultWidth` | Number | 700 | Ширина для docked-right за замовчуванням |
| `minWidth` | Number | 500 | Мінімальна ширина |
| `maxWidth` | Number | 1200 | Максимальна ширина |
| `defaultHeight` | Number | 400 | Висота для docked-bottom за замовчуванням |
| `minHeight` | Number | 300 | Мінімальна висота |
| `maxHeight` | Number | 800 | Максимальна висота |
| `closeOnBackdrop` | Boolean | true | Чи закривати по кліку на backdrop |
| `showModeSwitch` | Boolean | true | Чи показувати кнопку перемикання режимів |
| `mode` | String | 'floating' | Початковий режим, поки для storageKey ще немає збереженого в localStorage вибору користувача (`'floating'` \| `'docked-right'` \| `'docked-bottom'`) |

## Slots

| Slot | Опис |
|------|------|
| `title` | Кастомний заголовок (альтернатива prop title) |
| `subheader` | Опціональний блок між заголовком і тілом (наприклад, панель вкладок) — рендериться лише якщо переданий контент |
| `default` | Основний контент |
| `footer` | Футер вікна (опціонально) |

## Events

| Event | Payload | Опис |
|-------|---------|------|
| `update:visible` | Boolean | Зміна видимості (для v-model) |
| `close` | - | Закриття вікна |

## Автоматичні функції

✅ **Drag & Drop** - перетягування у floating режимі  
✅ **Docked modes** - закріплення справа/знизу  
✅ **Resize** - зміна розміру в docked режимах (і за кут — у floating)  
✅ **Auto-save** - збереження режиму і розмірів у localStorage  
✅ **Content margin** - автоматичне зсування контенту сторінки  
✅ **Keyboard** - закриття по ESC працює з коробки (той самий handleClose(), що й у ✕/backdrop — тому на сторінках з підтвердженням незбережених змін ESC теж коректно проходить через їхній watch(visible) і може бути скасований)

## Міграція зі старих модальних вікон

### Було (старий спосіб):

```vue
<div v-if="isOpen" class="modal-backdrop-simple" @click.self="close">
  <div class="card shadow" style="width: 600px; margin: 100px auto">
    <div class="card-header">Заголовок</div>
    <div class="card-body">Контент</div>
    <div class="card-footer">
      <button @click="close">Закрити</button>
    </div>
  </div>
</div>
```

### Стало (з BaseModal):

```vue
<BaseModal
  v-model:visible="isOpen"
  title="Заголовок"
  storage-key="my-modal"
  :default-width="600"
>
  Контент

  <template #footer>
    <button @click="isOpen = false">Закрити</button>
  </template>
</BaseModal>
```

## Переваги

- 🎯 **Однорідність** - усі вікна виглядають і працюють однаково
- 🔧 **Перевикористання** - один компонент для всіх випадків
- 💾 **Персистентність** - налаштування зберігаються автоматично
- 📱 **Гнучкість** - три режими відображення
- ⚡ **Простота** - менше коду, менше багів
