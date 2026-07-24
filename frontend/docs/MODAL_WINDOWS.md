# Система модальних вікон з розширеними можливостями

## Огляд

Універсальна система модальних вікон підтримує три режими відображення:
- **Floating** - класичне спливаюче вікно з можливістю перетягування
- **Docked Right** - закріплене вікно справа (сдвигає контент сторінки)
- **Docked Bottom** - закріплене вікно знизу (сдвигає контент сторінки)

## Можливості

### 1. Плаваюче вікно (Floating)
- Вікно відображається по центру екрана поверх контента
- Можна перетягнути за заголовок в будь-яке місце
- Backdrop (затемнений фон) закриває вікно при кліку
- Курсор змінюється на "grab" (рука) при наведенні на заголовок

### 2. Закріплене вікно справа (Docked Right)
- Вікно фіксується справа від екрану
- **Контент сторінки зсувається вліво** (не перекривається!)
- Можна змінювати ширину, перетягуючи ліву межу
- Мінімальна ширина: 500px, максимальна: 1200px
- Курсор `↔` на лівій межі

### 3. Закріплене вікно знизу (Docked Bottom)
- Вікно фіксується знизу екрану
- **Контент сторінки зсувається вгору** (не перекривається!)
- Можна змінювати висоту, перетягуючи верхню межу
- Мінімальна висота: 300px, максимальна: 800px
- Курсор `↕` на верхній межі

### 4. Перемикання режимів
Кнопка в заголовку вікна перемикає режими по колу:
- **Floating → Docked Right → Docked Bottom → Floating**

Іконки:
- `bi-layout-sidebar-reverse` - перехід до Docked Right
- `bi-window-dock` - перехід до Docked Bottom
- `bi-window` - перехід до Floating

### 5. Автозбереження налаштувань
Система автоматично зберігає в `localStorage`:
- Поточний режим (floating / docked-right / docked-bottom)
- Ширину для Docked Right
- Висоту для Docked Bottom
- При наступному відкритті вікно відкриється в останньому режимі з останніми розмірами

## Використання в коді

### 1. Композабл useModalWindow

```javascript
import { useModalWindow } from '@/composables/useModalWindow'

const {
  mode,                 // ref<'floating' | 'docked-right' | 'docked-bottom'>
  floatingStyle,        // computed - стилі для floating
  dockedRightStyle,     // computed - стилі для docked-right
  dockedBottomStyle,    // computed - стилі для docked-bottom
  contentMargin,        // computed - відступи для контента сторінки
  cursorClass,          // computed - клас курсора
  isDragging,           // ref<boolean>
  isResizing,           // ref<boolean>
  isDraggable,          // computed<boolean> - чи можна перетягувати
  startDrag,            // function(event, elementRef)
  startResize,          // function(event)
  cycleMode,            // function() - перемикання режимів по колу
  setMode,              // function(mode) - встановити конкретний режим
} = useModalWindow({
  storageKey: 'my-modal-settings',   // унікальний ключ для localStorage
  mode: 'floating',                   // початковий режим
  defaultWidth: 700,                  // ширина docked-right за замовчуванням
  minWidth: 500,                      // мінімальна ширина
  maxWidth: 1200,                     // максимальна ширина
  defaultHeight: 400,                 // висота docked-bottom за замовчуванням
  minHeight: 300,                     // мінімальна висота
  maxHeight: 800,                     // максимальна висота
})
```

### 2. Композабл usePageLayout (для сторінки)

```javascript
import { usePageLayout } from '@/composables/usePageLayout'

const { contentMargin } = usePageLayout()
```

В шаблоні сторінки:
```vue
<template>
  <div :style="contentMargin" style="transition: margin 0.2s ease-out">
    <!-- Контент сторінки -->
  </div>
</template>
```

### 3. Структура модального компонента

```vue
<template>
  <Teleport to="body">
    <!-- Backdrop тільки для floating -->
    <div
      v-if="visible && mode === 'floating'"
      class="modal-backdrop-simple"
      @click="close"
    ></div>

    <!-- Модальне вікно -->
    <div
      v-if="visible"
      ref="modalRef"
      class="modal-window"
      :class="[`modal-window--${mode}`, cursorClass]"
      :style="mode === 'floating' ? floatingStyle : 
              mode === 'docked-right' ? dockedRightStyle : 
              dockedBottomStyle"
    >
      <!-- Resize handle для docked-right -->
      <div
        v-if="mode === 'docked-right'"
        class="resize-handle resize-handle--left"
        @mousedown="startResize"
      ></div>

      <!-- Resize handle для docked-bottom -->
      <div
        v-if="mode === 'docked-bottom'"
        class="resize-handle resize-handle--top"
        @mousedown="startResize"
      ></div>

      <div class="card shadow h-100">
        <div
          class="card-header"
          :class="isDraggable ? 'cursor-grab' : ''"
          @mousedown="isDraggable ? startDrag($event, modalRef) : null"
        >
          <h5>Заголовок</h5>
          <button @click="cycleMode">
            <i :class="getModeIcon()"></i>
          </button>
          <button @click="close">✕</button>
        </div>

        <div class="card-body">
          <!-- Контент -->
        </div>

        <div class="card-footer">
          <button @click="close">Закрити</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useModalWindow } from '@/composables/useModalWindow'

const visible = ref(false)

const {
  mode,
  floatingStyle,
  dockedRightStyle,
  dockedBottomStyle,
  contentMargin,
  cursorClass,
  isDraggable,
  startDrag,
  startResize,
  cycleMode,
} = useModalWindow({
  storageKey: 'my-modal',
  mode: 'floating',
  defaultWidth: 700,
  minWidth: 500,
  maxWidth: 1200,
  defaultHeight: 400,
  minHeight: 300,
  maxHeight: 800,
})

// Відправляємо подію про зміну margin
watch([visible, contentMargin], () => {
  window.dispatchEvent(
    new CustomEvent('modal-content-margin-change', {
      detail: visible.value ? contentMargin.value : {},
    })
  )
}, { deep: true })

function getModeIcon() {
  if (mode.value === 'floating') return 'bi bi-layout-sidebar-reverse'
  if (mode.value === 'docked-right') return 'bi bi-window-dock'
  return 'bi bi-window'
}
</script>
```

### 4. Необхідні стилі

```css
/* Backdrop */
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1049;
}

/* Базові стилі */
.modal-window {
  position: fixed;
  z-index: 1050;
}

/* Floating */
.modal-window--floating {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 1100px;
  max-height: 88vh;
  width: 90vw;
}

/* Docked right */
.modal-window--docked-right {
  top: 0;
  right: 0;
  bottom: 0;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

/* Docked bottom */
.modal-window--docked-bottom {
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

/* Resize handles */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle--left {
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle--top {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle:hover {
  background: rgba(13, 110, 253, 0.3);
}

/* Курсори */
.cursor-grab {
  cursor: grab;
  user-select: none;
}

.cursor-grabbing,
.cursor-grabbing * {
  cursor: grabbing !important;
  user-select: none;
}

.cursor-resizing-x,
.cursor-resizing-x * {
  cursor: ew-resize !important;
  user-select: none;
}

.cursor-resizing-y,
.cursor-resizing-y * {
  cursor: ns-resize !important;
  user-select: none;
}
```

## Приклади

### Повний приклад
- [AnalyticsDetailsModal.vue](src/components/AnalyticsDetailsModal.vue) - компонент модального вікна
- [Analytics.vue](src/pages/Analytics.vue) - сторінка з підтримкою docked вікон
- [useModalWindow.js](src/composables/useModalWindow.js) - композабл для модальних вікон
- [usePageLayout.js](src/composables/usePageLayout.js) - композабл для сторінки

## Переваги нової системи

1. **Гнучкість** - три режими роботи на вибір
2. **Зручність** - можна працювати з таблицею та деталями одночасно
3. **Інтуїтивність** - перетягування та зміна розміру працюють природньо
4. **Збереження стану** - налаштування зберігаються між сесіями
5. **Універсальність** - легко інтегрувати в будь-який компонент
6. **Правильний Layout** - docked вікна НЕ перекривають контент, а зсувають його

## Технічні особливості

- Vue 3 Composition API
- Всі DOM маніпуляції через refs
- Event listeners автоматично додаються/видаляються
- Міжкомпонентна комунікація через CustomEvent
- Плавні CSS transitions (0.2s ease-out)
- Підтримка keyboard shortcuts (закриття по ESC вбудоване в `BaseModal.vue` — окремо додавати не потрібно)

## Різниця з попередньою версією

### Було (side-panel)
- ❌ Тільки справа
- ❌ Перекриває контент
- ❌ Не зрозуміло як відкріпити

### Стало (docked)
- ✅ Справа АБО знизу
- ✅ Зсуває контент (не перекриває!)
- ✅ Зрозумілий цикл перемикання режимів
- ✅ Floating режим працює як звичайне модальне вікно
