# Задача 06: розкривні рядки таблиці (react-admin `<Datagrid expand>`)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `useRowExpand.js` / `useRowExpand.ts` + правка `<tbody>` у
> `DataListPage.vue:145-177` і `DataTable.tsx:363-393`.
>
> **Vue вимагає обгортки:** зараз `<tr v-for="row in items">` — щоб малювати два
> `<tr>` на рядок, потрібен `<template v-for>` з `:key` на ньому. React простіше:
> `items.map(row => <Fragment key={...}>` з двома `<tr>`.
>
> **Що рендерити всередині:** у фреймворку деталі рядка вже описані декларативно —
> `actions: [{ type: 'detail', tab: 'contacts' }]`. Логічний хід: розкривний рядок
> показує **той самий** контент, що вкладка модалки, тому вміст іде слотом
> (Vue: `<slot name="expand" :row="row">`) / пропом-рендером (React:
> `renderExpanded?: (row) => ReactNode`). Ядро не має знати, що там.
>
> **`@click.stop` на інтерактиві в клітинках обовʼязковий** — комірки редаговані
> (`cellTypes`), і клік по `<select>`/`<input>` не має розкривати рядок.
>
> **Не застосовується:** рефакторинг `ErrorLogDetail.vue`/`FeedbackDetail.vue`
> (у `admin` вони теж лежать мертвими в `frontend/src/components/`, але це
> легасі-сторінки — прибирати їх у задачі **00**, разом зі сторінками), інвентар
> `colspan` по 26 сторінках.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Зараз щоб побачити деталі запису, треба відкрити модалку — тобто перекрити
список, втратити контекст сусідніх рядків і потім закрити її. Для сценарію
«швидко проглянути 10 звернень підряд» це надто важко: модалка ще й
запам'ятовує розмір/позицію (`BaseModal` `storage-key`), тобто відкриття
кожного разу перемальовує пів екрана.

react-admin має `<Datagrid expand={<Panel/>}>`: стрілка в рядку розкриває панель
під рядком, список залишається на місці, можна тримати розкритими кілька рядків
одночасно.

Найкорисніше на `pages/Feedback.vue` (текст звернення), `pages/ErrorLogs.vue`
(stack trace), `pages/Reviews.vue` (текст відгуку на модерації),
`pages/AuditLog.vue` (diff змін — його зараз узагалі ніде не видно повністю),
`geography/CityTmpReview.vue` (що саме прислав фронтенд).

### Знахідка, яку треба врахувати

`components/ErrorLogDetail.vue` (224 рядки) і `components/FeedbackDetail.vue`
(191 рядок) — **мертвий код**: їх ніхто не імпортує. Реально
використовуються `ErrorLogDetailModal.vue` (286) і `FeedbackDetailModal.vue`
(249), які дублюють цей самий вміст у собі.

Правильний патерн у проєкті вже є — `AnalyticsDetailsModal.vue` (310) обгортає
`AnalyticsDetailsModalContent.vue` (441), тобто вміст відокремлений від модалки й
переиспользуемий. Ця задача — гарний повод привести `ErrorLog` і `Feedback` до
того самого вигляду: вміст живе в одному компоненті, а модалка й expand-панель
його лише обгортають. Інакше з'явиться **третя** копія тієї самої розмітки.

## Промпт для Claude Code

> Додай розкривні рядки в списковых таблицях адмінки — аналог
> `<Datagrid expand>` з react-admin.
>
> 1. **Новий composable `www_front/admin/src/composables/useRowExpand.js`** —
>    тримає `Set` розкритих id: `{ expanded, isExpanded(id), toggle(id),
>    collapseAll() }`. Кілька рядків можуть бути розкриті одночасно.
>    `collapseAll()` викликати при зміні сторінки/фільтрів (інакше id з іншої
>    вибірки залишаються в `Set`).
>
> 2. **Розмітка розкритого рядка** — другий `<tr>` після основного:
>    ```html
>    <tr v-if="isExpanded(row.id)" class="expand-row">
>      <td :colspan="visibleColspan" class="bg-light p-3">
>        <slot name="expand" :row="row" />
>      </td>
>    </tr>
>    ```
>    `colspan` брати з того самого computed, що задачі **01**/**02** —
>    не заводити третій.
>
> 3. **Кнопка-стрілка** в першій колонці (після чекбокса bulk-виділення, якщо
>    він є): `bi-chevron-right` / `bi-chevron-down`, `btn btn-sm btn-link p-0`.
>
> 4. **Спочатку прибери дублювання вмісту.** Перед додаванням expand-панелей:
>    - перевір, чи `ErrorLogDetail.vue` і `FeedbackDetail.vue` справді ніде не
>      імпортуються (`grep`), і чи їх вміст еквівалентний тому, що всередині
>      відповідних `*Modal.vue`;
>    - зроби так, щоб `ErrorLogDetailModal.vue` і `FeedbackDetailModal.vue`
>      рендерили `ErrorLogDetail.vue` / `FeedbackDetail.vue` як вміст (патерн
>      `AnalyticsDetailsModal` + `AnalyticsDetailsModalContent`), а не тримали
>      свою копію розмітки;
>    - потім переиспользуй ті самі `*Detail.vue` в expand-панелі.
>
>    Якщо вміст розійшовся (модалка новіша за orphan-компонент) — за джерело
>    правди брати **модалку**, вона в продакшені, і оновити `*Detail.vue` під неї.
>
> 5. **Ленива підгрузка.** Якщо панель показує дані, яких немає в рядку списку
>    (stack trace, повний текст, diff), — вантажити при першому розкритті й
>    кешувати в межах сторінки, а не тягнути для всіх рядків одразу.
>
> 6. **Розкатай на 5 сторінок, де це реально корисно**: `pages/Feedback.vue`,
>    `pages/ErrorLogs.vue`, `pages/Reviews.vue`, `pages/AuditLog.vue`,
>    `geography/CityTmpReview.vue`.
>
>    **Не додавати** на решту — без вмісту, який варто показувати, стрілка це
>    просто зайва колонка.
>
> **Не робити:** режим «тільки один розкритий рядок», анімацію розкриття,
> збереження розкритих рядків у URL чи localStorage, вкладені таблиці всередині
> панелі.

## Що перевірити після виконання

- [ ] `useRowExpand.js` створений; кілька рядків можуть бути розкриті одночасно
- [ ] `collapseAll()` викликається при `load()` (зміна сторінки, фільтра, сортування) — після переходу на іншу сторінку розкритих рядків немає
- [ ] Стрілка змінює напрямок (`bi-chevron-right` → `bi-chevron-down`) і має `title`
- [ ] `colspan` розкритого рядка вірний — панель тягнеться на всю ширину таблиці; перевірити разом із прихованими колонками із задачі **01**
- [ ] Клік по стрілці **не** відкриває модалку і **не** тригерить сортування (перевірити на `AuditLog.vue`, де `<th>` клікабельні) — потрібен `@click.stop`
- [ ] Клік по чекбоксу bulk-виділення в тому ж рядку не розкриває панель і навпаки
- [ ] **Дублювання прибрано**: `ErrorLogDetailModal.vue` і `FeedbackDetailModal.vue` рендерять `ErrorLogDetail.vue` / `FeedbackDetail.vue`, а не свою копію розмітки; загальна кількість рядків у цих 4 файлах помітно зменшилась
- [ ] Модалка деталей помилки й звернення після рефакторингу працює як до нього (усі поля на місці, ті самі бейджі рівнів/типів)
- [ ] Expand-панель і модалка показують **однаковий** вміст (бо це один компонент)
- [ ] Ленива підгрузка: розкриття рядка робить рівно один запит; повторне розкриття того самого рядка запиту не робить; при 20 рядках на сторінці й жодному розкритому — жодного додаткового запиту
- [ ] Помилка підгрузки панелі показується всередині панелі, а не ламає таблицю
- [ ] `AuditLog.vue`: у панелі видно повний diff змін (old → new по кожному полю) — те, чого зараз у списку не видно взагалі
- [ ] Панель не з'явилась на сторінках поза списком 5
- [ ] Немає console errors, зокрема при розкритті рядка й одночасному перемиканні сторінки

---

## Технічні деталі для імплементації

### 1. `useRowExpand.js`

```js
import { ref } from 'vue'

/**
 * Розкривні рядки таблиці (react-admin: Datagrid expand). Кілька рядків можуть
 * бути розкриті одночасно. Set перестворюється при кожній зміні — інакше Vue
 * не побачить мутацію (той самий патерн, що selectedIds у Cities.vue:374).
 */
export function useRowExpand() {
  const expanded = ref(new Set())

  function isExpanded(id) {
    return expanded.value.has(id)
  }

  function toggle(id) {
    if (expanded.value.has(id)) expanded.value.delete(id)
    else expanded.value.add(id)
    expanded.value = new Set(expanded.value)
  }

  function collapseAll() {
    expanded.value = new Set()
  }

  return { expanded, isExpanded, toggle, collapseAll }
}
```

⚠️ `expanded.value = new Set(expanded.value)` — не косметика. Той самий трюк уже
використовується для `selectedIds` (`Cities.vue:374`, `383`), бо Vue 3 не
реактивний на мутації `Set` через `.add`/`.delete` у `ref`.

### 2. Ленивий кеш вмісту панелі

```js
// Кеш підгруженого вмісту панелей у межах сторінки. Скидається разом із
// collapseAll() при load() — id з іншої вибірки нам не потрібні.
const expandData = ref({})     // { [id]: { loading, error, data } }

async function loadExpand(id) {
  if (expandData.value[id]) return          // вже вантажили — не повторюємо
  expandData.value = { ...expandData.value, [id]: { loading: true, error: null, data: null } }
  try {
    const res  = await fetch(`${cfg.apiView}/${id}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`)
    expandData.value = { ...expandData.value, [id]: { loading: false, error: null, data: json.data } }
  } catch (e) {
    expandData.value = { ...expandData.value, [id]: { loading: false, error: e.message, data: null } }
  }
}

function onToggleExpand(id) {
  toggle(id)
  if (isExpanded(id)) loadExpand(id)
}
```

⚠️ Кеш **не** через `useListCache` — той кешує list-запити по URL і має
module-scope час життя на всю сесію (`useListCache.js`, `MAX_ENTRIES = 50`).
Панелі деталей — це per-page стан, який мусить померти разом зі сторінкою.

### 3. Розмітка

```html
<tbody>
  <template v-for="row in items" :key="row.id">
    <tr>
      <td v-if="bulkActionsAvailable.length"> <!-- чекбокс, як зараз --> </td>
      <td style="width:32px">
        <button class="btn btn-sm btn-link p-0 text-secondary"
                :title="isExpanded(row.id) ? 'Згорнути' : 'Деталі'"
                @click.stop="onToggleExpand(row.id)">
          <i :class="['bi', isExpanded(row.id) ? 'bi-chevron-down' : 'bi-chevron-right']"></i>
        </button>
      </td>
      <!-- решта колонок як зараз -->
    </tr>
    <tr v-if="isExpanded(row.id)">
      <td :colspan="visibleColspan" class="bg-light p-3">
        <ErrorLogDetail :data="expandData[row.id]?.data"
                        :loading="expandData[row.id]?.loading"
                        :error="expandData[row.id]?.error" />
      </td>
    </tr>
  </template>
</tbody>
```

⚠️ Обгортка `<template v-for>` замість `v-for` на `<tr>` — обов'язкова, бо тепер
на одну ітерацію припадає два `<tr>`. `:key` переїжджає на `<template>`.

⚠️ `@click.stop` — на сторінках, де клік по рядку щось робить (`AuditLog.vue`,
`Feedback.vue` відкривають деталі), без нього розкриття панелі одразу
відкриє й модалку.

### 4. Рефакторинг `*Detail.vue` (пункт 4 промпту)

Цільова форма — як `AnalyticsDetailsModal.vue:74`:

```js
import ModalContent from './AnalyticsDetailsModalContent.vue'
```

Тобто:

- `ErrorLogDetail.vue` — приймає `data` / `loading` / `error` пропами (він уже
  побудований навколо цих трьох станів, див. перші 5 рядків файлу), нічого сам
  не фетчить;
- `ErrorLogDetailModal.vue` — фетчить по `errorId`, віддає результат у
  `<ErrorLogDetail>`;
- expand-панель — фетчить через `loadExpand()`, віддає в той самий
  `<ErrorLogDetail>`.

Те саме для `FeedbackDetail.vue` / `FeedbackDetailModal.vue` (там проп
називається `item`, не `data` — привести до одного імені або залишити як є,
головне не міняти семантику).

**Перед рефакторингом обов'язково порівняти вміст** orphan-компонента й
модалки: orphan міг відстати від продакшн-версії. Джерело правди — модалка.

### 5. Що показувати в панелі

| Сторінка | Вміст панелі | Джерело |
|---|---|---|
| `pages/ErrorLogs.vue` | stack trace, request context | `ErrorLogDetail.vue` після рефакторингу |
| `pages/Feedback.vue` | повний текст звернення, контакти | `FeedbackDetail.vue` після рефакторингу |
| `pages/Reviews.vue` | повний текст відгуку, оцінки по критеріях | винести вміст з `ReviewDetailModal.vue` (359 рядків) тим самим прийомом |
| `pages/AuditLog.vue` | **diff змін old → new по кожному полю** | зараз ніде не показується; нова розмітка, дані з `AdminAuditLogController::list` |
| `geography/CityTmpReview.vue` | сирі дані від фронтенду + збіги-кандидати | нова розмітка |

`AuditLog.vue` тут найцінніший: журнал змін уже пишеться, але побачити **що
саме** змінилось адмін наразі не може.

### 6. Scope & Non-Goals

**В scope:** composable, розмітка на 5 сторінках, ленивий кеш, рефакторинг
`ErrorLog`/`Feedback`/`Review` detail-компонентів у пару Modal+Content.

**Поза scope:**
- режим «акордеон» (тільки один розкритий)
- CSS-анімація розкриття
- збереження розкритих рядків у URL/localStorage
- редагування всередині панелі (це `<EditableDatagrid>`, інша фіча)
- розкатка на решту 21 сторінку
- видалення orphan-компонентів (вони, навпаки, стають основним вмістом)

---

## FAQ

**Q: Чому не замінити модалки на expand-панелі повністю?**
A Різні сценарії. Панель — «зиркнути, не втрачаючи список». Модалка — «працювати
з одним записом», з `BaseModal` resize/позицією й вкладками. react-admin теж
тримає обидва (`expand` і `<Show>`).

**Q: Скільки рядків можна тримати розкритими?**
A Технічно скільки завгодно, і навмисно не обмежуємо. Кеш `expandData` живе
тільки в межах поточної вибірки й скидається при `load()`, тому на пам'ять це не
тисне.

**Q: Чи потрібен новий бекенд-ендпоінт?**
A Для `ErrorLogs`, `Feedback`, `Reviews` — ні, є view-ендпоінти, які вже
використовують модалки. Для `AuditLog` перевірити: якщо `list` уже віддає diff
цілком, додатковий запит не потрібен і ленива підгрузка для цієї сторінки
взагалі не потрібна — панель рендериться з `row`.

**Q: Що з `colspan` на сторінках без bulk-виділення?**
A `visibleColspan` мусить враховувати наявність чекбокс-колонки умовно (як у
задачі **02**): `visibleColumns.length + (bulk ? 1 : 0) + 1` — останній `+1` це
нова колонка зі стрілкою.
