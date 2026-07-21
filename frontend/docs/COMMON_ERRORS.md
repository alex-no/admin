# Типові помилки та їх вирішення

## ReferenceError: can't access lexical declaration before initialization

### Причина
У Vue 3 `<script setup>` код виконується синхронно зверху вниз. Якщо ви використовуєте змінну ДО її оголошення, виникає ця помилка.

### Типові випадки

#### 1. Watch використовує ref, який оголошений пізніше

❌ **Неправильно:**
```javascript
const { contentMargin } = useModalWindow()

watch([visible, contentMargin], () => {
  // використовуємо visible
})

const visible = ref(false) // ❌ оголошено ПІСЛЯ watch
```

✅ **Правильно:**
```javascript
const visible = ref(false) // ✅ оголошено ПЕРЕД використанням

const { contentMargin } = useModalWindow()

watch([visible, contentMargin], () => {
  // використовуємо visible
})
```

#### 2. Event listeners поза onMounted

❌ **Неправильно:**
```javascript
// Код виконується відразу при імпорті модуля
window.addEventListener('some-event', () => {
  someFunction() // ❌ функція ще не оголошена
})

function someFunction() {
  // ...
}

onMounted(() => load())
```

✅ **Правильно:**
```javascript
function someFunction() {
  // ✅ функція оголошена ПЕРЕД використанням
}

onMounted(() => {
  load()
  
  // Event listeners всередині onMounted
  window.addEventListener('some-event', () => {
    someFunction() // ✅ функція вже існує
  })
})
```

#### 3. Computed використовує інший computed

❌ **Неправильно:**
```javascript
const derivedValue = computed(() => baseValue.value * 2)

const baseValue = computed(() => someRef.value) // ❌ оголошено пізніше
```

✅ **Правильно:**
```javascript
const baseValue = computed(() => someRef.value) // ✅ спочатку базовий

const derivedValue = computed(() => baseValue.value * 2) // потім похідний
```

### Правило
**Завжди оголошуйте змінні, ref, computed ПЕРЕД їх використанням у watch, computed, event listeners.**

### Порядок оголошення (рекомендований)

```javascript
<script setup>
// 1. Імпорти
import { ref, computed, watch, onMounted } from 'vue'
import { useSomething } from './composables'

// 2. Props (якщо є)
const props = defineProps({ ... })

// 3. Emits (якщо є)
const emit = defineEmits(['update'])

// 4. Reactive state (refs)
const someRef = ref('')
const anotherRef = ref(0)

// 5. Композабли (які можуть залежати від refs)
const { something } = useSomething()

// 6. Computed (які залежать від refs та композаблів)
const computed1 = computed(() => someRef.value)
const computed2 = computed(() => computed1.value * 2)

// 7. Watchers (які використовують вищеоголошені змінні)
watch(someRef, () => { ... })

// 8. Функції
function doSomething() { ... }
function doAnother() { ... }

// 9. Lifecycle hooks
onMounted(() => {
  // Event listeners тут
  window.addEventListener(...)
})
</script>
```

## Інші типові помилки

### Помилка: "defineProps is not defined"

**Причина:** Забули додати `<script setup>`

✅ **Правильно:**
```vue
<script setup>
const props = defineProps({ ... })
</script>
```

### Помилка: "Cannot read property 'value' of undefined"

**Причина:** Забули `.value` при роботі з ref або навпаки додали `.value` до computed в template

❌ **Неправильно в JS:**
```javascript
const count = ref(0)
console.log(count) // ❌ це об'єкт, а не значення
```

✅ **Правильно в JS:**
```javascript
const count = ref(0)
console.log(count.value) // ✅
```

❌ **Неправильно в template:**
```vue
<template>
  {{ count.value }} <!-- ❌ в template не треба .value -->
</template>
```

✅ **Правильно в template:**
```vue
<template>
  {{ count }} <!-- ✅ Vue автоматично розгортає ref -->
</template>
```

### Помилка: "Unexpected end of JSON input"

**Причина:** Некоректна JSON відповідь від API або порожня відповідь

✅ **Правильно:**
```javascript
const res = await fetch('/api/endpoint')
if (!res.ok) throw new Error(`HTTP ${res.status}`)

const text = await res.text()
if (!text) throw new Error('Empty response')

const json = JSON.parse(text)
```

### Помилка: Build warnings про розмір chunk

**Причина:** Один chunk більше 500 KB

**Рішення:** Використовувати code splitting (lazy loading)

```javascript
// Замість
import HeavyComponent from './HeavyComponent.vue'

// Використовуйте
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
)
```

### Помилка: HTTP 400 "private range" при геолокації IP

**Причина:** API не може визначити геолокацію для приватних IP адрес (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x)

**Рішення:** Обробити помилку та показати інформаційне повідомлення

✅ **Правильно:**
```javascript
async function loadIpInfo(ip) {
  loadingIpInfo.value = true
  ipInfo.value = null
  try {
    const res = await fetch(`/api/admin/network-tools/ip-info/${ip}`)
    const json = await res.json()
    if (json.status === 'success') {
      ipInfo.value = json.data
    } else {
      // Обробка помилки для приватних IP
      ipInfo.value = {
        error: true,
        message: json.message === 'private range'
          ? 'Приватний IP (локальна мережа)'
          : json.message
      }
    }
  } catch (e) {
    ipInfo.value = { error: true, message: e.message }
  } finally {
    loadingIpInfo.value = false
  }
}
```

В template:
```vue
<div v-if="ipInfo?.error" class="alert alert-info">
  <i class="bi bi-info-circle"></i> {{ ipInfo.message }}
</div>
```

## Дебаг порад

### 1. Перевірити порядок оголошення
Якщо бачите помилку "before initialization":
- Знайдіть змінну в помилці (часто мінімізована як `D`, `v`, `x`)
- Шукайте у вихідному коді де ця змінна використовується
- Переконайтесь що вона оголошена ПЕРЕД використанням

### 2. Використовувати dev build для дебагу
```bash
npm run dev
```
Dev build показує читабельні імена змінних, не мінімізовані.

### 3. Перевірити console.log
Додайте логування для перевірки порядку виконання:
```javascript
console.log('1. Before composable')
const { something } = useComposable()
console.log('2. After composable')

watch(something, () => {
  console.log('3. Watch triggered')
})
```

### 4. Очистити кеш браузера
Іноді стара версія JS залишається в кеші:
- Ctrl+Shift+R (hard refresh)
- Або очистити кеш в DevTools
