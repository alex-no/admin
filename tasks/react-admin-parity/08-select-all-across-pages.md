# Задача 08: виділення всіх записів за фільтром (react-admin `<SelectAllButton>`)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `useRowSelection.js` / `useRowSelection.ts` (виділити з наявного стану
> ядра) + бекенд.
>
> **Половина задачі вже зроблена, і правильно:** виділення у фреймворку
> скидається при кожному `load()` — `selected.value = []` у `DataListPage.vue:460`,
> а в React `setSelected([])` в `applyBulkUpdate`/`applyBulkDelete` і скид через
> зміну фільтрів. Тобто баг «старе виділення тече в наступну масову дію», який у
> `allsto` тягнеться по 14 сторінках, у `admin` **відсутній**. Не «виправляти» те,
> що працює — задача тут тільки про виділення **поза** сторінкою.
>
> ⚠️ **Жорстка залежність від задачі 05.** «Виділити всі за фільтром» без
> серверного bulk-ендпоінта означало б надіслати 5000 послідовних `PATCH` з
> браузера. Тому 08 **не починати**, доки 05 (серверна частина) не закрита.
>
> **Бекенд:** `all: true` у тілі `POST /{resource}/bulk` + виділення
> `buildListWhere()` з `AdminStoController::list` (там зараз фільтри складаються
> інлайн у `list()`) + `BULK_ALL_LIMIT = 5000`. `all: true` для delete —
> заборонити.
>
> **Не застосовується:** «14 сторінок із `BulkActions`», `BulkActions.vue`
> (у фреймворку панель масових дій вбудована в ядро), `mandatory resetOn`
> (скид уже є).
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Чекбокс у заголовку таблиці зараз виділяє **лише поточну сторінку** — див.
`toggleSelectAll()` у `pages/geography/Cities.vue:367-375`:

```js
function toggleSelectAll() {
  if (allOnPageSelected.value) {
    items.value.forEach((row) => selectedIds.value.delete(row.id))
  } else {
    items.value.forEach((row) => selectedIds.value.add(row.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}
```

Це не помилка реалізації — саме так це й задумано. Проблема в іншому: адмін, що
відфільтрував 340 неактивних міст і хоче їх усі активувати, зараз мусить
пройти 7 сторінок по 50, на кожній тиснути чекбокс і «Активувати». І він
**не бачить**, що виділив 50 з 340, — підпис каже просто «Обрано: 50»
(`BulkActions.vue:3`).

Гірше: `selectedIds` **не** скидається при зміні фільтра на частині сторінок,
тобто виділення з попереднього фільтра може «протекти» в наступну масову дію.

react-admin вирішує це `<SelectAllButton>`: «виділено 50 на цій сторінці —
[виділити всі 340]», і далі масова дія працює по фільтру, а не по списку id.

## Промпт для Claude Code

> Додай виділення всіх записів за поточним фільтром — аналог `<SelectAllButton>`
> з react-admin.
>
> ### Frontend
>
> 1. **Новий composable `www_front/admin/src/composables/useRowSelection.js`** —
>    винести туди логіку виділення, яка зараз скопійована по 14 сторінках
>    (`selectedIds`, `allOnPageSelected`, `toggleSelectAll`, `toggleSelectRow`).
>    Додати два нових стани:
>    - `selectAllMatching: Boolean` — «виділені всі, що підходять під фільтр»
>    - `selectedCount` — `selectAllMatching ? total : selectedIds.size`
>
>    Composable мусить **сам** скидати виділення при зміні фільтрів/сортування —
>    зараз це робиться руками й нерівномірно.
>
> 2. **`BulkActions.vue`: показувати обидва числа.** Коли виділена вся сторінка,
>    але `total > items.length` — під підписом «Обрано: 50» показати посилання
>    «Виділити всі 340». Коли `selectAllMatching` активний — «Обрано всі 340 за
>    фільтром» + «Зняти виділення».
>
> 3. **Масова дія в режимі `selectAllMatching` надсилає фільтр, а не `ids`.**
>
> ### Backend
>
> 4. **`bulkAction()` мусить приймати `all: true` + ті самі query-фільтри, що
>    `list()`**, замість `ids`:
>    ```json
>    { "action": "activate", "all": true, "filters": { "status": "inactive", "country_id": 1, "search": "" } }
>    ```
>    Побудову `WHERE` **переиспользувати з `list()`** — витягти її в приватний
>    метод (напр. `buildListWhere(array $params): array{0: string, 1: array}`), а
>    не дублювати умови. Інакше `bulk` і `list` розійдуться, і адмін застосує
>    дію не до тих записів, які бачив.
>
> 5. **Захисний ліміт.** Порахувати `COUNT(*)` за фільтром перед виконанням і
>    якщо він більше жорсткого максимуму (візьми 5000) — відмовити з 422 і
>    людським текстом «Занадто багато записів (N) — звузьте фільтр». Причина:
>    `all: true` без фільтру = «зроби це з усією таблицею» одним запитом.
>
> 6. **`all: true` заборонити для `action: "delete"`.** Масове видалення всього,
>    що підходить під фільтр, без явного списку id — надто легко зробити
>    випадково і неможливо відкотити. Для `delete` залишити тільки `ids`.
>    Повертати 400 з поясненням.
>
> 7. **Відповідь мусить містити `affected`**, як зараз.
>
> 8. **Audit log** — по рядку на кожен зачеплений id, як і для варіанту з `ids`
>    (див. задачу **05** і `tasks/audit-log-sto.md`).
>
> 9. **Розкатай на 14 сторінок, де вже є `BulkActions`** (перелік у задачі **05**,
>    п.10).
>
> **Не робити:** «виділити всі, крім цих» (inverse selection), збереження
> виділення між сторінками застосунку, `all: true` для delete.

## Що перевірити після виконання

### Frontend

- [ ] `useRowSelection.js` створений; логіка виділення прибрана зі всіх 14 сторінок і замінена на composable (дублювання `toggleSelectAll`/`toggleSelectRow` у сторінках більше немає)
- [ ] `Set` перестворюється при кожній зміні (`selectedIds.value = new Set(...)`) — реактивність не зламана
- [ ] Чекбокс у заголовку далі виділяє поточну сторінку (поведінка не змінилась)
- [ ] Коли виділена вся сторінка й `total > items.length`, з'являється «Виділити всі N»
- [ ] Клік по «Виділити всі N» перемикає в режим `selectAllMatching`; підпис стає «Обрано всі N за фільтром»
- [ ] **Виділення скидається при зміні фільтра, пошуку, сортування і `per_page`** — перевірити: виділити 50, змінити фільтр, переконатись що «Обрано» зникло, і що наступна масова дія не зачепила старе виділення
- [ ] Виділення **не** скидається при простому переході на іншу сторінку в режимі `selectAllMatching` (це і є суть режиму)
- [ ] У режимі `selectAllMatching` окремі чекбокси рядків задизейблені або зняття одного коректно виводить із режиму (обрати одне й реалізувати послідовно)
- [ ] Кнопка «Видалити» в режимі `selectAllMatching` **недоступна** (задизейблена з `title`-поясненням) — узгоджено з бекендом, що відмовляє
- [ ] Після успіху виділення знімається, список перезавантажується, тост показує реальний `affected` із відповіді, а не число з UI

### Backend

- [ ] `all: true` доданий у `bulkAction()` усіх 12 контролерів, що мають цей метод (перелік — у задачі **05**)
- [ ] **`WHERE` витягнутий у спільний метод і переиспользується `list()` і `bulkAction()`** — перевірити: додати фільтр `search=xyz`, порівняти `total` у `list()` і `affected` у `bulkAction({all:true})` на тому ж наборі фільтрів; числа мусять збігтися
- [ ] Складні фільтри працюють однаково: на `AdminCityController` фільтр `area_region_id` має нетривіальну умову з трьома підзапитами (`AdminCityController.php:52-61`) — переконатись, що bulk застосував **ту саму** умову, а не спрощену
- [ ] `all: true` **без жодного фільтра** з кількістю записів > 5000 → 422 з текстом, дія не виконана
- [ ] `all: true` + `action: "delete"` → 400, нічого не видалено
- [ ] `ids` + `action: "delete"` працює як раніше
- [ ] Права перевіряються так само, як для варіанту з `ids` (403 без права)
- [ ] `affected` у відповіді = реальний `rowCount()`
- [ ] Audit log: `all: true` на 3 записах дає 3 рядки в `audit_log`
- [ ] Немає SQL-інʼєкції через `filters` — усі значення йдуть bind-параметрами, як у `list()` (`$bind[':countryId']` тощо)

### Загальне

- [ ] Немає console errors
- [ ] Масові дії на сторінках, де `all: true` не використовується, працюють як до задачі

---

## Технічні деталі для імплементації

### 1. `useRowSelection.js`

```js
import { ref, computed, watch } from 'vue'

/**
 * Виділення рядків для масових дій (react-admin: bulk selection +
 * SelectAllButton). Два режими:
 *   - явний список id (виділення чекбоксами, працює тільки в межах сторінки);
 *   - selectAllMatching — «всі записи, що підходять під поточний фільтр»,
 *     тоді бекенд отримує фільтр, а не список id.
 *
 * @param {Object} opts
 * @param {import('vue').Ref<Array>}  opts.items   - рядки поточної сторінки
 * @param {import('vue').Ref<number>} opts.total   - всього за фільтром
 * @param {Array<import('vue').Ref>}  opts.resetOn - рефи, зміна яких скидає виділення
 *                                                   (фільтри, пошук, сортування, per_page)
 */
export function useRowSelection({ items, total, resetOn = [] }) {
  const selectedIds       = ref(new Set())
  const selectAllMatching = ref(false)

  const allOnPageSelected = computed(() =>
    items.value.length > 0 && items.value.every((row) => selectedIds.value.has(row.id))
  )
  const selectedCount = computed(() =>
    selectAllMatching.value ? total.value : selectedIds.value.size
  )
  // Пропонувати «виділити всі N» тільки якщо за фільтром є більше, ніж на сторінці
  const canSelectAllMatching = computed(() =>
    allOnPageSelected.value && !selectAllMatching.value && total.value > items.value.length
  )

  function clear() {
    selectedIds.value = new Set()
    selectAllMatching.value = false
  }

  // Зміна вибірки робить старе виділення безглуздим — і небезпечним, бо
  // наступна масова дія застосувалась би до id з попереднього фільтра.
  for (const r of resetOn) watch(r, clear)

  // ... toggleSelectAll / toggleSelectRow / selectAllMatchingOn
  return { selectedIds, selectAllMatching, selectedCount, allOnPageSelected,
           canSelectAllMatching, clear, /* ... */ }
}
```

⚠️ `resetOn` — критична частина, не опційна зручність. Зараз на частині сторінок
`selectedIds` скидається тільки в окремих місцях (напр. `Cities.vue:395`, `435`,
`560`), і «протікання» виділення між фільтрами — реальний існуючий баг.

### 2. Backend: витягування `WHERE` зі `list()`

Це головна технічна частина задачі. Приклад для `AdminCityController` — зараз
умови будуються прямо в `list()` (рядки 43-66) і повторно ніде не доступні:

```php
/**
 * Спільна побудова WHERE для list() і bulkAction(all: true).
 * Дублювати умови в bulk неможливо: у cities фільтр area_region_id — це три
 * підзапити, і будь-яке розходження означало б, що масова дія застосувалась
 * не до тих записів, які адмін бачив у списку.
 *
 * @return array{0: string, 1: array<string, mixed>} [whereClause, bind]
 */
private function buildListWhere(array $params): array
{
    $where = [];
    $bind  = [];

    $status = $params['status'] ?? 'all';
    if ($status === 'active')   { $where[] = 'c.is_active = 1'; }
    if ($status === 'inactive') { $where[] = 'c.is_active = 0'; }
    // ... решта умов дослівно як у list()

    return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $bind];
}
```

Далі `list()` викликає його замість інлайн-побудови, а `bulkAction()` — для
гілки `all: true`. **Обидва мусять викликати один метод** — якщо в `list()`
залишиться своя копія, задача не виконана.

⚠️ У `cities` умови написані з префіксом `c.` і покладаються на `LEFT JOIN`
country/city_type/area_region. Для `UPDATE`/`COUNT` у bulk ці джойни теж
потрібні (або переписати як `UPDATE ... WHERE id IN (SELECT ...)`). Другий
варіант надійніший — тоді `SELECT` дослівно повторює запит зі `list()`:

```php
$sql = "UPDATE city SET is_active = ?, updated_at = ?
        WHERE id IN (
            SELECT id FROM (
                SELECT c.id FROM city c
                LEFT JOIN country co ON co.id = c.country_id
                LEFT JOIN city_type ct ON ct.id = c.city_type_id
                LEFT JOIN area_region ar ON ar.id = c.area_region_id
                $whereClause
            ) AS _t
        )";
```

Вкладений `SELECT ... AS _t` обов'язковий — MySQL не дозволяє читати таблицю,
яку оновлює, у прямому підзапиті.

### 3. Backend: гілка `all` у `bulkAction`

```php
$all = (bool) ($data['all'] ?? false);

if ($all) {
    if ($action === 'delete') {
        return $this->json([
            'status'  => 'error',
            'message' => 'Масове видалення за фільтром недоступне — виділіть записи вручну',
        ], 400);
    }

    [$whereClause, $bind] = $this->buildListWhere((array) ($data['filters'] ?? []));

    $countStmt = $this->pdo->prepare("SELECT COUNT(*) FROM city c ... $whereClause");
    $countStmt->execute($bind);
    $matched = (int) $countStmt->fetchColumn();

    if ($matched > self::BULK_ALL_LIMIT) {   // 5000
        return $this->json([
            'status'  => 'error',
            'message' => "Занадто багато записів ($matched) — звузьте фільтр",
        ], 422);
    }
    // ... UPDATE за фільтром
}
```

`BULK_ALL_LIMIT = 5000` — константа контролера. Ліміт тут не про продуктивність,
а про «адмін випадково натиснув, коли фільтр був порожній».

### 4. Frontend: надсилання фільтрів

Фільтри для `all: true` мусять бути **тими самими**, що пішли в `list()`. На
кожній сторінці вже є функція, що їх будує — `buildListParams(p, perPageOverride)`
(`Users.vue:871-880`). Переиспользувати її, прибравши пагінацію:

```js
function buildBulkFilters() {
  const params = buildListParams(1)
  params.delete('page')
  params.delete('per_page')
  params.delete('sort_by')
  params.delete('sort_dir')
  return Object.fromEntries(params)
}
```

⚠️ Не збирати другий, «свій» набір фільтрів руками — це та сама помилка, що
дублювання `WHERE` на бекенді, тільки на фронті.

### 5. `BulkActions.vue`

Поточний перший рядок компонента (`BulkActions.vue:3`):

```html
<span class="fw-semibold small">Обрано: {{ count }}</span>
```

Стає:

```html
<span class="fw-semibold small">
  <template v-if="selectAllMatching">Обрано всі {{ count }} за фільтром</template>
  <template v-else>Обрано: {{ count }}</template>
</span>
<button v-if="canSelectAllMatching" class="btn btn-sm btn-link p-0 small"
        @click="$emit('select-all-matching')">
  Виділити всі {{ total }}
</button>
```

І кнопка «Видалити» отримує:

```html
:disabled="busy || selectAllMatching"
:title="selectAllMatching ? 'Масове видалення за фільтром недоступне — виділіть записи вручну' : ''"
```

### 6. Взаємодія з задачею 05

Задачі **05** (bulk-update поля) і **08** (виділення за фільтром) перетинаються
в `bulkAction()`. Порядок:

- якщо **05** уже зроблена — `action: "update"` теж мусить приймати `all: true`
  (з тим самим лімітом), бо «змінити групу для всіх 340 відфільтрованих послуг»
  це головний сценарій обох задач разом;
- якщо **08** робиться першою — `all: true` реалізувати для
  `activate`/`deactivate`, а гілку `update` додати в 05 з підтримкою `all`
  одразу.

### 7. Scope & Non-Goals

**В scope:** `useRowSelection.js` + прибирання дублювання з 14 сторінок,
`all: true` у 12 контролерах, витягування `WHERE` у спільний метод, ліміт 5000,
заборона `all` для delete, скид виділення при зміні вибірки.

**Поза scope:**
- inverse selection («всі, крім цих трьох»)
- збереження виділення між сторінками застосунку / у URL
- `all: true` для `delete`
- фонове виконання масових дій з прогресом (черга/воркер)
- зміна лімітів пагінації

---

## FAQ

**Q: Чому не просто надіслати 340 id, зібравши їх пачками запитів?**
A Два аргументи. По-перше, це 7 запитів на побудову списку id перед головним
запитом, і між ними дані можуть змінитись. По-друге, ліміт довжини тіла й
`IN (...)` на десятки тисяч елементів. Фільтр — і коротше, і атомарніше.

**Q: Чому ліміт 5000, а не «без ліміту»?**
A Бо `all: true` із порожнім фільтром = «застосувати до всієї таблиці». Ліміт
перетворює катастрофу на повідомлення «звузьте фільтр». 5000 обрано як число,
що явно більше за будь-який осмислений робочий батч, але явно менше за розмір
великих таблиць проєкту.

**Q: Що якщо між `COUNT(*)` і `UPDATE` кількість змінилась?**
A `affected` у відповіді буде іншим за `matched` — і саме `affected` показуємо в
тості. Транзакція тут не потрібна: обидва запити читають той самий фільтр, а
розходження в кілька записів для масової дії не критичне.

**Q: Чому виділення скидається при зміні `per_page`?**
A Бо `allOnPageSelected` рахується від `items.length`. Змінив `per_page` з 50 на
100 — «вся сторінка виділена» стає невірним, а адмін цього не бачить. Простіше й
безпечніше скинути.

**Q: `selectAllMatching` треба класти в URL?**
A Ні. Це ефемерний стан перед масовою дією, а не параметр вибірки. Фільтр, від
якого він залежить, у URL уже є.
