# Задача 07: skeleton замість спінера (react-admin v5 list loading)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `TableSkeleton.vue` / `TableSkeleton.tsx` + перебудова гілок
> `loading`/`error` у `DataListPage.vue:71-76` і `DataTable.tsx:262-274`.
>
> **Уже правильно:** SWR-кеш (`useListCache`) у фреймворку є в обох мовах, тому
> «розкатати кеш на решту сторінок» із тексту нижче не потрібно — воно вже так.
> Skeleton показується лише при **холодному** старті (`loading && !cached`); при
> ревалідації працює наявний дрібний спінер біля «Всього» — його не чіпати.
>
> **Кількість рядів skeleton** брати з `perPage`, обмеживши: `Math.min(perPage, 10)`.
> Малювати `<tbody>`, а не `<div>` — інакше поїде ширина колонок.
>
> **Залежність від 01:** skeleton мусить малювати стільки колонок, скільки видимо
> (`visibleColumns.length`), інакше при прихованих колонках стовпці стрибнуть у
> момент завантаження.
>
> **React-нюанс:** зараз `error` рендериться як `{error && !loading && ...}` після
> блоку `loading` — при переході «є кеш → помилка» на екрані одночасно кеш і
> алерт. Перевірити, що skeleton не додає третій стан у ту саму гілку.
>
> **Не застосовується:** «розкатати `useListCache` на решту сторінок», перелік
> сторінок без кешу.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Зараз на всіх 26 списковых сторінках однаковий патерн завантаження:

```html
<div v-if="loading" class="text-center py-5">
  <div class="spinner-border text-primary" role="status"></div>
</div>
<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
<div v-else>
  <!-- таблиця -->
</div>
```

Проблема — не в спінері, а в тому, що таблиці **немає в DOM** під час
завантаження. Тому кожен `load()` дає layout shift: висота контенту стрибає з
~80px (спінер) до висоти таблиці на 50 рядків і назад. При зміні фільтра або
сторінки це помітний «стрибок» — тим сильніший, чим більший `per_page`
(доступно до 250, див. `PER_PAGE_OPTIONS` у `Users.vue:722`).

react-admin у v5 показує skeleton-рядки з тією самою структурою колонок, тому
геометрія сторінки під час завантаження не змінюється.

У нас уже є частина рішення: `useListCache` (SWR) — якщо сторінка в кеші,
`loading` не піднімається взагалі, показуються старі дані + маленький
`revalidating`-спіннер біля «Всього: N» (`Users.vue:136-141`). Але це працює лише
на 6 сторінках із 26, і тільки для **повторних** відкриттів.

## Промпт для Claude Code

> Заміни повноекранний спінер на skeleton-рядки таблиці на списковых сторінках
> адмінки.
>
> 1. **Новий компонент `www_front/admin/src/components/TableSkeleton.vue`** з
>    пропами:
>    - `rows: Number` — скільки рядків малювати (дефолт 10)
>    - `columns: Array` — дескриптори `[{ width?, align? }]`, щоб ширини
>      скелета збігалися з реальною таблицею
>    - `hasCheckbox: Boolean`
>
>    Малює `<tbody>` з `rows` рядків, у кожній клітинці — сірий прямокутник з
>    `@keyframes` пульсацією (CSS, без залежностей).
>
> 2. **Skeleton рендериться всередині тієї самої `<table>`**, а не замість неї.
>    Тобто `<thead>` з реальними колонками залишається на місці, а `<tbody>`
>    підмінюється. Це і є суть фічі — інакше layout shift залишиться.
>
> 3. **`rows` = `perPage`, обмежене розумним максимумом** (напр.
>    `Math.min(perPage, 15)`) — малювати 250 skeleton-рядків безглуздо й дорого.
>
> 4. **Не ламати SWR-поведінку.** На 6 сторінках із `useListCache` при попаданні
>    в кеш `loading` не піднімається (`Users.vue:927-937`) — skeleton там не
>    мусить з'являтись, показуються старі дані. Skeleton — тільки для
>    `loading === true`.
>
> 5. **Розкатай `useListCache` на решту списковых сторінок** — зараз він є лише
>    на `Analytics.vue`, `AnalyticsBannedIps.vue`, `News.vue`, `Reviews.vue`,
>    `StoList.vue`, `Users.vue`, `geography/Cities.vue`. Це найдешевший спосіб
>    зробити так, щоб skeleton показувався рідко: composable уже написаний,
>    підключення — це `cacheGet`/`cacheSet` навколо наявного `load()` плюс
>    `revalidating`-індикатор.
>
> 6. **Розкатай skeleton на всі 26 списковых сторінок** (перелік у `README.md`).
>
> **Не робити:** skeleton для модалок і їх вкладок, skeleton для дашборд-віджетів
> і графіків, зміну самої логіки `useListCache`, progress bar угорі сторінки.

## Що перевірити після виконання

- [ ] `TableSkeleton.vue` створений; пульсація на CSS `@keyframes`, без нових npm-залежностей
- [ ] `<thead>` під час завантаження **залишається** — заголовки колонок видно завжди
- [ ] **Layout shift зникнув**: змінити фільтр на сторінці з `per_page=50` — висота контенту не стрибає; перевірити в DevTools (Performance → Layout Shift) або хоча б візуально по позиції пагінації внизу
- [ ] Ширини skeleton-клітинок відповідають реальним колонкам (взяти `width` із дескрипторів колонок / `cfg.table[].width`)
- [ ] Колонка чекбоксів bulk-виділення в skeleton є там, де вона є в реальній таблиці, і немає там, де немає
- [ ] Кількість skeleton-рядків = `min(perPage, 15)`, а не фіксовані 10 при `per_page=5` (тоді має бути 5)
- [ ] **SWR не зламаний**: на `Users.vue` перейти на сторінку 2, потім назад на 1 — skeleton **не** показується, показуються кешовані дані + маленький `revalidating`-спіннер біля «Всього»
- [ ] Перший вхід на сторінку (кеш порожній) → skeleton
- [ ] `error` як і раніше показується замість таблиці (`alert alert-danger`), skeleton при помилці не залишається
- [ ] Порожній результат після завантаження показує empty state із задачі **02**, а не skeleton
- [ ] `useListCache` підключений на решті списковых сторінок; повторний перехід на будь-яку з них не робить видимого завантаження
- [ ] Skeleton сумісний із прихованими колонками (задача **01**) — малюються лише видимі
- [ ] Немає console errors; немає «мигання» skeleton при швидких послідовних `load()`

---

## Технічні деталі для імплементації

### 1. `TableSkeleton.vue`

```html
<template>
  <tbody>
    <tr v-for="r in rows" :key="r">
      <td v-if="hasCheckbox" style="width:36px"><span class="sk" style="width:1rem"></span></td>
      <td v-for="(col, i) in columns" :key="i"
          :style="col.width ? `width:${col.width}px` : ''"
          :class="col.align === 'end' ? 'text-end' : ''">
        <span class="sk" :style="{ width: col.skeletonWidth ?? '80%' }"></span>
      </td>
    </tr>
  </tbody>
</template>

<script setup>
defineProps({
  rows:        { type: Number, default: 10 },
  columns:     { type: Array,  required: true },
  hasCheckbox: { type: Boolean, default: false },
})
</script>

<style scoped>
.sk {
  display: inline-block;
  height: .85rem;
  border-radius: .2rem;
  background: #e9ecef;
  animation: sk-pulse 1.2s ease-in-out infinite;
}
@keyframes sk-pulse {
  0%, 100% { opacity: 1;  }
  50%      { opacity: .45; }
}
@media (prefers-reduced-motion: reduce) {
  .sk { animation: none; }
}
</style>
```

⚠️ `@media (prefers-reduced-motion)` — не косметика: пульсуючі блоки на весь
екран це саме той випадок, для якого цей media query існує.

⚠️ Компонент віддає **`<tbody>`**, не `<div>`. HTML не дозволяє довільні
елементи між `<table>` і `<tr>`, а Vue-компонент, що рендерить `<tbody>`,
браузер приймає нормально.

### 2. Перебудова блоку в сторінці

Було (`pages/Users.vue:78-131`):

```html
<div v-if="loading" class="text-center py-5">
  <div class="spinner-border text-primary" role="status"></div>
</div>
<div v-else-if="error" class="alert alert-danger">{{ error }}</div>
<div v-else>
  <div class="card shadow-sm">
    <div class="table-responsive">
      <table>...</table>
    </div>
  </div>
  <!-- пагінація -->
</div>
```

Стало:

```html
<div v-if="error" class="alert alert-danger">{{ error }}</div>
<div v-else>
  <div class="card shadow-sm">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 small">
        <thead class="table-light">
          <!-- реальні заголовки, як зараз -->
        </thead>

        <TableSkeleton v-if="loading"
                       :rows="skeletonRows"
                       :columns="skeletonColumns"
                       :has-checkbox="bulkActionsAvailable.length > 0" />

        <tbody v-else>
          <!-- реальні рядки + empty state із задачі 02 -->
        </tbody>
      </table>
    </div>
  </div>
  <!-- пагінація — тепер завжди в DOM -->
</div>
```

```js
const skeletonRows = computed(() => Math.min(perPage.value, 15))
const skeletonColumns = computed(() => visibleColumns.value.map((c) => ({ width: c.width, align: c.align })))
```

⚠️ Порядок гілок змінився: `error` тепер перший, `loading` перевіряється вже
всередині таблиці. Так пагінація і тулбар фільтрів не зникають при завантаженні —
це половина ефекту від задачі.

⚠️ Сортувальні `<th>` під час `loading` залишаються клікабельними. Це прийнятно
(клік просто поставить у чергу ще один `load()`), але якщо на сторінці немає
захисту від паралельних `load()` — краще додати `:class="{ 'pe-none': loading }"`
на `<thead>`.

### 3. Розкатка `useListCache` (пункт 5)

Референс — `pages/Users.vue:916-940`. Патерн:

```js
const { get: cacheGet, set: cacheSet } = useListCache()
const revalidating = ref(false)

async function load(p = 1) {
  page.value  = p
  error.value = null

  const params   = buildListParams(p)
  const cacheKey = `${cfg.apiList}?${params}`

  const cached = cacheGet(cacheKey)
  if (cached) {
    items.value = cached.items
    total.value = cached.total
    totalPages.value = cached.totalPages
    loading.value = false
    revalidating.value = true
  } else {
    loading.value = true
    revalidating.value = false
  }

  try {
    // ... fetch, потім cacheSet(cacheKey, { items, total, totalPages })
  } finally {
    loading.value = false
    revalidating.value = false
  }
}
```

Плюс індикатор біля «Всього» (`Users.vue:136-141`):

```html
<span v-if="revalidating" class="spinner-border spinner-border-sm ms-1"
      style="width:.7rem;height:.7rem" title="Оновлення..."></span>
```

⚠️ **Умова коректності кешу:** `cacheKey` мусить включати **всі** параметри, що
впливають на результат. `buildListParams()` на кожній сторінці свій — перевірити,
що жоден фільтр не забутий, інакше адмін побачить дані іншого фільтра. Це
головний ризик цього пункту, і його треба перевіряти по кожній сторінці окремо, а
не «за аналогією».

⚠️ Кеш module-scope і без TTL (`useListCache.js` — комент про це прямо там).
Тобто після `create`/`update`/`delete` дані в кеші стають стейлими для інших
сторінок. На 6 сторінках, де кеш уже підключений, це вже так — не регресія, але
при розкатці на решту не робити гірше: після мутації сторінка мусить робити
`load()` без кешу або записувати свіжий результат у кеш.

### 4. Порядок виконання відносно інших задач

- Задача **02** (empty state) теж переписує блок `v-if="loading"` / `v-else`.
  Виконувати в будь-якому порядку, але другий по черзі мусить не відкотити
  першого.
- Задача **01** (селектор колонок) дає `visibleColumns` — skeleton має малювати
  лише видимі колонки. Якщо 01 ще не зроблена, брати `cfg.table` / локальний
  дескриптор.
- Задача **06** (expand) додає колонку зі стрілкою — skeleton мусить її
  враховувати так само, як чекбокс.

### 5. Scope & Non-Goals

**В scope:** новий компонент, перебудова loading-гілки на 26 сторінках,
розкатка `useListCache` на сторінки, де його немає.

**Поза scope:**
- skeleton у модалках і на їх вкладках (`Users.vue` таби «Авто», «Доступ до
  СТО», «Робота в СТО» — там спінери залишаються)
- skeleton для `Dashboard.vue`, `SystemHealthWidget.vue`, графіків
  (`BarChart`, `PieChart`, `TrendChart`, `HourlyChart`)
- зміна логіки `useListCache` (TTL, LRU, інвалідація) — окрема задача
- top progress bar

---

## FAQ

**Q: Чи не буде skeleton гірше за спінер при швидкому бекенді?**
A На локалці — можливо (мигання). Саме тому пункт 5 (розкатка `useListCache`)
частина цієї задачі: із SWR skeleton показується лише при **першому** відкритті
сторінки, далі йдуть кешовані дані + тонкий `revalidating`-індикатор. Тобто
частота показу skeleton падає в разы.

**Q: Чому не зробити мінімальну тривалість показу skeleton, щоб не мигало?**
A Штучна затримка робить адмінку об'єктивно повільнішою заради суб'єктивної
плавності. Правильний фікс — рідше показувати (SWR), а не показувати довше.

**Q: `TableSkeleton` рендерить `<tbody>` — Vue не поскаржиться?**
A Ні. Проблема була б із in-DOM шаблонами (браузерний парсер викидає нестандартні
теги з `<table>`), але тут SFC компілюються Vite, розмітка не проходить через
HTML-парсер браузера.

**Q: Чи потрібен skeleton для `StoImport.vue`?**
A Ні, це не спискова сторінка (див. `README.md`), там свій прогрес імпорту.
