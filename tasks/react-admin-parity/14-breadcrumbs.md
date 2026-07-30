# Задача 14: breadcrumbs (react-admin `ra-navigation`)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `Breadcrumbs.vue` / `Breadcrumbs.tsx`, джерело — `config/menu.json`
> (у `admin` меню в **JSON**, а не в `menu.js`, і файл спільний за форматом для
> двох фронтендів — це добре, breadcrumbs читають той самий файл).
>
> **Перевірити наявність бага, а не припускати:** у `allsto`
> `TopNav.activeSection` визначає активну секцію через `path.startsWith(item.to)`,
> через що `/sto-managers` підсвічує «СТО». У `admin` перевірити обидва
> `TopNav` — Vue і React пишуть цю логіку окремо, тому баг може бути в одному,
> в обох або ні в кому. Виправляти тим самим правилом найдовшого префікса:
> `path === item.to || path.startsWith(item.to + '/')`.
>
> **Місце в розмітці:** у `admin` немає `ListPageWrapper` зі скрол-контейнером —
> breadcrumbs ставити в `BaseLayout` під `TopNav`, один раз, в обох мовах.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) · **Статус:** [STATUS.md](STATUS.md)

## Контекст

Навігація в адмінці — двоуровневе меню в `components/TopNav.vue`: секція
(«Географія») → пункт («Населені пункти»). Активна секція підсвічується
(`activeSection`, `TopNav.vue:93-99`), але **активний пункт у дропдауні — ні**, а
дропдаун ще й закритий. Тобто на сторінці адмін бачить лише свій `<h5>`
(«Населені пункти») і не бачить, у якій секції він знаходиться.

Проблема помітна на сторінках, чий заголовок не називає секцію однозначно:
`Timezones.vue` («Таймзони» — це Географія), `CityTmpReview.vue` («Нові міста»),
`AuditLog.vue` («Журнал змін» — це Система, і його легко спутати з логами
помилок), `PermissionList.vue` vs `RoleManagement.vue`.

react-admin має `<Breadcrumb>` з `ra-navigation`.

Це найдешевша задача пакету: уся структура вже описана даними в
`config/menu.js` — секції з `label`/`icon`/`items[]`, а `items[]` містять `to` і
`label`. Breadcrumb будується з цього без жодного нового джерела правди.

## Промпт для Claude Code

> Додай breadcrumbs в адмінку — аналог `<Breadcrumb>` з `ra-navigation`.
>
> 1. **Новий компонент `www_front/admin/src/components/Breadcrumbs.vue`** —
>    будує ланцюжок із `config/menu.js` по поточному `route.path`:
>    `Головна / Географія / Населені пункти`.
>
>    - «Головна» — посилання на `/`
>    - секція — **не посилання** (у секції немає власної сторінки, лише
>      дропдаун), просто текст з іконкою секції
>    - останній елемент — поточна сторінка, `aria-current="page"`, не посилання
>
> 2. **Пошук пункту меню робити по найдовшому співпадінню префікса**, а не по
>    першому. У `menu.js` є вкладені шляхи: `/sto` і `/sto/import`,
>    `/analytics` і `/analytics/stats`, `/error-logs` і `/error-logs/stats`.
>    Наївний `path.startsWith(item.to)` для `/sto/import` знайде `/sto` першим —
>    і breadcrumb покаже не ту сторінку.
>
>    ⚠️ Той самий баг уже є в `TopNav.vue:93-99` (`activeSection` через
>    `path.startsWith(i.to)`) — для секцій він не проявляється, бо секція одна й
>    та сама, але логіку однаково варто виправити разом.
>
> 3. **Третій рівень для деталей запису.** Коли в URL є `?id=` (модалка запису
>    відкрита — `useUrlFilters` тримає це в query, `useUrlFilters.js:114-122`),
>    додавати останній елемент: `… / Населені пункти / #42`. Це прив'язує
>    breadcrumb до задачі **03** (навігація по записах) — адмін бачить, що
>    відкрито конкретний запис.
>
> 4. **Вставити в `layouts/BaseLayout.vue`**, між `TopNav` і контентом, щоб
>    з'явилось на всіх сторінках одразу, а не по одній.
>
>    ⚠️ Перевірити взаємодію з `ListPageWrapper` — він рахує висоту через
>    `flex: 1; min-height: 0; overflow-y: scroll`
>    (`ListPageWrapper.vue:20-27` — файл проєкту `allsto`; у `admin` такої обгортки
>    немає, див. врізку адаптації вище).
>    Breadcrumb додає висоту, і якщо він потрапить **всередину** прокручуваної
>    області, то буде скролитись разом із таблицею. Має бути **зовні**, як
>    `TopNav`.
>
> 5. **Не показувати на сторінках без меню**: `Login.vue`, `FirstLogin.vue`,
>    `ForgotPassword.vue`, `SetPassword.vue`. Вони й так не використовують
>    `BaseLayout` — перевірити це, а не додавати `v-if` наосліп.
>
> 6. **Сторінки, яких немає в `menu.js`** (`/change-password`, `/sto-managers`
>    під іншою секцією, будь-які майбутні): fallback — `Головна / <заголовок
>    сторінки>`, без падіння.
>
> 7. **Прибрати дублювання із заголовком.** Зараз кожна сторінка має свій `<h5>`
>    з тією самою назвою, що буде в breadcrumb. Обрати одне:
>    - **(рекомендовано)** залишити `<h5>` як є, breadcrumb дає контекст секції —
>      мінімум змін, 26 сторінок не чіпаємо;
>    - або прибрати `<h5>` і зробити останній елемент breadcrumb великим.
>
>    Якщо обрано перше — просто зафіксувати це в коментарі компонента, щоб
>    наступний не «виправляв» дублювання.
>
> **Не робити:** хлібні крошки з історією переходів (`Назад до…`), збереження
> шляху в localStorage, breadcrumb для вкладок усередині модалок, зміну
> структури `menu.js`.

## Що перевірити після виконання

- [ ] `Breadcrumbs.vue` створений, вставлений у `BaseLayout.vue`, видно на всіх сторінках з меню
- [ ] **Breadcrumb не скролиться разом із таблицею** — залишається на місці при прокрутці довгого списку (перевірити на `geography/Cities.vue` з `per_page=250`)
- [ ] Ланцюжок вірний: `/geography/cities` → `Головна / Географія / Населені пункти`
- [ ] **Вкладені шляхи розпізнаються вірно** — перевірити всі пари з `menu.js`:
  - `/sto/import` → `… / Імпорт СТО` (не «Список СТО»)
  - `/sto/outreach` → `… / Розсилка`
  - `/sto/applications` → `… / Заявки`
  - `/analytics/stats` → `… / Статистика` (не «Відвідування»)
  - `/analytics/charts` → `… / Графіки`
  - `/analytics/banned-ips` → `… / Заблоковані IP`
  - `/error-logs/stats` → `… / Статистика помилок` (не «Логи помилок»)
  - `/feedback/stats` → `… / Статистика звернень` (не «Список звернень»)
  - `/geography/city-types` → `… / Типи нас. пунктів` (не «Населені пункти»)
  - `/geography/city-tmp-review` → `… / Нові міста`
- [ ] `activeSection` у `TopNav.vue` теж виправлений на найдовший префікс
- [ ] Іконка секції показується біля її назви (з `menu.js`, поле `icon`)
- [ ] Секція **не** посилання; останній елемент **не** посилання, має `aria-current="page"`
- [ ] «Головна» веде на `/`
- [ ] `?id=42` в URL додає третій рівень `#42`; закриття модалки його прибирає
- [ ] Сторінка не з `menu.js` (`/change-password`) не падає, показує fallback
- [ ] На сторінках логіну breadcrumb відсутній
- [ ] **Права враховані:** якщо адмін якимось чином на сторінці, чия секція для нього приховані (`can(section.permission) === false`), breadcrumb не мусить показувати назву недоступної секції — fallback
- [ ] Верстка не з'їхала: `ListPageWrapper` `contentMargin` і `modal-content-margin-change` працюють як до задачі (перевірити з відкритою модалкою `BaseModal`, яка змінює margin — `ListPageWrapper.vue:29-32`)
- [ ] Немає console errors

---

## Технічні деталі для імплементації

### 1. Пошук пункту меню — найдовший префікс

Це єдина неочевидна частина задачі.

```js
import menu from '@/config/menu'

/**
 * Пошук пункту меню за поточним шляхом — саме по найдовшому співпадінню
 * префікса, а не по першому. У menu.js є вкладені шляхи (/sto і /sto/import,
 * /analytics і /analytics/stats), і наївний startsWith знайшов би батьківський.
 */
function findMenuLocation(path) {
  let best = null

  for (const section of menu) {
    for (const item of section.items) {
      if (path === item.to || path.startsWith(item.to + '/')) {
        if (!best || item.to.length > best.item.to.length) {
          best = { section, item }
        }
      }
    }
  }
  return best
}
```

⚠️ Умова `path === item.to || path.startsWith(item.to + '/')` — не просто
`startsWith(item.to)`. Інакше `/sto-managers` співпаде з `/sto` (бо
`'/sto-managers'.startsWith('/sto')` це `true`), і «Менеджери СТО» отримають
breadcrumb «СТО / Список СТО». У `menu.js` `/sto-managers` лежить у секції
«Користувачі» — тобто помилка була б видимою.

Це та сама пастка, що в наявному `TopNav.vue:93-99`:

```js
// TopNav.vue, поточний код — має ту саму проблему
if (s.items.some(i => path.startsWith(i.to))) return s.id
```

Для `/sto-managers` цей код підсвітить секцію «СТО» замість «Користувачі».
Виправити разом.

### 2. Компонент

```html
<template>
  <nav v-if="location || fallbackTitle" aria-label="breadcrumb"
       class="px-3 py-2 border-bottom bg-body-tertiary">
    <ol class="breadcrumb mb-0 small">
      <li class="breadcrumb-item">
        <router-link to="/">Головна</router-link>
      </li>

      <li v-if="location" class="breadcrumb-item text-muted">
        <i :class="['bi', location.section.icon, 'me-1']"></i>{{ location.section.label }}
      </li>

      <li class="breadcrumb-item active" aria-current="page">
        {{ location ? location.item.label : fallbackTitle }}
      </li>

      <li v-if="recordId" class="breadcrumb-item active" aria-current="page">
        #{{ recordId }}
      </li>
    </ol>
  </nav>
</template>
```

`bg-body-tertiary` замість `bg-light` — щоб задача **13** (тёмна тема) не
вимагала правки цього файлу окремо.

### 3. Права

`menu.js` тримає `permission` і на секції, і на пункті, а `TopNav` фільтрує їх
через `auth.can()` (`TopNav.vue:89-91`, `32`). Breadcrumb мусить робити те саме:

```js
const location = computed(() => {
  const found = findMenuLocation(route.path)
  if (!found) return null
  // Не показувати назву секції/пункту, до яких у адміна немає доступу —
  // навіть якщо він якось потрапив на URL.
  if (!auth.can(found.section.permission) || !auth.can(found.item.permission)) return null
  return found
})
```

### 4. Розміщення в `BaseLayout.vue`

Прочитати `layouts/BaseLayout.vue` і вставити `<Breadcrumbs />` **після**
`<TopNav />`, але **до** контейнера, який `ListPageWrapper` розтягує через
`flex: 1; min-height: 0; overflow-y: scroll`.

Перевірка після вставки: відкрити `geography/Cities.vue` з `per_page=250`,
прокрутити список — breadcrumb мусить стояти на місці. Якщо він поїхав нагору —
він усередині прокручуваної області, треба перенести.

### 5. Scope & Non-Goals

**В scope:** компонент, вставка в `BaseLayout`, найдовший-префікс пошук,
виправлення `activeSection` у `TopNav.vue`, третій рівень для `?id=`, fallback
для сторінок поза `menu.js`, врахування прав.

**Поза scope:**
- історія переходів / «Назад до…»
- breadcrumb для вкладок модалки
- зміна структури `menu.js`
- прибирання `<h5>` заголовків зі 26 сторінок
- третій рівень із назвою запису замість `#id` (вимагав би довантаження назви —
  див. FAQ)

---

## FAQ

**Q: Чому третій рівень `#42`, а не назва запису?**
A Бо назва не завжди відома: адмін міг зайти по прямому посиланню з `?id=`, і
запису може не бути на поточній сторінці списку (та сама ситуація, що описана в
FAQ задачі **03**). Довантажувати назву заради breadcrumb — окремий запит.
`#42` завжди правдивий і завжди доступний.

**Q: Чому секція не посилання?**
A У `menu.js` секції не мають власного `to` — це чисті групи для дропдауна.
Робити посилання на перший пункт секції було б брехнею: клік вів би не туди, куди
написано.

**Q: Не буде дублювання з `<h5>` на сторінці?**
A Буде, і це свідомий вибір (п.7 промпту, варіант 1). Прибирання `<h5>` зі 26
сторінок — робота, не пропорційна виграшу, а breadcrumb дає те, чого `<h5>` не
дає: **секцію**. Головне — зафіксувати рішення коментарем, щоб наступний не
почав «виправляти».

**Q: `TopNav.activeSection` реально зламаний?**
A На `/sto-managers` — так: `'/sto-managers'.startsWith('/sto')` дає `true`,
тобто підсвітиться секція «СТО», хоча пункт лежить у «Користувачі»
(`menu.js:21`). Перевірити руками перед виправленням і зафіксувати в чеклісті.
