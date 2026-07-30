# Задача 01: селектор колонок (react-admin `<SelectColumnsButton>`)

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) · **Статус:** [STATUS.md](STATUS.md)

> ## 🔧 Адаптація для `admin`
>
> Текст нижче написаний під `allsto` (26 списковых сторінок, `*.config.json`,
> `FieldConfigReader`, `sync-configs.js`). У `admin` задача **набагато менша**.
>
> **Куди:** два файли ядра, більше нікуди.
> - Vue — `frontend/src/list-framework/DataListPage.vue` (`<thead>` рядок 130,
>   `<tbody>` рядок 154, `colspan` рядок 179) + новий
>   `frontend/src/composables/useColumnPrefs.js` + новий
>   `frontend/src/components/ColumnSelector.vue`
> - React — `frontend-react/src/list-framework/components/DataTable.tsx`
>   (`<thead>` рядок 347, `<tbody>` рядок 373, `colSpan` рядок 397) + новий
>   `frontend-react/src/list-framework/hooks/useColumnPrefs.ts` + новий
>   `frontend-react/src/list-framework/components/ColumnSelector.tsx`
>
> **Прапорець `hideable`** додається в `ColumnConfig`
> (`frontend-react/src/list-framework/types.ts`) і в `*.columns.json` сторінок —
> один формат на дві мови.
>
> **Місце кнопки:** тулбар у фреймворку один і вже існує — той самий `d-flex`, де
> «Збережені фільтри» і CSV (`DataListPage.vue:44-53`, `DataTable.tsx:219-230`).
> Правило «якщо тулбару немає» з тексту нижче в `admin` не потрібне.
>
> **`colspan`:** у фреймворку він **уже** динамічний
> (`columnsConfig.length + 1 + (actions.length ? 1 : 0)`) — інвентар із 26
> сторінок нижче не застосовується, треба замінити `columnsConfig` на
> `visibleColumns` у трьох місцях на мову.
>
> **Не застосовується з тексту нижче:** розділ 4 (інвентар `colspan`), «6
> config-driven / 20 hand-written», `sync-configs.js`, `FieldConfigReader`,
> застереження про кілька `<table>` на сторінці, `defaultHidden` у конфігах.
>
> **Додається:** реалізувати **дзеркально в обох мовах** — однакова назва
> composable/hook, однаковий ключ localStorage `admin.columnPrefs:<apiList>`,
> однакова Bootstrap-розмітка дропдауна.
>
> **Рішення валідації (діють):** `defaultHidden` у v1 не використовується;
> реордер колонок виключений з v1, але поле `order` у localStorage присутнє.

> ✅ **Провалідовано 2026-07-30** (`validate-task-md`). Рішення, зафіксовані під
> час валідації, вбудовані в текст нижче:
> - **`defaultHidden` у першому заході не використовується.** Composable його
>   підтримує, але жодна колонка не отримує — після деплою таблиці виглядають
>   рівно як зараз, приховування завжди свідома дія адміна.
> - **Реордер колонок (↑/↓) виключений з v1.** Тільки показати/приховати,
>   однаково на всіх 26 сторінках. Формат запису в localStorage одразу містить
>   `order`, щоб реордер можна було додати без міграції збережених налаштувань.
> - **Здача двома хвилями:** (1) composable + компонент + 6 config-driven
>   сторінок → перевірка UX; (2) 20 hand-written сторінок → перевірка.

## Контекст

У react-admin є `<DatagridConfigurable>` + `<SelectColumnsButton>`: адмін сам
вирішує, які колонки бачити, і вибір запам'ятовується. У нас набір колонок
жорстко зафіксований у шаблоні або в `cfg.table[]`, однаковий для всіх адмінів.

Найболючіше це на `pages/StoList.vue` — там таблиця широка, у горизонтальний
скрол `.table-responsive` вилазить майже завжди, і адмін, який працює лише зі
статусами й містами, все одно тягне очима повний набір колонок.

Це найпомітніша прогалина відносно react-admin і при цьому дешева: у 6
config-driven сторінок набір колонок уже описаний даними (`cfg.table[]`), тобто
для них фіча зводиться до фільтрації одного `v-for`.

## Промпт для Claude Code

> Додай у адмінку селектор колонок для списковых таблиць — аналог
> `<SelectColumnsButton>` + `<DatagridConfigurable>` з react-admin.
>
> 1. **Новий composable `www_front/admin/src/composables/useColumnPrefs.js`** —
>    зберігає вибір колонок у `localStorage` під ключем
>    `admin.columnPrefs:<namespace>`, за тим самим патерном, що
>    `useSavedFilters.js` (namespace = унікальний ключ сторінки, напр. list-ендпоінт).
>    API рівно такий — інших методів у v1 немає:
>    `{ hidden, isVisible(key), toggle(key), reset(), hasHidden }`.
>    Ховати можна лише колонки з `hideable !== false`. У localStorage писати
>    об'єкт `{ hidden: [], order: [] }` — `order` у v1 **не використовується**, але
>    поле присутнє, щоб реордер додався пізніше без міграції збережених даних.
>
> 2. **Новий компонент `www_front/admin/src/components/ColumnSelector.vue`** —
>    кнопка-іконка (`bi-layout-three-columns`) з дропдауном: чекбокс на кожну
>    приховувану колонку + «Скинути». Список колонок приходить пропом
>    `columns: [{ key, label, hideable }]`. **Стрілок ↑/↓ і реордера в v1 немає.**
>    - **Дропдаун рукописний**, тим самим патерном, що вже в коді
>      (`Users.vue:414-416`): `<div v-if="open" class="dropdown-menu show">`, без
>      `data-bs-toggle` і без `new bootstrap.Dropdown()`. Bootstrap-бандл
>      підключений (`main.js:3`), але жоден дропдаун у адмінці ним не керується —
>      не заводити другий механізм.
>    - Закриття по кліку зовні — через `document` listener у `onMounted` /
>      `onUnmounted` (окремої утиліти click-outside у проєкті немає, робити
>      всередині компонента).
>    - Клас `dropdown-menu-end` + `max-height: 320px; overflow-y: auto`.
>      Обов'язково: сторінка живе всередині `ListPageWrapper`, а це скрол-контейнер
>      з `overflow-x: hidden` (`ListPageWrapper.vue:20-27`) — меню, вирівняне по
>      лівому краю кнопки, обріжеться у правого краю вікна.
>
> 3. **Розміщення кнопки.** Тулбар із «Збереженими фільтрами» і CSV є лише на
>    частині сторінок (savedFilters — 5, CSV — 7 із 26, див. матрицю в
>    `README.md`). Правило:
>    - якщо такий тулбар є — кнопка в тому ж `d-flex gap-2`, останньою, стиль
>      `btn btn-sm btn-outline-secondary` як у сусідів (`Users.vue:51-60`);
>    - якщо тулбару немає — у той самий `d-flex`, де стоїть `<h5>` заголовка
>      сторінки, праворуч. **Не** створювати новий рядок тулбару заради однієї
>      кнопки.
>
> 4. **Розкатай двома хвилями** (перелік сторінок у `README.md`):
>    - **Хвиля 1 — 6 config-driven сторінок.** Додай у `*.config.json` до
>      елементів `table[]` поле `"hideable": true|false`
>      (`"defaultHidden"` composable підтримує, але **в конфіги не додавати** —
>      див. рішення валідації), а в шаблоні заміни `v-for="col in cfg.table"` на
>      `v-for="col in visibleColumns"`. Після цієї хвилі — показати результат і
>      отримати підтвердження UX.
>    - **Хвиля 2 — 20 сторінок із хардкодною таблицею.** Оголоси в `<script setup>`
>      локальний масив-дескриптор колонок (key + label + hideable) і обгорни
>      кожен `<th>`/`<td>` у `v-if="isVisible('...')"`.
>
> 5. **Тільки таблиця списку.** На частині сторінок `<table>` не один:
>    `Users.vue` — 5, `StoList.vue` — 4, `StoOutreach.vue` і
>    `geography/CityTmpReview.vue` — по 2. Решта — таблиці всередині модалок і
>    вкладок (авто користувача, керовані СТО, послуги СТО тощо). `isVisible()`
>    застосовувати **виключно** до першої, списковой таблиці; модалок не чіпати.
>
> 6. **Колонки, які заборонено ховати** (`hideable: false`): чекбокс bulk-виділення,
>    `id`, і остання колонка з кнопками дій. Їх селектор навіть не показує.
>
> 7. **Експорт CSV не зачіпати** — `EXPORT_COLUMNS` живе окремо і має й далі
>    вигружати повний набір полів незалежно від того, що адмін приховав у UI.
>
> **Не робити:** реордер колонок у будь-якому вигляді (ні drag&drop, ні стрілки),
> `defaultHidden` у конфігах, збереження вибору на бекенді (localStorage
> достатньо), пресети наборів колонок, керування дропдауном через Bootstrap JS.

## Що перевірити після виконання

### Хвиля 1 (composable + компонент + 6 config-driven)

- [ ] `useColumnPrefs.js` створений, читає/пише `localStorage` ключ `admin.columnPrefs:<namespace>`, витримує зіпсований JSON (як `useSavedFilters.js` — `try/catch` → дефолт)
- [ ] У localStorage лежить `{ "hidden": [...], "order": [] }` — поле `order` присутнє навіть у v1
- [ ] `ColumnSelector.vue` створений; дропдаун рукописний (`v-if` + `.dropdown-menu.show`), **без** `data-bs-toggle` і без `new bootstrap.Dropdown()`
- [ ] Дропдаун закривається кліком зовні, listener знімається в `onUnmounted` (перевірити: відкрити селектор, піти на іншу сторінку — у консолі жодних помилок, listener не тече)
- [ ] Меню **не обрізається** правим краєм: перевірити на найширшій таблиці (`Analytics.vue`, 14 колонок) при вузькому вікні — `ListPageWrapper` має `overflow-x: hidden`
- [ ] Кнопка стоїть за правилом розміщення з п.3: на сторінках із тулбаром — поруч із CSV; на сторінках без тулбару — у рядку заголовка. Новий рядок тулбару ніде не з'явився
- [ ] Приховування колонки прибирає **і `<th>`, і всі `<td>`** — таблиця не «зʼїжджає»
- [ ] `colspan` порожнього рядка пересчитується — перевірити на `Cities.vue` (заглушка «Немає даних» при пустому фільтрі) і на сторінці з bulk-чекбоксом
- [ ] Вибір зберігається після F5 і після переходу на іншу сторінку й назад
- [ ] Вибір на різних сторінках незалежний (namespace різний) — приховати колонку в `Cities.vue` не має впливати на `Countries.vue`
- [ ] `Areas.vue` і `Districts.vue` (спільний `AreaRegionList.vue`) мають **незалежний** вибір колонок
- [ ] «Скинути» повертає повний набір колонок
- [ ] Колонки з `hideable: false` (чекбокс, `id`, кнопки дій, `name_uk`, `is_active`) у дропдауні відсутні і сховати їх неможливо
- [ ] Мульти-сорт не зламався: якщо приховати колонку, по якій іде сортування, сортування залишається активним (у URL `sort=` не змінюється), а `SortIcon` просто не видно
- [ ] Inline-редагування (`Cities.vue`, `Countries.vue`, `CityTypes.vue`, `VehicleTypes.vue`, `ServiceGroups.vue`, `AreaRegionList.vue`) працює після приховування сусідніх колонок
- [ ] Усі 6 config-driven сторінок отримали `hideable` у `table[]` своїх `*.config.json`
- [ ] **`defaultHidden` у конфігах відсутній** — після деплою жодна колонка не зникла сама
- [ ] `npm run build:admin` виконаний, `www_app/config/*.config.json` синхронні з фронтендними. ⚠️ Це гігієна, а не умова працездатності: `FieldConfigReader` читає з конфіга **тільки `fields`** (`FieldConfigReader.php:19`), секцію `table[]` бекенд не читає взагалі — фіча працює й без синку, але розсинхронені копії конфігів згодом дадуть плутанину
- [ ] Немає console errors на жодній із 6 сторінок

### Хвиля 2 (20 hand-written сторінок)

- [ ] Усі 20 сторінок отримали дескриптор колонок і `v-if="isVisible(...)"`
- [ ] `EXPORT_COLUMNS` і дескриптор колонок — **різні** масиви; CSV-експорт вигружає повний набір навіть коли частина колонок прихована в UI
- [ ] Таблиці в модалках і вкладках **не** зачеплені: `Users.vue` (5 `<table>`), `StoList.vue` (4), `StoOutreach.vue` (2), `geography/CityTmpReview.vue` (2) — селектор впливає лише на таблицю списку
- [ ] `colspan` виправлений на всіх сторінках з інвентарю (розділ 4 нижче), включно з **другим** `colspan` у `StoOutreach.vue:87` (розкривна строка деталей, не заглушка)
- [ ] На сторінках без рядка-заглушки (`PermissionList.vue`, `RoleManagement.vue`, `AdminManagement.vue`, `AnalyticsBannedIps.vue`) нічого не додано — правити там нічого
- [ ] `StoList.vue`: колонки з інтерактивом у клітинці (inline-назва, `select` типу СТО, inline-рейтинг, toggle статусу) приховуються і показуються без помилок
- [ ] Права не обійдені: приховати/показати колонку не відкриває контрол, до якого немає `can(...)` — перевірити акаунтом без `sto.edit`
- [ ] Немає console errors на жодній із 26 сторінок

---

## Технічні деталі для імплементації

### 1. `useColumnPrefs.js`

Наслідувати структуру `composables/useSavedFilters.js` (той самий підхід:
`storageKey(namespace)` → `readAll` → `writeAll`, `ref` як єдине джерело правди).

```js
import { ref, computed } from 'vue'

function storageKey(namespace) {
  return `admin.columnPrefs:${namespace}`
}

function read(namespace) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(namespace)))
    return parsed && typeof parsed === 'object' ? parsed : { hidden: [], order: [] }
  } catch {
    return { hidden: [], order: [] }
  }
}

/**
 * Вибір видимих колонок таблиці (react-admin: DatagridConfigurable) на
 * localStorage — namespace = унікальний ключ сторінки (як у useSavedFilters).
 *
 * @param {string} namespace
 * @param {Array<{key: string, label: string, hideable?: boolean, defaultHidden?: boolean}>} columns
 *   Повний дескриптор колонок сторінки; hideable !== false означає «можна ховати».
 */
export function useColumnPrefs(namespace, columns) {
  const state = ref(read(namespace))
  // ... hidden / isVisible / toggle / reset / hasHidden
}
```

Важливі деталі:

- **`order` у v1 не використовується** — реордер виключений зі scope. Поле є в
  структурі, що пишеться в localStorage, лише щоб реордер додався пізніше без
  міграції збережених налаштувань. Не читати його й не покладатись на нього.
- **Нові колонки видимі за замовчуванням.** Ховається те, що явно перелічене в
  `hidden`; колонка, доданого в код після того, як адмін зберіг налаштування, у
  `hidden` не потрапляє й показується. Це і є правильна поведінка — не робити
  «показувати тільки те, що в збереженому списку».
- `defaultHidden: true` composable підтримує — застосовується **лише якщо в
  localStorage ще нічого немає** для цього namespace, інакше адмін не зможе
  показати таку колонку назавжди. **У v1 жодна колонка цей прапорець не
  отримує** (рішення валідації), але логіка мусить бути реалізована й покрита
  ручною перевіркою — задача 20 і подальші будуть її використовувати.
- `isVisible(key)` мусить повертати `true` для `hideable: false` завжди.
- `hasHidden` (щось приховане?) — для індикатора на кнопці, щоб адмін не забув,
  що частина колонок вимкнена. Без нього «куди зникла колонка» стає питанням до
  розробника.

### 2. Config-driven сторінки

Приклад для `geography/cities.config.json` — додати **одне** поле до елементів
`table[]` (решта полів існують і не змінюються):

```json
"table": [
  { "key": "id",             "width": 50,  "align": "end", "hideable": false, "inlineEditable": false, "sortable": false },
  { "key": "city_type_id",   "width": 80,  "hideable": true,  "inlineEditable": false, "sortable": true, "displayKey": "city_type_name" },
  { "key": "country_id",     "width": 100, "hideable": true,  "inlineEditable": false, "sortable": true, "displayKey": "country_name" },
  { "key": "area_region_id", "width": 150, "hideable": true,  "inlineEditable": false, "sortable": true, "displayKey": "area_region_name" },
  { "key": "name_uk",                      "hideable": false, "inlineEditable": true,  "sortable": true },
  { "key": "name_en",                      "hideable": true,  "inlineEditable": true,  "sortable": true },
  { "key": "name_ru",                      "hideable": true,  "inlineEditable": true,  "sortable": true },
  { "key": "is_capital",     "width": 80,  "hideable": true,  "inlineEditable": false, "sortable": true },
  { "key": "is_active",      "width": 100, "hideable": false, "inlineEditable": false, "sortable": false }
]
```

⚠️ `defaultHidden` тут навмисно **немає** — рішення валідації: у першому заході
жодна колонка не приховується сама.

У `pages/geography/Cities.vue` замінити обидва `v-for="col in cfg.table"`
(у `<thead>` — рядок 132, і в `<tbody>` `<template v-for>` — рядок 153) на
`visibleColumns`:

```js
const columnDescriptors = cfg.table.map((col) => ({
  key: col.key,
  label: cfg.fields[col.key].label,
  hideable: col.hideable !== false,
  defaultHidden: col.defaultHidden === true,
}))

const { isVisible, toggle, reset, hasHidden } = useColumnPrefs(cfg.apiList, columnDescriptors)

const visibleColumns = computed(() => cfg.table.filter((c) => isVisible(c.key)))
```

`visibleColumns` — просто фільтр вихідного `cfg.table`, порядок береться з
конфіга (реордера в v1 немає).

⚠️ `name_uk` позначений `hideable: false` — це основна назва, без неї рядок
неідентифікований. Так само `is_active` містить інтерактивний toggle статусу.

⚠️ У `<tbody>` `Cities.vue` є гілка `v-else-if="col.displayKey"` (рядок 158) — при
фільтрації `cfg.table` вона працює як є, бо гілки прив'язані до `col`, а не до
індексу. Індексами по `cfg.table` ніде не ходити.

### 3. Hand-written сторінки

Приклад для `pages/Users.vue` — дескриптор поруч із уже наявним `EXPORT_COLUMNS`
(`Users.vue:861-869`), але **окремо від нього**:

```js
// Дескриптор колонок таблиці для ColumnSelector — не плутати з EXPORT_COLUMNS:
// експорт завжди вигружає повний набір, незалежно від прихованих у UI.
const COLUMN_DESCRIPTORS = [
  { key: 'id',         label: 'ID',            hideable: false },
  { key: 'username',   label: 'Username',      hideable: true  },
  { key: 'email',      label: 'Email',         hideable: true  },
  { key: 'name',       label: "Ім'я",          hideable: true  },
  { key: 'phone',      label: 'Телефон',       hideable: true  },
  { key: 'created_at', label: 'Зареєстровано', hideable: true  },
  { key: 'status',     label: 'Статус',        hideable: true  },
  { key: '_actions',   label: 'Дії',           hideable: false },
]
```

І далі в шаблоні (`Users.vue:88-124`) на кожній парі th/td:

```html
<th v-if="isVisible('email')" class="th-sortable" @click="toggleSort('email', $event)">
  Email <SortIcon col="email" :sort-items="sortItems" />
</th>
...
<td v-if="isVisible('email')">{{ row.email }}</td>
```

⚠️ **`Users.vue` містить 5 `<table>`** — таблиця списку і чотири в модалці
(авто, керовані СТО тощо). `isVisible()` застосовувати лише до першої, у
`Users.vue:86-129`. Те саме для `StoList.vue` (4), `StoOutreach.vue` (2),
`geography/CityTmpReview.vue` (2).

### 4. `colspan` — інвентаризація

Рядок-заглушка з фіксованим `colspan` є не всюди, і на двох сторінках `colspan`
використовується не тільки для заглушки. Після приховування колонок фіксоване
число стає невірним (видно як обрізаний рядок). Повний перелік того, що правити:

| Сторінка | Поточне значення | Примітка |
|---|---|---|
| `Users.vue:126` | `colspan="8"` | `_actions` входить у дескриптор → `+0` |
| `Feedback.vue:108` | `colspan="8"` | |
| `Reviews.vue:250` | `colspan="9"` | |
| `ErrorLogs.vue:105` | `colspan="8"` | |
| `AuditLog.vue:91` | `colspan="7"` | |
| `Analytics.vue:332` | `colspan="14"` | найширша таблиця |
| `StoManagers.vue:80` | `colspan="5"` | |
| `geography/Timezones.vue:133` | `colspan="5"` | |
| `StoOutreach.vue:150` | `colspan="8"` | заглушка |
| **`StoOutreach.vue:87`** | `colspan="8"` | **не заглушка** — розкривна строка деталей; той самий перерахунок |
| `News.vue:183` | `:colspan="bulk ? 8 : 7"` | вже динамічний, замінити на computed |
| `StoList.vue:258` | `:colspan="bulk ? 9 : 8"` | те саме |
| `StoApplications.vue:108` | `:colspan="bulkColumnVisible ? 8 : 7"` | те саме |
| `catalog/CarBrands.vue:100` | `:colspan="bulk ? 7 : 6"` | те саме |
| `catalog/CarModels.vue:113` | `:colspan="bulk ? 10 : 9"` | те саме |
| `catalog/Services.vue:172` | `:colspan="bulk ? 8 : 7"` | те саме |
| config-driven ×6 | `:colspan="cfg.table.length + 1 + (bulk ? 1 : 0)"` | замінити `cfg.table` на `visibleColumns` |
| `PermissionList.vue`, `RoleManagement.vue`, `AdminManagement.vue`, `AnalyticsBannedIps.vue` | — | рядка-заглушки немає, правити нічого |

**Формула для категорії A** (config-driven): колонка кнопок дій лежить **поза**
`cfg.table` (`Cities.vue:140`), тому `+1` обов'язковий:

```js
const visibleColspan = computed(
  () => visibleColumns.value.length + 1 + (bulkActionsAvailable.value.length ? 1 : 0)
)
```

`catalog/ServiceGroups.vue:101` записує те саме як
`cfg.table.length + (bulk ? 2 : 1)` — результат ідентичний, привести до однієї
форми.

**Формула для категорії B** (hand-written): `_actions` уже входить у
`COLUMN_DESCRIPTORS`, тому `+1` **не** потрібен, а bulk-колонка є не на всіх
сторінках — у `Users.vue`, наприклад, bulk-дій немає взагалі й
`bulkActionsAvailable` не існує:

```js
// Сторінка з bulk-діями:
const visibleColspan = computed(
  () => COLUMN_DESCRIPTORS.filter((c) => isVisible(c.key)).length + (bulkActionsAvailable.value.length ? 1 : 0)
)
// Сторінка без bulk-дій (Users.vue, Feedback.vue, ErrorLogs.vue, AuditLog.vue,
// Analytics.vue, Reviews.vue, StoManagers.vue, StoOutreach.vue, Timezones.vue):
const visibleColspan = computed(
  () => COLUMN_DESCRIPTORS.filter((c) => isVisible(c.key)).length
)
```

Правило, щоб не помилитись: `colspan` мусить дорівнювати кількості `<th>`, які
реально відрендерились у `<thead>` цієї сторінки. Виводити з того самого джерела,
що й заголовок, а не переписувати число руками.

Задача 02 (`Empty state`) переробляє цей рядок повністю — якщо 02 вже виконана,
брати `colspan` звідти й не дублювати.

### 5. Scope & Non-Goals

**В scope:** новий composable + компонент, розкатка на всі 26 сторінок двома
хвилями, `hideable` у 6 config-файлах, перерахунок `colspan` за інвентарем вище.

**Поза scope:**
- **реордер колонок у будь-якому вигляді** — ні drag&drop, ні стрілки ↑/↓
  (рішення валідації: однакова поведінка на всіх 26 сторінках важливіша)
- `defaultHidden` у конфігах — логіка реалізована, значення не виставляються
- збереження вибору на бекенді / синхронізація між пристроями
- пресети наборів колонок («мій набір для модерації»)
- density toggle (compact/normal) — окрема фіча
- зміна `EXPORT_COLUMNS`
- таблиці в модалках і вкладках

---

## FAQ

**Q: Чому namespace = list-ендпоінт, а не назва сторінки?**
A: Так уже зроблено в `useSavedFilters` (`useSavedFilters(cfg.apiList)` у
`Users.vue:816`, `useSavedFilters('/api/admin/sto')` у `StoList.vue:2053`).
Однаковий підхід = один ментальний слот, а не два.

**Q: `Areas.vue` і `Districts.vue` — це дві сторінки чи одна?**
A: Дві сторінки, один шаблон (`AreaRegionList.vue`), два різних config-файли.
Namespace брати з `cfg.apiList` пропа — тоді вибір колонок для регіонів і
районів автоматично незалежний, хоч компонент і спільний.

**Q: Що з `StoList.vue`, там колонки залежать від прав?**
A: Перевірено — жодна колонка `StoList.vue` не закрита правами на рівні
`<th>`/`<td>`. Права стоять **всередині** клітинок: `v-if="canEdit"` на
inline-полі назви (рядок 161), на `<select>` типу СТО (174), на inline-рейтингу
(211), `v-if="canEditStatus"` на toggle статусу (232) — і в кожному є `v-else`
з read-only варіантом. Тому `isVisible()` вішається на `<th>`/`<td>` і з правами
не конфліктує. Якщо колонка все ж колись отримає `v-if="can(...)"`, нова умова
додається через `&&`: приховування правами головніше, селектор не може показати
те, на що прав немає.

**Q: Який namespace брати для сторінок без `*.config.json`?**
A: Рядок list-ендпоінта літералом, як це вже зроблено для збережених фільтрів:
`useSavedFilters('/api/admin/sto')` у `StoList.vue:2053`. Не назву компонента й
не `route.path` — ендпоінт стабільніший за обидва.
⚠️ `Users.vue` і `catalog/CarBrands.vue` мають `*.config.json` **без**
`fields`/`table` (тільки permissions + ендпоінти), тому за рендером це категорія
B, але `cfg.apiList` у них є — брати його.
⚠️⚠️ **`countries.config.json` не має `apiList`** (є лише `apiCreate`/`apiUpdate`/
`apiDelete`; список запитується літералом у `Countries.vue:362`). `cfg.apiList`
там `undefined`, і ключ став би `admin.columnPrefs:undefined` — спільним для всіх
таких сторінок. Тому namespace задається константою в компоненті. Перед
використанням `cfg.apiList` на будь-якій сторінці — перевірити, що поле взагалі є.

**Q: Чи додавати вибір колонок в URL, щоб можна було поділитись посиланням?**
A: Ні. Це персональне налаштування вигляду, а не стан списку — на відміну від
фільтрів і сортування, які в URL уже є через `useUrlFilters`.

**Q: Чи потрібен `npm run build:admin`, щоб фіча заробила?**
A: Для роботи — ні. `FieldConfigReader` читає з конфіга **тільки `fields`**
(`FieldConfigReader.php:19`), секцію `table[]` бекенд не читає взагалі, тобто
новий прапорець `hideable` на бекенд ніяк не впливає. Але `sync-configs.js`
копіює файли цілком, і без запуску копії в `www_app/config/` розійдуться з
фронтендними — тому синк усе одно зробити.
