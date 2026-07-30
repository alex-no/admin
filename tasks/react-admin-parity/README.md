# Паритет із react-admin — набір задач (проєкт `admin`)

Пакет задач, що закриває функціональні прогалини адмінки відносно react-admin
(включно з його enterprise-модулями `ra-form-layout`, `ra-rbac`, `ra-realtime`).

Аналіз `admin` проведено 2026-07-30 по стану гілки `dev` (`68b404f`).
Первинний аналіз зроблено на `allsto`; цей пакет — його адаптація під `admin`,
номери задач збережені **1:1**, щоб перенос назад був однозначним.

> 📋 **Стан виконання — у [STATUS.md](STATUS.md).** Цей файл описує *що* робити;
> STATUS.md фіксує *що зроблено у Vue, що в React, що перенесено в `allsto`*.
> Специфікації задач по ходу роботи не змінюються — усі рішення пишуться в STATUS.md.

---

## Головний принцип: одна реалізація, а не сорок

`admin` — **еталон**. `allsto` підганяється під нього, крім сторінок, де це
неможливо. Зміни завжди йдуть у порядку: **`admin` → тест → перенос у `allsto`**.

З цього випливає правило, яке важливіше за будь-яку окрему задачу:

> **Фіча реалізується у `list-framework`, а не на сторінках.**
> Vue — `frontend/src/list-framework/`, React — `frontend-react/src/list-framework/`.
> Сторінка не має права мати власну версію фічі.

Причина проста: фіча, розкатана копіпастом по сторінках, розходиться. У `allsto`
це вже сталося — там 26 списковых сторінок, і навіть уже реалізовані фічі
(URL-фільтри, CSV, кеш, bulk) стоять на 5-7 сторінках із 26, кожна трохи
по-своєму. Саме тому в `admin` зʼявився `list-framework`, і саме тому пакет
цілиться в нього.

### Порядок робіт

```
    ┌─ задача 00 ─────────────────────┐   ┌─ задачі 01-20 ────────────────┐
    │ міграція сторінок на фреймворк  │   │ фічі у фреймворку             │
    │ (свій темп, не блокує 01-20)    │   │ (одна реалізація на фреймворк)│
    └────────────┬────────────────────┘   └───────────────┬───────────────┘
                 │                                        │
                 └──────────────► сторінка, що переїхала, ◄┘
                                  отримує всі фічі одразу
```

**Задача 00 не блокує 01-20 і навпаки.** Селектор колонок, зроблений у
`DataListPage.vue`, автоматично зʼявиться на кожній сторінці, яку потім переведуть
на фреймворк. Тому починати можна з будь-якого боку.

---

## Архітектура: два фронтенди + один бекенд

| | Vue 3 | React 18 + TS |
|---|---|---|
| Каталог | `frontend/` | `frontend-react/` |
| Порт (dev) | 5173 | 5174 |
| Ядро списку | `list-framework/DataListPage.vue` (703 р.) | `list-framework/components/DataTable.tsx` (443 р.) + `hooks/useTableState.ts` (443 р.) |
| Комірки | `list-framework/cells/*.vue` + `cellTypes.js` | `list-framework/cells/*.tsx` + `cellTypes.ts` |
| Фільтри | `list-framework/filters/*.vue` + `filterTypes.js` | `list-framework/filters/*.tsx` |
| Спільна логіка | `composables/` | `hooks/` |

Бекенд один: `backend/` — Yii3, `src/Admin/Controller/` (11 контролерів).
Обидва фронтенди їдять один і той самий REST API.

⚠️ **Бекенд `admin` ≠ бекенд `allsto`.** Тут немає `Module/<Name>/{Api,Application,
Domain,Infrastructure}`, немає `FieldConfigReader`, немає `*.config.json`-синку
(`sync-configs.js`), немає per-field permissions у конфігах і немає жодного
bulk-ендпоінта. Задачі, що в `allsto` спираються на ці речі, у `admin` мусять
робитись інакше — це зазначено в кожній такій задачі окремо.

### Реєстри розширення (використовувати, а не обходити)

Обидва фреймворки мають однакові точки розширення — нову фічу вішати на них:

- **`registerCellType(type, component)`** — `cellTypes.js` / `cellTypes.ts`.
  Наявні типи: `text`, `select`, `boolean`, `number`, `phone-list`.
- **`resolveFilterType(type)`** — `filterTypes.js`; React — інлайн у
  `DataTable.renderFilter`. Наявні: `search`/`text`, `select`, `checkbox`.
- **`customCellTypes` / `customFilterTypes`** — пропи `DataListPage`, для типів,
  специфічних для однієї сторінки (щоб не тягнути їх у спільний реєстр).

---

## Інвентаризація списковых сторінок

### Vue (`frontend/`) — 1 сторінка на фреймворку, 40 рукописних

| На фреймворку | Файл |
|---|---|
| `/data-registry` | `pages/StoRegistry.vue` (578 р., 0 хардкодних `<th>`) — конфіг у `sto-registry.config.json` + `.columns.json` + `.filter.json` |

Рукописні спискові (кандидати задачі **00**): `StoList.vue` (3548 р.),
`Users.vue`, `News.vue`, `Reviews.vue`, `Feedback.vue`, `ErrorLogs.vue`,
`Analytics.vue`, `AdminManagement.vue`, `PermissionList.vue`,
`RoleManagement.vue`, `StoApplications.vue`, `StoManagers.vue`,
`StoOutreach.vue`, `catalog/CarBrands.vue`, `catalog/CarModels.vue`,
`catalog/Services.vue`, `catalog/ServiceGroups.vue`, `catalog/VehicleTypes.vue`,
`geography/Cities.vue`, `geography/Countries.vue`, `geography/CityTypes.vue`,
`geography/AreaRegionList.vue` (⇒ `Areas.vue` + `Districts.vue`),
`geography/CityTmpReview.vue`, `geography/Timezones.vue`.

⚠️ Ці сторінки — копії з `allsto`, разом із їхніми `*.config.json`
(`users.config.json`, `geography/cities.config.json` тощо). Але **бекенд `admin`
ці конфіги не читає** — `sync-configs.js` тут немає. Тобто в `admin` вони суто
фронтендні, і це ще один аргумент за міграцію на `list-framework`, у якого
конфіг колонок — окремий явний JSON.

### React (`frontend-react/`) — 3 на фреймворку, 2 рукописні

| На фреймворку | Файл |
|---|---|
| `/data-registry` | `pages/DataRegistry.tsx` (129 р.) |
| `/error-logs` | `pages/ErrorLogs.tsx` |
| `/analytics` | `pages/Analytics.tsx` |

Рукописні: `PermissionList.tsx`, `RoleManagement.tsx`.
Решта маршрутів → `NotImplemented.tsx`.

**Фреймворк у React внедрений ширше, ніж у Vue** — при тому що Vue вважається
еталоном. Це не помилка аналізу, а поточний стан: React писався вже після появи
фреймворку, Vue тягне легасі.

---

## Що вже є (не переробляти)

Стан **фреймворку** в обох мовах. «✅✅» = є і у Vue, і в React.

| react-admin | Реалізація у фреймворку | Vue | React |
|---|---|:---:|:---:|
| `<List>` / `<Datagrid>` | `DataListPage.vue` / `DataTable.tsx` | ✅ | ✅ |
| `<Pagination>` | `components/Pagination` (перша/остання/еліпсиси) | ✅ | ✅ |
| сортування по колонці | `toggleSort` + `SortIcon`, **мульти-сорт** Ctrl+click | ✅ | ✅ |
| фільтри в URL | `useUrlFilters` | ✅ | ✅ |
| Saved Queries | `useSavedFilters` (localStorage) | ✅ | ✅ |
| `<ExportButton>` | `utils/csv` + `exportCsv`, пагінована вигрузка, ліміт 20k, UTF-8 BOM, підписи замість кодів для `select` | ✅ | ✅ |
| `<BulkUpdateButton>` | `bulkField` + `bulkValue` + `applyBulkUpdate` | ✅ | ✅ |
| bulk delete | `applyBulkDelete` + `deleteManyWithUndo` | ✅ | ✅ |
| `mutationMode="undoable"` | `useUndoableDelete` (delete і deleteMany) | ✅ | ✅ |
| `<EditableDatagrid>` | реєстр `cellTypes`: `text`/`select`/`boolean`/`number`/`phone-list`, один компонент на readonly+editable | ✅ | ✅ |
| SWR-кеш списків | `useListCache` | ✅ | ✅ |
| нотифікації | `useNotify` + `ToastContainer` | ✅ | ✅ |
| ra-rbac `canAccess` | `config/permissions.js` + `auth.can()`, права на **дії рядка** | ✅ | ✅ |
| `<ReferenceInput>` (довідник) | `useRemoteOptions` зі спільним кешем по URL | ⚠️ | ⚠️ |
| `<TabbedForm>` + warn unsaved | `ModalTabs.vue` / `BaseModal`, `useUnsavedChanges` | ✅ | ⚠️ |

**Дві задачі з 20 у `admin` вже закриті фреймворком** — це головна відмінність
від `allsto`:

- **05 (bulk-оновлення поля)** — `DataListPage.vue:81-102` + `applyBulkUpdate`;
  React — `DataTable.tsx:281-312` + `useTableState.ts:290`. Залишковий обсяг —
  тільки серверна частина (див. адаптацію в самій задачі).
- **20 (inline-редагування всіх типів)** — реєстр `cellTypes` з пʼятьма типами в
  обох мовах.

---

## Задачі цього пакету

**21 задача.** Порядок і граф залежностей — у [STATUS.md](STATUS.md).

### 00 — основа однотипності

| # | Файл | Суть |
|---|---|---|
| 00 | [00-unify-on-list-framework.md](00-unify-on-list-framework.md) | Перевести всі спискові сторінки на `list-framework`. Не блокує 01-20; без неї фічі 01-20 живуть лише на сторінках фреймворку |

### Ядро (01-10)

| # | Файл | react-admin аналог | Обсяг у `admin` |
|---|---|---|---|
| 01 | [01-column-selector.md](01-column-selector.md) | `<SelectColumnsButton>` + `<DatagridConfigurable>` | S — 2 файли фреймворку |
| 02 | [02-empty-state.md](02-empty-state.md) | `<Empty>` | S |
| 03 | [03-prev-next-record.md](03-prev-next-record.md) | `<PrevNextButtons>` | M |
| 04 | [04-clone-record.md](04-clone-record.md) | `<CloneButton>` | S |
| 05 | [05-bulk-field-update.md](05-bulk-field-update.md) | `<BulkUpdateButton>` | ✅ клієнт готовий; лишається бекенд |
| 06 | [06-row-expand.md](06-row-expand.md) | `<Datagrid expand>` | M |
| 07 | [07-loading-skeletons.md](07-loading-skeletons.md) | skeleton у `<List>` (v5) | S |
| 08 | [08-select-all-across-pages.md](08-select-all-across-pages.md) | `<SelectAllButton>` | M (фронт+бек) |
| 09 | [09-async-reference-autocomplete.md](09-async-reference-autocomplete.md) | `<ReferenceInput>` + `<AutocompleteInput>` | M (фронт+бек) — закриває реальний баг, див. нижче |
| 10 | [10-undoable-save.md](10-undoable-save.md) | `mutationMode="undoable"` для update | M |

### Розширення (11-16)

| # | Файл | react-admin аналог | Обсяг у `admin` |
|---|---|---|---|
| 11 | [11-filter-sidebar.md](11-filter-sidebar.md) | `<FilterList>` (faceted-фільтри) | L (фронт+бек) |
| 12 | [12-realtime-updates.md](12-realtime-updates.md) | `ra-realtime` | M (Tier 1) / XL (Tier 2) |
| 13 | [13-dark-theme.md](13-dark-theme.md) | `<ToggleThemeButton>` | M |
| 14 | [14-breadcrumbs.md](14-breadcrumbs.md) | `ra-navigation` `<Breadcrumb>` | S |
| 15 | [15-admin-i18n.md](15-admin-i18n.md) | `ra-language-*` / `useTranslate` | L — у `admin` i18n **немає взагалі** |
| 16 | [16-global-search.md](16-global-search.md) | `<Search>` (enterprise) | L (фронт+бек) |

### Спірні (17-20) — з явним вердиктом у файлі

| # | Файл | Вердикт для `admin` |
|---|---|---|
| 17 | [17-infinite-scroll.md](17-infinite-scroll.md) | 🔴 скасувати — ламає `page` в URL, кеш, позицію запису (03) |
| 18 | [18-xlsx-export.md](18-xlsx-export.md) | 🔴 скасувати — CSV із UTF-8 BOM + підписами `select` уже закриває задачу |
| 19 | [19-wizard-form.md](19-wizard-form.md) | 🔴 скасувати — немає обʼєкта |
| 20 | [20-inline-edit-field-types.md](20-inline-edit-field-types.md) | ✅ **уже зроблено** реєстром `cellTypes` в обох мовах |

Перед запуском кожної задачі прогнати скіл `validate-task-md` — спеціалізованих
скілів для цих задач немає.

---

## Побічні знахідки в `admin`

Не окремі задачі — реальні дефекти, вбудовані в чеклісти відповідних задач.

| Дефект | Де | Закривається |
|---|---|---|
| **`useRemoteOptions` запитує довідник без `per_page`** → отримує дефолт бекенда (50 рядків) і молча обрізає список опцій `select`-колонки. У `allsto` цей же клас багу хоч мав явний (хай і завеликий) `per_page`; тут його немає взагалі | `frontend/src/list-framework/composables/useRemoteOptions.js`, `frontend-react/src/list-framework/hooks/useRemoteOptions.ts` | **09** |
| `applyBulkUpdate` шле по одному PATCH на кожен id послідовно; на 250 вибраних це 250 запросів і жодної транзакційності — частковий успіх лишає дані в напівстані | `DataListPage.vue:608`, `useTableState.ts:290` | **05** (серверна частина) |
| `REACT_VERSION.md` описує bulk actions / CSV / inline editing / saved filters як 🚧, хоча вони реалізовані | `REACT_VERSION.md:132-166` | **00** (оновити разом з інвентарем) |
| Легасі-сторінки Vue тягнуть `*.config.json`, які бекенд `admin` не читає — виглядає як конфіг, поводиться як мертвий код | `frontend/src/pages/**/*.config.json` | **00** |

---

## Спільні правила для всіх задач пакету

1. **Фіча — у `list-framework`, і в обох мовах.** Задача не вважається зробленою,
   поки не зроблена і в Vue, і в React. STATUS.md тримає два окремі статуси саме
   для цього.
2. **Vue і React мусять лишатися дзеркальними.** Однакові назви (`useColumnPrefs`
   ⇄ `useColumnPrefs`), однакові ключі localStorage, однакова розмітка Bootstrap.
   Розходження в назвах = наступна фіча робиться двічі по-різному.
3. **Розширювати через реєстри** (`registerCellType`, `filterTypes`,
   `customCellTypes`), а не через `if (col.key === '...')` у ядрі.
4. **Тости, не `alert()`/`confirm()`.** `useNotify` підтримує
   `action: { label, onClick }`.
5. **Права — через `auth.can()`.** Нова UI-фіча не має відкривати дію, до якої в
   адміна немає права.
6. **Не ламати `useUrlFilters`.** Новий стан, що має жити в URL, додається як
   звичайний «фільтр» (як це вже зроблено з `per_page`).
7. **Локалізація рядків — українська**, як у решті адмінки. Задачі 01-14, 16
   пишуть українські рядки; задача **15** (i18n) виносить їх у locale-файли й тому
   робиться **останньою**.
8. **Мова коментарів у коді** — українська, як у наявних composables і hooks.
9. **Перенос у `allsto` — окремий крок, після тесту в `admin`.** У STATUS.md для
   цього окрема колонка. Не переносити задачу, доки вона не закрита в обох мовах
   `admin`.

---

## Свідомо поза пакетом

- **Блокування записів / «хтось зараз редагує»** (ra-realtime `useLock`) — у
  `admin` немає навіть optimistic locking (`version`), з якого це починається.
- **Переклад серверних повідомлень** — межа задачі **15** проведена по фронтенду.
- **Мультивибір в автокомпліті** (`<AutocompleteArrayInput>`).
- **Редагування всього рядка** (`<RowForm>`) — конфліктує з прихованими
  колонками (**01**).
- **Віртуальний скрол таблиці** — про продуктивність DOM, а не про навігацію;
  заводити лише якщо реально гальмує (спочатку поміряти).
- **PDF-експорт / друк** — задача про `@media print`, не про експорт даних.
- **Міграція `PermissionList` і `RoleManagement`** на фреймворк — вони не
  спискові в звичайному сенсі (матриця прав, а не перелік записів); рішення
  зафіксоване в задачі **00**.
