# Задача 02: Empty state з CTA (react-admin `<Empty>`)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `DataListPage.vue:178-182` і `DataTable.tsx:394-403` — той самий рядок
> «Немає даних», один на фреймворк. Новий `EmptyState.vue` / `EmptyState.tsx`.
>
> **Спрощується:** `hasActiveFilters` у фреймворку виводиться сам, з наявного
> стану фільтрів (`filters` — обʼєкт із `filterConfig`), тому per-page computed із
> тексту нижче не потрібен:
> ```js
> const hasActiveFilters = computed(() => props.filterConfig
>   .some(f => { const v = filters[f.key].value; return v !== '' && v !== null && v !== false })) 
> ```
> Той самий предикат уже використовується в `load()` для складання query — брати
> звідти, не писати другий.
>
> **CTA «Додати перший запис»:** у фреймворку кнопки створення **немає** (див.
> задачу 00, gap-аналіз). Тому в `admin` CTA обмежується «Скинути фільтри»;
> кнопка створення додається тоді, коли фреймворк узагалі навчиться створювати.
>
> **Не застосовується:** `Cities.vue:677-680` (авто-`filterCountry` в `onMounted`),
> перелік 26 сторінок, `colspan`-інвентар.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Коли список порожній, у нас усюди один і той самий сірий рядок у таблиці:

```html
<tr v-if="!items.length">
  <td colspan="8" class="text-center text-muted py-4">Немає даних</td>
</tr>
```

Проблема не в естетиці, а в тому, що цей рядок не відрізняє два **різні**
стани:

1. **Записів дійсно немає** → адмін має побачити кнопку «Створити».
2. **Записи є, але фільтр нічого не знайшов** → адмін має побачити кнопку
   «Скинути фільтри» і перелік активних фільтрів.

Зараз у другому випадку адмін бачить «Немає даних» і думає, що база порожня —
особливо легко потрапити в цю пастку через `useUrlFilters`, бо фільтр
відновлюється з URL при вході на сторінку, а на сторінках із збереженими
пресетами (`useSavedFilters`) — ще й переживає перезавантаження.

react-admin вирішує це компонентом `<Empty>`: іконка, текст «No <resource> yet»
і кнопка `<CreateButton>`.

## Промпт для Claude Code

> Замінь у адмінці рядок-заглушку «Немає даних» на нормальний empty state —
> аналог `<Empty>` з react-admin.
>
> 1. **Новий компонент `www_front/admin/src/components/EmptyState.vue`** з
>    пропами:
>    - `filtered: Boolean` — чи активні зараз якісь фільтри/пошук
>    - `entityLabel: String` — напр. «населених пунктів», для тексту
>    - `canCreate: Boolean` — чи показувати кнопку «Створити»
>    - `icon: String` — bootstrap-іконка, дефолт `bi-inbox`
>    - емітить `create` і `reset-filters`
>
>    Два режими:
>    - `filtered === false`: іконка + «Ще немає {entityLabel}» + кнопка
>      «＋ Створити» (якщо `canCreate`)
>    - `filtered === true`: іконка `bi-funnel` + «За вибраними фільтрами нічого
>      не знайдено» + кнопка «Скинути фільтри»
>
> 2. **Розкатай на всі 26 списковых сторінок** (перелік у `README.md`) —
>    замінити рядок `<tr v-if="!items.length">` на рядок з одним `<td>` на всю
>    ширину, всередині якого `<EmptyState>`.
>
> 3. **`colspan` порахувати, а не хардкодити.** Зараз він захардкожений
>    (`Users.vue:126` — `colspan="8"`) і вже зараз може бути невірним. Зроби
>    computed `visibleColspan`. Якщо задача 01 (селектор колонок) уже виконана —
>    брати `colspan` із неї, не заводити другий джерело правди.
>
> 4. **`filtered` рахувати честно** — computed, що перевіряє всі фільтри
>    сторінки на «не дефолт», включно з `search`. Для сторінок із
>    `useUrlFilters` перелік фільтрів уже є в об'єкті `filters: {}` — брати з нього,
>    але **не рахувати** `page` і `per_page` за фільтри (вони там є як звичайні
>    ключі, див. `Users.vue:729-734`).
>
> 5. **«Скинути фільтри»** для сторінок з `useUrlFilters` викликає вже наявний
>    `resetFilters(defaults)` (`useUrlFilters.js:186`); для решти — локальну
>    функцію, що скидає фільтри в дефолт і робить `load(1)`.
>
> **Не робити:** ілюстрації/SVG-арт, різні тексти під кожну сутність окремим
> словником, empty state для вкладок модалок (там свої «Авто не знайдено» тощо —
> вони на місці й не плутають адміна).

## Що перевірити після виконання

- [ ] `EmptyState.vue` створений, обидва режими (`filtered` true/false) рендерять різний текст, іконку і кнопку
- [ ] На сторінці **без** фільтрів і **без** записів видно «Ще немає …» + кнопка «Створити»
- [ ] Кнопка «Створити» відсутня, якщо в адміна немає create-permission (перевірити на `geography/Cities.vue` з роллю без `geography.cities.create`)
- [ ] На сторінці з активним фільтром, що нічого не знайшов, видно «нічого не знайдено» + кнопка «Скинути фільтри»
- [ ] «Скинути фільтри» реально чистить фільтри **і в URL теж** (query-параметри зникають), список перезавантажується з першої сторінки
- [ ] `filtered` не спрацьовує хибно: зайшов на сторінку без query-параметрів → показується режим «ще немає», а не «нічого не знайдено»
- [ ] `page`/`per_page` не вважаються фільтрами: перехід на сторінку 3 з порожнім результатом не показує «скинути фільтри» через сам факт `page=3`
- [ ] `colspan` вірний на всіх сторінках — рядок empty state тягнеться на всю ширину таблиці, без обрізаного краю
- [ ] Сторінки з дефолтним фільтром, що не є «пустим», не зламані: `geography/Cities.vue` у `onMounted` **автоматично виставляє** `filterCountry` у першу країну (`Cities.vue:677-680`) — це не «фільтр, введений адміном», і сам по собі не має перемикати empty state у режим `filtered`
- [ ] Усі 26 сторінок оновлені, старий текст «Немає даних» у таблицях більше не зустрічається
- [ ] Немає console errors, зокрема на сторінках без create-ендпоінта (`AuditLog.vue`, `ErrorLogs.vue`, `Analytics.vue`, `PermissionList.vue` — там `canCreate` завжди `false`)

---

## Технічні деталі для імплементації

### 1. `EmptyState.vue`

Стилістика — Bootstrap 5, як у решті адмінки; жодних нових залежностей.

```html
<template>
  <div class="text-center py-5">
    <i :class="['bi', filtered ? 'bi-funnel' : icon]" style="font-size:2.5rem; opacity:.35"></i>

    <p class="text-muted mt-3 mb-3">
      <template v-if="filtered">За вибраними фільтрами нічого не знайдено</template>
      <template v-else>Ще немає {{ entityLabel }}</template>
    </p>

    <button v-if="filtered" class="btn btn-sm btn-outline-secondary" @click="$emit('reset-filters')">
      <i class="bi bi-x-circle me-1"></i>Скинути фільтри
    </button>
    <button v-else-if="canCreate" class="btn btn-sm btn-primary" @click="$emit('create')">
      <i class="bi bi-plus-lg me-1"></i>Створити
    </button>
  </div>
</template>
```

### 2. Заміна в таблиці

Було (`pages/Users.vue:125-127`):

```html
<tr v-if="!items.length">
  <td colspan="8" class="text-center text-muted py-4">Немає даних</td>
</tr>
```

Стало:

```html
<tr v-if="!items.length">
  <td :colspan="visibleColspan" class="p-0">
    <EmptyState
      :filtered="hasActiveFilters"
      entity-label="користувачів"
      :can-create="false"
      icon="bi-people"
      @reset-filters="resetAllFilters"
    />
  </td>
</tr>
```

⚠️ `class="p-0"` на `<td>` обов'язковий — інакше подвійний padding
(`table` дає свій, `EmptyState` свій `py-5`).

### 3. `hasActiveFilters`

Для сторінок з `useUrlFilters` перелік фільтрів уже оголошений — напр.
`Users.vue:729-734`:

```js
filters: { search, status: filterStatus, page, per_page: perPage }
```

Отже:

```js
// page/per_page живуть у тому ж об'єкті filters (щоб useUrlFilters клав їх у
// URL), але фільтрами по суті не є — інакше «сторінка 3» вважалась би
// застосованим фільтром.
const PAGINATION_KEYS = ['page', 'per_page']

const hasActiveFilters = computed(() =>
  search.value.trim() !== '' || filterStatus.value !== ''
)
```

Явний computed на конкретні фільтри надійніший, ніж generic-обхід `filters{}` з
винятками, — на кожній сторінці свій набір дефолтів (десь `''`, десь `null`,
десь `'all'`, а в `Cities.vue` дефолт `filterCountry` взагалі проставляється
асинхронно з першої країни у відповіді). Тому: **на кожній сторінці — свій
короткий computed**, без спроби зробити його універсальним.

### 4. Особливі випадки по сторінках

| Сторінка | `canCreate` | Нюанс |
|---|---|---|
| `geography/Cities.vue` | `can('geography.cities.create')` | дефолтний `filterCountry` виставляється в `onMounted` (`Cities.vue:677-680`) — **не** враховувати його в `hasActiveFilters` |
| `AuditLog.vue`, `ErrorLogs.vue`, `Analytics.vue`, `AnalyticsBannedIps.vue` | `false` | append-only логи, створення руками не буває |
| `PermissionList.vue`, `RoleManagement.vue` | `false` | керуються окремими модалками, не рядком таблиці |
| `geography/CityTmpReview.vue` | `false` | черга на модерацію, записи приходять з фронтенду |
| `StoApplications.vue` | `false` | заявки створює користувач, не адмін |
| `StoList.vue` | `can('sto.create')` | перевірити фактичну назву permission у `config/permissions.js` |
| `Users.vue` | `false` | реєстрація йде через фронтенд; у config є лише `viewPermission`/`editPermission` (`users.config.json`) |

### 5. Scope & Non-Goals

**В scope:** новий компонент, розкатка на 26 сторінок, computed `visibleColspan`
і `hasActiveFilters` на кожній, коректний `canCreate` за правами.

**Поза scope:**
- SVG-ілюстрації
- empty state усередині вкладок модалок (`Users.vue` таб «Авто» — «Авто не
  знайдено», таб «Доступ до СТО» — «Доступ до СТО не надано»): вони в контексті
  однозначні й фільтрів там немає
- empty state для дашборд-віджетів і графіків
- зміна текстів у `SystemHealthWidget.vue`

---

## FAQ

**Q: Чому не зробити один universal computed для `hasActiveFilters` у composable?**
A: Дефолти фільтрів на 26 сторінках несумісні (`''`, `null`, `'all'`,
асинхронно проставлена країна). Universal-версія вимагала б передавати повний
словник дефолтів — тобто той самий обсяг коду, але з додатковим шаром
непрямості. Короткий локальний computed чесніший.

**Q: Чи не конфліктує це з задачею 01 (селектор колонок)?**
A: Обидві задачі торкаються `colspan`. Виконувати в будь-якому порядку, але
`visibleColspan` мусить бути **одним** computed на сторінку — хто робить другим,
переиспользует наявний, а не додає свій.

**Q: `filtered` під час завантаження?**
A: `EmptyState` рендериться лише у гілці `v-else` після `loading`/`error` — під
час завантаження показується спіннер (задача 07 замінить його на skeleton).
Тобто `items.length === 0` при `loading === true` до `EmptyState` не доходить.

**Q: А якщо `items` порожній через помилку бекенду?**
A Не доходить: помилка обробляється раніше — `v-else-if="error"` з
`alert alert-danger` (напр. `Users.vue:81`).
